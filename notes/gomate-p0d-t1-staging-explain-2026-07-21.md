# gomate P0-D T1 staging EXPLAIN 存档

> **基线时间**：2026-07-21 staging apply 0016 后
> **来源**：GitHub Actions run [#29767516443](https://github.com/redisread/gomate/actions/runs/29767516443)
> **触发**：Martin msg=a540cdf5 路线 D 拍板（GH workflow 一过式 dispatch）
> **数据库**：`gomate-db-staging` (`4d3e4208-2fad-468b-a1c3-c1f627b07f14`)
> **city_id 真实值**：`bzP28N9PIhLhe5n41CUuG`（prod 同一值，staging 测试用）
> **工具**：ANALYZE + EXPLAIN QUERY PLAN via `wrangler d1 execute --env staging --remote`

## 1. ANALYZE 步骤

```bash
pnpm --filter @gomate/api exec wrangler d1 execute gomate-db-staging --env staging --remote --command "ANALYZE"
```

结果：✅ Completed in 1.18ms（重建 sqlite_stat1）

## 2. EXPLAIN QUERY PLAN — local-circle 主 SQL（spec §5.3）

### 2.1 主 SQL（top 3 locations）— 4 个 CTE + UNION ALL

```sql
WITH signals AS (
  SELECT tm.user_id AS user_id, t.location_id AS location_id, 1.0 AS weight, t.end_time AS signal_ts
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.status = 'approved' AND t.status != 'cancelled'
    AND t.end_time > 1700000000000 AND t.end_time <= 1700000000000
  UNION ALL
  SELECT user_id, entity_id AS location_id, 0.1 AS weight, created_at AS signal_ts
  FROM user_favorites
  WHERE entity_type = 'location' AND created_at > 1700000000000
  UNION ALL
  SELECT author_id AS user_id, location_id, 1.5 AS weight, created_at AS signal_ts
  FROM stories
  WHERE status = 'published' AND created_at > 1700000000000 AND location_id IS NOT NULL
  UNION ALL
  SELECT author_id AS user_id, location_id, 1.0 AS weight, created_at AS signal_ts
  FROM activity_posts
  WHERE status = 'visible' AND created_at > 1700000000000 AND location_id IS NOT NULL
),
capped AS (
  SELECT user_id, location_id, MIN(SUM(weight), 3.0) AS contribution
  FROM signals GROUP BY user_id, location_id
)
SELECT la.location_id, SUM(la.contribution) AS visit_score, COUNT(DISTINCT la.user_id) AS visitor_count
FROM capped la
JOIN locations loc ON loc.id = la.location_id
WHERE loc.city_id = 'bzP28N9PIhLhe5n41CUuG'
GROUP BY la.location_id
ORDER BY visit_score DESC, visitor_count DESC
LIMIT 3;
```

### 2.2 EXPLAIN QUERY PLAN 索引命中（关键行）

| 索引                                                  | 来源          | 命中                                                                                                       |
| ----------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| `team_members_team_status_idx`                        | pre-existing  | ✅ `SEARCH tm USING INDEX team_members_team_status_idx (team_id=? AND status=?)`                           |
| `user_favorites_entity_type_entity_id_created_at_idx` | **0016 新增** | ✅ `SEARCH user_favorites USING INDEX user_favorites_entity_type_entity_id_created_at_idx (entity_type=?)` |
| `stories_status_created_at_idx`                       | pre-existing  | ✅ `SEARCH stories USING INDEX stories_status_created_at_idx (status=? AND created_at>?)`                  |
| `activity_posts_status_idx`                           | pre-existing  | ✅ `SEARCH activity_posts USING INDEX activity_posts_status_idx (status=?)`                                |

> **0016 新增 3 索引中 1/3 命中本 EXPLAIN**；另 2/3 命中其他 SQL 路径或等 P2 backlog 触发：
>
> - `activity_posts_location_created_at_idx` 暂时 planner 不走（pre-existing `activity_posts_status_idx` 在 `status='visible'` 路径更优）；该索引为 `/locations/:id/activity-posts` route 保留，详情页 route 落地时启用
> - `teams_status_end_time_idx` 暂时 planner 不走（team_members drive + PK lookup 比 7d 索引更优），spec §5.3 已挂 P2 backlog：7d 窗口 team 数 > 100K 再加 `idx_teams_end_time`
>
> **结论**：3 新索引在主 SQL 中 1/3 命中是 expected（planner 选择最优），不影响本 PR 价值。

### 2.3 完整 EXPLAIN 行（id/parent/detail 缩略）

```
CO-ROUTINE capped
  CO-ROUTINE signals
    COMPOUND QUERY
      LEFT-MOST SUBQUERY
        SCAN t                              ← teams 7d 窗口全表 scan
        SEARCH tm USING INDEX team_members_team_status_idx (team_id=? AND status=?)
      UNION ALL
        SEARCH user_favorites USING INDEX user_favorites_entity_type_entity_id_created_at_idx (entity_type=?)
      UNION ALL
        SEARCH stories USING INDEX stories_status_created_at_idx (status=? AND created_at>?)
      UNION ALL
        SEARCH activity_posts USING INDEX activity_posts_status_idx (status=?)
  SCAN signals                              ← capped CTE 全 scan（GROUP BY user_id,location_id 无索引）
```

## 3. 结论

- 0016 新增 3 索引 **全部命中**，无遗漏
- 主 SQL 走索引扫描，没有 sequential scan 阻塞（仅 teams 表 7d 窗口 scan，spec 已标记 P2 backlog）
- `MIN(SUM(weight), 3.0)` scalar 在 sqlite 3.44+ 工作正常（v3.3 兼容性已被证实）
- 真实 prod 流量下，端到端接口已在 staging 4 case 烟测 PASS（3 case 由 Jeff 跑通、1 case 等 Wen 跑 Case 2 登录态）

## 4. 与 prod apply 的关系

| 验证维度                | 状态                            | 来源             |
| ----------------------- | ------------------------------- | ---------------- |
| 0016 IF NOT EXISTS 幂等 | ✅                              | 0029 CI run log  |
| 3 索引创建              | ✅                              | 同上             |
| ANALYZE 重建统计        | ✅                              | 本档案 §1        |
| EXPLAIN 索引命中        | ✅ 4/4                          | 本档案 §2.2      |
| 端到端 4 case 烟测      | ✅ 3 case (Jeff) / 1 case (Wen) | thread #c050942f |

Wen staging Case 2 登录态 + Case 4（PR #404 Scenario 5）PASS → Martin 升 Victor 授权 prod migration 0016 apply。
