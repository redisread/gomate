# gomate P0-D T1 prod EXPLAIN 存档

> **基线时间**：2026-07-21 prod apply 0016 后（Victor 授权 msg=9aeb83f5 / 4ec1540b）
> **数据库**：`gomate-db` (`7d17d076-202f-48f8-b343-24209cdb0ba1`)
> **city_id 真实值**：`yYEu8E2geJP-VjMOc4FAf`（prod 深圳，与 staging `bzP28N9PIhLhe5n41CUuG` 不同——staging 是从头 seed 的独立数据集）
> **工具**：ANALYZE + EXPLAIN QUERY PLAN via `wrangler d1 execute --env production --remote`
> **鉴权**：本地 wrangler OAuth session（`wujiahong2013@gmail.com`, account `e3afbb61...`）with `d1 (write)` scope；`CLOUDFLARE_API_TOKEN` env var 需 `unset` 以走 OAuth（`cfat_PK...` token 无 D1 权限）

## 0. Migration 0016 状态

`d1_migrations` 表查询显示 `0016_p0d_t1_local_circle_indexes.sql` **已在 prod 应用**（应用路径推测：earlier deploy hook 或 Victor 手工 apply）。

3 新索引已存在：

- ✅ `teams_status_end_time_idx`
- ✅ `activity_posts_location_created_at_idx`
- ✅ `user_favorites_entity_type_entity_id_created_at_idx`

`wrangler d1 migrations apply gomate-db --env production --remote` → **No migrations to apply**（幂等 no-op）。

## 1. ANALYZE 步骤

```bash
wrangler d1 execute gomate-db --env production --remote --command "ANALYZE"
```

结果：✅ 9.389ms（2856 rows read, 74 rows written to sqlite_stat1；staging 是 1.18ms，prod 大约 8x — 表数据略多 sqlite_stat1 sample 密度）

## 2. EXPLAIN QUERY PLAN — local-circle 主 SQL

### 2.1 主 SQL（top 3 locations）

```sql
WITH signals AS (
  SELECT tm.user_id, t.location_id, 1.0 AS weight, t.end_time AS signal_ts
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.status = 'approved' AND t.status != 'cancelled'
    AND t.end_time > <windowStart> AND t.end_time <= <now>
  UNION ALL
  SELECT user_id, entity_id, 0.1, created_at FROM user_favorites
  WHERE entity_type = 'location' AND created_at > <windowStart>
  UNION ALL
  SELECT author_id, location_id, 1.5, created_at FROM stories
  WHERE status = 'published' AND created_at > <windowStart> AND location_id IS NOT NULL
  UNION ALL
  SELECT author_id, location_id, 1.0, created_at FROM activity_posts
  WHERE status = 'visible' AND created_at > <windowStart> AND location_id IS NOT NULL
),
capped AS (
  SELECT user_id, location_id, MIN(SUM(weight), 3.0) AS contribution
  FROM signals GROUP BY user_id, location_id
)
SELECT la.location_id, SUM(la.contribution) AS visit_score, COUNT(DISTINCT la.user_id) AS visitor_count
FROM capped la
JOIN locations loc ON loc.id = la.location_id
WHERE loc.city_id = 'yYEu8E2geJP-VjMOc4FAf'
GROUP BY la.location_id
ORDER BY visit_score DESC, visitor_count DESC
LIMIT 3;
```

### 2.2 EXPLAIN 完整行（id/parent/detail 缩略）

```
CO-ROUTINE capped
  CO-ROUTINE signals
    COMPOUND QUERY
      LEFT-MOST SUBQUERY
        SCAN tm                                            ← team_members 全表 scan（prod 17 行，SCAN 更便宜）
        SEARCH t USING INDEX sqlite_autoindex_teams_1 (id=?)
      UNION ALL
        SCAN user_favorites                                ← 全表 scan（prod 5 行，SCAN 最便宜）
      UNION ALL
        SEARCH stories USING INDEX stories_status_created_at_idx (status=? AND created_at>?)
      UNION ALL
        SEARCH activity_posts USING INDEX activity_posts_status_idx (status=?)
  SCAN signals
  USE TEMP B-TREE FOR GROUP BY
  SEARCH loc USING INDEX locations_city_idx (city_id=?)
  SEARCH la USING AUTOMATIC COVERING INDEX (location_id=?)
  USE TEMP B-TREE FOR GROUP BY
  USE TEMP B-TREE FOR count(DISTINCT)
  USE TEMP B-TREE FOR ORDER BY
```

### 2.3 与 staging 差异分析（关键）

| 表             | 数据量 (prod) | staging 命中                                                             | prod 命中     | 解释                                              |
| -------------- | ------------- | ------------------------------------------------------------------------ | ------------- | ------------------------------------------------- |
| team_members   | 17            | `SEARCH tm USING INDEX team_members_team_status_idx`                     | **SCAN tm**   | prod 表极小，planner 选 seq scan（比 index 便宜） |
| user_favorites | 5             | `SEARCH USING INDEX user_favorites_entity_type_entity_id_created_at_idx` | **SCAN**      | 同上                                              |
| stories        | 29            | `SEARCH USING INDEX stories_status_created_at_idx`                       | ✅ 同 staging | 29 行已够触发 index cost model                    |
| activity_posts | 0             | `SEARCH USING INDEX activity_posts_status_idx`                           | ✅ 同 staging | 0 行 lookup 秒回                                  |

**结论**：prod 走 SCAN 是 **planner 正确决策**（表数据 < 100 行时 seq scan 通常最优）。数据量增长后，planner 会自动切回 index lookup（未来 P1/P2 无需干预）。3 新索引均已存在，仅当前不被主 SQL 走通。

其他 prod 表：teams=15 rows / locations=35 rows / activity_posts=0

## 3. 端到端 curl 烟测

| Case           | URL                             | 结果                                                                                             |
| -------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| P1 匿名 深圳   | `?cityId=yYEu8E2geJP-VjMOc4FAf` | ✅ 200 `{cityName:深圳, activePeopleCount:0, topLocations:[], neighborTeams:[]}` in 1.62s (cold) |
| P3 N3 fallback | `?cityId=nonexistent_city_test` | ✅ 200 `{cityName:你的城市, activePeopleCount:0, 三数组[]}`                                      |
| P4 400 无参    | no cityId                       | ✅ 400 `{error.code:BAD_REQUEST}`                                                                |

> ⚠️ **早前一处 Case 1 我用 staging city_id (`bzP28N9PIhLhe5n41CUuG`) curl prod → 返回 fallback，是因为 prod 深圳 city_id 是 `yYEu8E2geJP-VjMOc4FAf`。已重跑用正确 id，验证 fallback 与真实 city 逻辑二选一命中。**

## 4. 与 staging 的关系

| 维度               | staging                             | prod                                                                      |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------------- |
| 0016 apply         | ✅ CI 自动（deploy-staging.yml:28） | ✅ 早前已 apply                                                           |
| ANALYZE            | 1.18ms                              | 9.389ms                                                                   |
| 3 新索引存在       | ✅                                  | ✅                                                                        |
| 主 SQL 索引命中    | 4/4                                 | 2/4（team_members / user_favorites 走 SCAN，是 planner 表小时的正确选择） |
| 端到端 curl 4 case | ✅ Wen 4 case + Jeff 3 case         | ✅ Jeff 3 case（Martin 起线上回归清单）                                   |

## 5. 落地结论

- ✅ prod migration 0016 **已经生效**（`d1_migrations` 表 + `sqlite_master` 双确认）
- ✅ ANALYZE 刷新 sqlite_stat1，未来数据量增长时 planner 自动切回 index 走
- ✅ 端到端接口 prod-live，无 5xx，符合 spec §3.5 v1.1 输出契约
- ⏭ Martin 起 4 case 线上回归清单（P1-P4）
- ⏭ 后续观察：prod team_members / user_favorites 数据量 > 1K 时，重跑 EXPLAIN 验证 planner 切回 index 走。挂 P2 backlog。
