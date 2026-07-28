-- P0-D T1 主 SQL：inline params 版（EXPLAIN 用）
-- now = 1721952000000, now-7d = 1721347200000, cityId = 'city_shenzhen'
WITH signals AS (
  SELECT tm.user_id AS user_id, t.location_id AS location_id, 1.0 AS weight
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.status = 'approved'
    AND t.status != 'cancelled'
    AND t.end_time > 1721347200000
    AND t.end_time <= 1721952000000
  UNION ALL
  SELECT user_id, entity_id AS location_id, 0.1 AS weight
  FROM user_favorites
  WHERE entity_type = 'location'
    AND created_at > 1721347200000
  UNION ALL
  SELECT author_id AS user_id, location_id, 1.5 AS weight
  FROM stories
  WHERE status = 'published'
    AND created_at > 1721347200000
    AND location_id IS NOT NULL
  UNION ALL
  SELECT author_id AS user_id, location_id, 1.0 AS weight
  FROM activity_posts
  WHERE status = 'visible'
    AND created_at > 1721347200000
    AND location_id IS NOT NULL
),
capped AS (
  SELECT user_id, location_id, MIN(SUM(weight), 3.0) AS contribution
  FROM signals
  GROUP BY user_id, location_id
),
location_agg AS (
  SELECT c.location_id, c.contribution, c.user_id
  FROM capped c
  JOIN locations loc ON loc.id = c.location_id
  WHERE loc.city_id = 'city_shenzhen'
)
SELECT
  la.location_id,
  SUM(la.contribution) AS visit_score,
  COUNT(DISTINCT la.user_id) AS visitor_count
FROM location_agg la
GROUP BY la.location_id
ORDER BY visit_score DESC, visitor_count DESC, la.location_id ASC
LIMIT 3;
