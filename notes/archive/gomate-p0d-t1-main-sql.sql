-- P0-D T1 主 SQL（对齐 Martin msg=8b50c654 骨架 + Jeff v0.2 微调）
-- 参数：
--   ?1 = now - 7d (ms epoch)
--   ?2 = now (ms epoch)
--   ?3 = cityId
WITH signals AS (
  -- PRIMARY: approved 成员 + team 已结束（7d 内）+ non-cancelled
  SELECT tm.user_id AS user_id, t.location_id AS location_id, 1.0 AS weight
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.status = 'approved'
    AND t.status != 'cancelled'
    AND t.end_time > ?1
    AND t.end_time <= ?2

  UNION ALL

  -- SECONDARY: user_favorites 泛型 entityType='location'
  SELECT user_id, entity_id AS location_id, 0.1 AS weight
  FROM user_favorites
  WHERE entity_type = 'location'
    AND created_at > ?1

  UNION ALL

  -- SUPPLEMENTARY: stories status='published'
  SELECT author_id AS user_id, location_id, 1.5 AS weight
  FROM stories
  WHERE status = 'published'
    AND created_at > ?1
    AND location_id IS NOT NULL

  UNION ALL

  -- SUPPLEMENTARY: activity_posts status='visible' (fact-check: NOT 'published')
  SELECT author_id AS user_id, location_id, 1.0 AS weight
  FROM activity_posts
  WHERE status = 'visible'
    AND created_at > ?1
    AND location_id IS NOT NULL
),
capped AS (
  -- per-(user, location) 聚合后 cap 3.0 (spec §5 防刷分)
  SELECT user_id, location_id, MIN(SUM(weight), 3.0) AS contribution
  FROM signals
  GROUP BY user_id, location_id
),
location_agg AS (
  -- 城市 scope 过滤下沉到这里（跨城全算 signals，再按 city 过滤 top pool）
  SELECT c.location_id, c.contribution, c.user_id
  FROM capped c
  JOIN locations loc ON loc.id = c.location_id
  WHERE loc.city_id = ?3
)
SELECT
  la.location_id,
  SUM(la.contribution) AS visit_score,
  COUNT(DISTINCT la.user_id) AS visitor_count
FROM location_agg la
GROUP BY la.location_id
ORDER BY visit_score DESC, visitor_count DESC, la.location_id ASC
LIMIT 3;
