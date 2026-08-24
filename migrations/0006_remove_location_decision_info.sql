UPDATE locations
SET extra = json_remove(
  extra,
  '$.hiking.gear_essential',
  '$.hiking.gear_optional'
)
WHERE json_type(extra, '$.hiking.gear_essential') IS NOT NULL
   OR json_type(extra, '$.hiking.gear_optional') IS NOT NULL;
