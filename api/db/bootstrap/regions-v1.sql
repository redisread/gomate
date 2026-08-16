-- Production bootstrap v1: the exact CN/Guangdong/Shenzhen Region hierarchy.
-- This is intentionally separate from the development seed.
INSERT INTO `region` (
  `id`, `country_code`, `parent_id`, `name`, `name_en`, `slug`, `code`, `level`,
  `timezone`, `center_latitude`, `center_longitude`, `service_enabled`, `is_hot`, `sort_order`
) VALUES
  (
    'region-cn', 'CN', NULL, '中国', 'China', 'china', 'CN', 'other',
    NULL, NULL, NULL, 0, 0, 0
  ),
  (
    'region-cn-guangdong', 'CN', 'region-cn', '广东省', 'Guangdong', 'guangdong',
    '440000', 'province', NULL, NULL, NULL, 0, 0, 10
  ),
  (
    'region-cn-shenzhen', 'CN', 'region-cn-guangdong', '深圳市', 'Shenzhen',
    'shenzhen', '440300', 'city', 'Asia/Shanghai', 22.5431, 114.0579, 1, 1, 10
  );
