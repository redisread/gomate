-- Product-curated popular cities for the public location and team filters.
-- Keep this list limited to existing, service-enabled city Regions.
UPDATE `region`
SET
  `is_hot` = 1,
  `sort_order` = CASE `id`
    WHEN 'region-cn-shenzhen' THEN 10
    WHEN 'region-cn-huizhou' THEN 20
    WHEN 'region-cn-hong-kong' THEN 30
    WHEN 'region-cn-changsha' THEN 40
    WHEN 'region-cn-chengdu' THEN 50
    WHEN 'region-cn-kunming' THEN 60
  END
WHERE `id` IN (
  'region-cn-shenzhen',
  'region-cn-huizhou',
  'region-cn-hong-kong',
  'region-cn-changsha',
  'region-cn-chengdu',
  'region-cn-kunming'
)
  AND `country_code` = 'CN'
  AND `level` = 'city'
  AND `service_enabled` = 1;
