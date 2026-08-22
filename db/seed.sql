-- Minimal idempotent development seed for the V3 schema.
-- Keep fixture/demo users and activity data in test-specific seeds.

INSERT OR IGNORE INTO `region` (
  `id`, `country_code`, `name`, `name_en`, `slug`, `code`, `level`, `sort_order`
) VALUES (
  'region-cn', 'CN', '中国', 'China', 'china', 'CN', 'other', 0
);

INSERT OR IGNORE INTO `region` (
  `id`, `country_code`, `parent_id`, `name`, `name_en`, `slug`, `code`, `level`, `sort_order`
) VALUES (
  'region-cn-guangdong', 'CN', 'region-cn', '广东省', 'Guangdong', 'guangdong', '440000', 'province', 10
);

INSERT OR IGNORE INTO `region` (
  `id`, `country_code`, `parent_id`, `name`, `name_en`, `slug`, `code`, `level`,
  `timezone`, `center_latitude`, `center_longitude`, `service_enabled`, `is_hot`, `sort_order`
) VALUES (
  'region-cn-shenzhen', 'CN', 'region-cn-guangdong', '深圳市', 'Shenzhen', 'shenzhen',
  '440300', 'city', 'Asia/Shanghai', 22.5431, 114.0579, 1, 1, 10
);

INSERT OR IGNORE INTO `locations` (
  `id`, `region_id`, `name`, `slug`, `supported_activity_types`, `description`,
  `address`, `latitude`, `longitude`, `cover_image_url`, `images`, `extra`
) VALUES (
  'location-shenzhen-wutongshan', 'region-cn-shenzhen', '梧桐山', 'wutongshan',
  '["hiking","explore"]', '深圳代表性山野地点。', '深圳市罗湖区', 22.5833, 114.2147,
  'https://gomate.live/images/locations/wutongshan-cover.jpg', '[]', '{}'
);

INSERT OR IGNORE INTO `tags` (`id`, `name`, `slug`) VALUES
  ('tag-hiking', '徒步', 'hiking'),
  ('tag-weekend', '周末', 'weekend'),
  ('tag-nature', '自然', 'nature');

INSERT OR IGNORE INTO `location_tags` (`location_id`, `tag_id`) VALUES
  ('location-shenzhen-wutongshan', 'tag-hiking'),
  ('location-shenzhen-wutongshan', 'tag-weekend'),
  ('location-shenzhen-wutongshan', 'tag-nature');
