# P0-D T1 SQL 草图（预审用 · thread 预贴）

**版本**：v0.1 draft
**依据**：spec v1.1 §3.3 + §3.5 + Jeff v1.2 反馈（等 Steven 修补）
**参数占位**：`?1 = cityId` / `?2 = now - 7d (ms epoch)` / `?3 = now (ms epoch)`

---

## 主查询：本地圈子 top 3 locations

```sql
WITH per_user_location_signal AS (
  -- PRIMARY: approved + team.endTime 在 7d 内 + non-cancelled
  SELECT
    tm.user_id AS user_id,
    t.location_id AS location_id,
    1.0 AS raw_score
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN locations loc ON loc.id = t.location_id
  WHERE tm.status = 'approved'
    AND t.status != 'cancelled'
    AND t.end_time > ?2
    AND t.end_time < ?3
    AND loc.city_id = ?1

  UNION ALL

  -- SECONDARY: user_favorites (entityType='location', 7d)
  SELECT
    uf.user_id,
    uf.entity_id AS location_id,
    0.1 AS raw_score
  FROM user_favorites uf
  JOIN locations loc ON loc.id = uf.entity_id
  WHERE uf.entity_type = 'location'
    AND uf.created_at > ?2
    AND loc.city_id = ?1

  UNION ALL

  -- SUPPLEMENTARY: stories (status='published', 7d)
  SELECT
    s.author_id AS user_id,
    s.location_id,
    1.5 AS raw_score
  FROM stories s
  JOIN locations loc ON loc.id = s.location_id
  WHERE s.status = 'published'
    AND s.created_at > ?2
    AND loc.city_id = ?1

  UNION ALL

  -- SUPPLEMENTARY: activity_posts (status='visible', 7d)
  -- 待 Steven 拍：cancelled 广义/窄义。窄义 = 不 join teams。若广义则 + JOIN teams t2 ON t2.id = ap.team_id AND t2.status != 'cancelled'
  SELECT
    ap.author_id AS user_id,
    ap.location_id,
    1.0 AS raw_score
  FROM activity_posts ap
  JOIN locations loc ON loc.id = ap.location_id
  WHERE ap.status = 'visible'
    AND ap.created_at > ?2
    AND loc.city_id = ?1
    AND ap.location_id IS NOT NULL  -- schema: location_id nullable (onDelete: set null)
),
per_user_location_capped AS (
  -- 每 (user, location) 聚合后 cap 到 3.0（spec §5 防刷分）
  SELECT
    user_id,
    location_id,
    MIN(SUM(raw_score), 3.0) AS capped_score
  FROM per_user_location_signal
  GROUP BY user_id, location_id
),
location_agg AS (
  SELECT
    location_id,
    SUM(capped_score) AS visit_score,
    COUNT(DISTINCT user_id) AS unique_visitors
  FROM per_user_location_capped
  GROUP BY location_id
)
SELECT
  la.location_id,
  loc.name AS location_name,
  loc.cover_image AS location_cover_image,
  la.visit_score,
  la.unique_visitors
FROM location_agg la
JOIN locations loc ON loc.id = la.location_id
ORDER BY la.visit_score DESC, la.unique_visitors DESC, loc.name ASC  -- score 并列时按 unique_visitors 次序，最终 name 稳定排序
LIMIT 3;
```

## 头像堆叠子查询（top 3 location 拿到后再查）

```sql
-- 每个 top location 拿前 5 个头像
-- 参数：?location_id + ?2 (now-7d)
-- 排序：per_user 的 capped_score DESC → 高贡献用户优先展示
SELECT DISTINCT u.image
FROM per_user_location_capped pulc  -- 或重新展开子查询
JOIN users u ON u.id = pulc.user_id
WHERE pulc.location_id = ?location_id
  AND u.image IS NOT NULL
ORDER BY pulc.capped_score DESC
LIMIT 5;
```

**性能注**：头像不与主查询混，避免笛卡尔膨胀；主查询返回 top 3 location_id → 3 次并发头像查询（或 IN(?, ?, ?) 一次），可选缓存。

## 邻居队伍 top 3 (spec §3.4 neighborTeams)

```sql
-- 参数：?1 = currentUserCity, ?4 = now (recruiting 队伍) — 独立子查询
SELECT
  t.id AS team_id,
  t.title AS team_title,
  loc.name AS location_name,
  t.start_time,
  COUNT(DISTINCT tm.user_id) AS neighbor_count
  -- neighborAvatars 头像堆叠：类似 top location 的头像子查询
FROM teams t
JOIN locations loc ON loc.id = t.location_id
JOIN team_members tm ON tm.team_id = t.id
JOIN users u ON u.id = tm.user_id
WHERE t.status = 'recruiting'
  AND tm.status IN ('approved', 'pending')   -- 待 Steven 确认：邻居只算 approved 还是含 pending？
  AND u.city = ?1     -- 当前用户所在城市
  AND loc.city_id = ?userCityId  -- 同城队伍前提，需 Martin 确认
GROUP BY t.id
HAVING neighbor_count >= 1
ORDER BY neighbor_count DESC, t.start_time ASC
LIMIT 3;
```

## activePeopleCount (spec §3.4 首屏 badge "深圳 200 人本周去这里")

```sql
SELECT COUNT(DISTINCT user_id) AS active_people_count
FROM per_user_location_capped;
-- 或独立扫全部信号源 UNION 后 COUNT DISTINCT user_id (per-user, city-scoped)
```

---

## EXPLAIN QUERY PLAN 预期（wrangler d1 local 待跑）

**PRIMARY 子查询**：

- `SEARCH team_members USING INDEX team_members_team_status_idx (team_id=? AND status=?)` — 待验，实际是从 teams 侧驱动更好
- 或 `SCAN teams USING INDEX teams_status_end_time_idx` → `SEARCH team_members USING INDEX team_members_team_status_idx` → `SEARCH locations USING PK`

**SECONDARY 子查询**：

- `SCAN user_favorites USING INDEX user_favorites_entity_type_entity_id_created_at_idx` → `SEARCH locations USING PK`
- 前缀 `entity_type='location'` 高选择性，剩余按 created_at 范围扫描

**SUPPLEMENTARY 故事**：

- `SEARCH stories USING INDEX stories_location_status_created_at_idx (location_id=? AND status=? AND created_at>?)` — 需要驱动侧是 locations by city → JOIN stories，索引覆盖三列
- 或反向：`SEARCH locations USING INDEX locations_city_idx` → nested loop 到 stories

**SUPPLEMENTARY 动态**：

- `SEARCH activity_posts USING INDEX activity_posts_location_created_at_idx` — status 白名单在 SQL 层过滤（不进索引因基数低，不 useful 前缀）

## 索引 → 子查询 覆盖表

| 索引                                                          | 列 combo                             | 覆盖子查询                      | 前缀命中                                                                | Access path      |
| ------------------------------------------------------------- | ------------------------------------ | ------------------------------- | ----------------------------------------------------------------------- | ---------------- |
| `teams(status, end_time)` **新增**                            | (status, end_time)                   | PRIMARY 7d non-cancelled 已结束 | status='?' AND end_time BETWEEN ?,?                                     | Index range scan |
| `team_members(team_id, status)` 已存                          | (team_id, status)                    | PRIMARY approved 成员           | team_id=? AND status='approved'                                         | Index range scan |
| `team_members(user_id)` 已存                                  | (user_id)                            | 邻居队伍 join                   | user_id=?                                                               | Index seek       |
| `stories(location_id, status, created_at)` **新增**           | (location_id, status, created_at)    | SUPPLEMENTARY 故事              | location_id=? AND status='published' AND created_at>?                   | Index range scan |
| `activity_posts(location_id, created_at)` **新增**            | (location_id, created_at)            | SUPPLEMENTARY 动态              | location_id=? AND created_at>?                                          | Index range scan |
| `user_favorites(entity_type, entity_id, created_at)` **新增** | (entity_type, entity_id, created_at) | SECONDARY 收藏                  | entity_type='location' AND entity_id IN (city 内 locs) AND created_at>? | Index range scan |
| `locations(city_id)` 已存 (cityIdx)                           | (city_id)                            | 城市 scope 过滤                 | city_id=?                                                               | Index seek       |

## 5 边界 test case（Martin 约定 #3）

1. **score cap 3.0**：单 user 单 location 撞 PRIMARY 1.0 + SECONDARY 0.1 + 2 SUPPLEMENTARY (1.5+1.0) = 3.6 → capped=3.0
2. **cancelled 排除**：team.status='cancelled' 时 PRIMARY 子查询 0 行（窄义），activity_posts 若也走窄义则不 join teams
3. **7 天窗口**：team endTime = now-8d 不计；story createdAt = now-6d23h 计入
4. **空态**：city 内 4 源全 0 行 → 主查询返回 0 行 → API 层返回 topLocations=[], activePeopleCount=0 → 前端整块不渲染 (spec §6.4)
5. **entityType 泛化过滤**：user_favorites 中 entity_type='story' 或 entity_type='team' 的行不误计入 SECONDARY

## 待 Martin 拍的 3 点

1. **spec.md `MIN(SUM(x), 3.0)` D1 支持性**：SQLite 3.42+ 支持 `LEAST()`/`MIN()`（scalar 版本）—— D1 底层 SQLite 3.44+ 已 GA。但 `MIN(SUM(...))` 是嵌套聚合，D1 是否支持？备选：`CASE WHEN SUM(raw) > 3.0 THEN 3.0 ELSE SUM(raw) END`。**建议**：先试 `MIN(SUM(...), 3.0)`（更简），失败 fallback CASE。
2. **邻居队伍成员计数**：`tm.status IN ('approved', 'pending')` 还是 only `approved`？spec §4.2 只说「≥1 个成员的 users.city 匹配」，未指定 status 过滤。**倾向 only approved**（避免"邻居申请了但被拒"误计）。
3. **邻居队伍地点限制**：spec §4.2 没说邻居队伍的 location 是否同城。**倾向不限**：可能有队伍去外地徒步，同城邻居"跟着去"也是"邻居行为"，展示合理。
