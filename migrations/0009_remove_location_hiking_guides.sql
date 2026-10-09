UPDATE locations
SET extra = json_remove(extra,
  '$.hiking.difficulty',
  '$.hiking.duration_min',
  '$.hiking.duration_max',
  '$.hiking.distance_km',
  '$.hiking.elevation_gain_m',
  '$.hiking.overview',
  '$.hiking.tips',
  '$.hiking.warnings',
  '$.hiking.gear_essential',
  '$.hiking.gear_optional'
)
WHERE json_type(extra, '$.hiking') = 'object';
