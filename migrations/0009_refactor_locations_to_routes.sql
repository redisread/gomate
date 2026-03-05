-- ==========================================
-- 数据库重构：拆分 locations 为 locations + routes
-- 创建时间：2026-03-05
-- ==========================================

-- 1. 创建 cities 表（城市信息）
CREATE TABLE cities (
  id TEXT PRIMARY KEY,
  adcode TEXT NOT NULL UNIQUE,           -- 高德行政区划代码（如"440300"）
  name TEXT NOT NULL,                    -- 城市名称（如"深圳"）
  pinyin TEXT,                           -- 拼音（用于 A-Z 排序）
  province TEXT,                         -- 所属省份
  level TEXT,                            -- city / district
  is_hot INTEGER DEFAULT 0,              -- 是否热门城市
  parent_id TEXT,                        -- 父级 ID（省市区层级）
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX cities_adcode_idx ON cities(adcode);
CREATE INDEX cities_is_hot_idx ON cities(is_hot);

-- 2. 插入深圳城市数据
INSERT INTO cities (id, adcode, name, pinyin, province, level, is_hot, created_at)
VALUES ('city_shenzhen', '440300', '深圳', 'shenzhen', '广东省', 'city', 1, strftime('%s', 'now'));

-- 3. 创建 routes 表（路线详情）
CREATE TABLE routes (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,                    -- 路线名称（如"泰山涧线路"）
  description TEXT,                       -- 路线描述
  difficulty TEXT NOT NULL,               -- easy/moderate/hard/expert
  duration TEXT NOT NULL,                 -- "4-5小时"
  distance TEXT NOT NULL,                 -- "8.5公里"
  elevation TEXT,                         -- "869米"
  route_guide TEXT,                       -- JSON: {overview, tips[]}
  waypoints TEXT,                         -- JSON: [{name, lat, lng, description}]
  equipment_needed TEXT,                  -- JSON 数组
  warnings TEXT,                          -- JSON 数组
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX routes_location_idx ON routes(location_id);
CREATE INDEX routes_city_idx ON routes(city_id);
CREATE INDEX routes_difficulty_idx ON routes(difficulty);

-- 4. 创建 tags 表（标签）
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,             -- 标签名称（如"溯溪"、"观景"）
  type TEXT NOT NULL,                    -- location | route | activity
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX tags_name_idx ON tags(name);
CREATE INDEX tags_type_idx ON tags(type);

-- 5. 创建 entity_to_tags 表（标签关联）
CREATE TABLE entity_to_tags (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,               -- 关联实体 ID（location_id 或 route_id）
  entity_type TEXT NOT NULL,             -- location | route | activity
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(entity_id, entity_type, tag_id) -- 防止重复关联
);

CREATE INDEX entity_to_tags_entity_idx ON entity_to_tags(entity_id, entity_type);
CREATE INDEX entity_to_tags_tag_idx ON entity_to_tags(tag_id);

-- 6. 为每个现有 location 创建对应的 route
INSERT INTO routes (
  id,
  location_id,
  city_id,
  name,
  description,
  difficulty,
  duration,
  distance,
  elevation,
  route_guide,
  waypoints,
  equipment_needed,
  warnings,
  created_at,
  updated_at
)
SELECT
  'route_' || id,                        -- 新 route ID
  id,                                    -- location_id（保持关联）
  'city_shenzhen',                       -- 默认深圳
  name || ' 主线',                       -- 路线名称
  route_description,                     -- 路线描述
  difficulty,                            -- 难度
  duration,                              -- 时长
  distance,                              -- 距离
  elevation,                             -- 海拔
  route_guide,                           -- 路线指南
  waypoints,                             -- 途径点
  equipment_needed,                      -- 装备
  warnings,                              -- 警告
  created_at,                            -- 创建时间
  updated_at                             -- 更新时间
FROM locations
WHERE id IS NOT NULL;

-- 7. 迁移 tags 到新表
-- 7.1 提取所有唯一 tag
INSERT INTO tags (id, name, type, created_at)
SELECT DISTINCT
  'tag_' || lower(replace(replace(replace(tag_value, ' ', '_'), '/', '_'), '-', '_')),
  tag_value,
  'location',
  strftime('%s', 'now')
FROM (
  SELECT DISTINCT json_each.value as tag_value
  FROM locations, json_each(locations.tags)
  WHERE locations.tags IS NOT NULL AND locations.tags != '[]'
);

-- 7.2 创建 location 标签关联
INSERT INTO entity_to_tags (id, entity_id, entity_type, tag_id, created_at)
SELECT
  'ett_' || lower(hex(randomblob(8))),
  locations.id,
  'location',
  'tag_' || lower(replace(replace(replace(json_each.value, ' ', '_'), '/', '_'), '-', '_')),
  strftime('%s', 'now')
FROM locations, json_each(locations.tags)
WHERE locations.tags IS NOT NULL AND locations.tags != '[]';

-- 8. 为 locations 表添加新字段
ALTER TABLE locations ADD COLUMN city_id TEXT;
ALTER TABLE locations ADD COLUMN extra TEXT;

-- 9. 迁移数据到 extra 字段
UPDATE locations SET extra = json_object(
  'facilities', CASE
    WHEN facilities IS NOT NULL THEN json(facilities)
    ELSE json('{"parking": false, "restroom": false, "water": false, "food": false}')
  END,
  'tips', COALESCE(tips, ''),
  'warnings', CASE
    WHEN warnings IS NOT NULL THEN json(warnings)
    ELSE json('[]')
  END
);

-- 10. 设置 city_id（使用 adcode 匹配，或默认深圳）
UPDATE locations
SET city_id = COALESCE(
  (SELECT id FROM cities WHERE cities.adcode = locations.adcode),
  'city_shenzhen'
);

-- 11. 设置 city_name（如果为空）
UPDATE locations
SET city_name = COALESCE(
  city_name,
  (SELECT name FROM cities WHERE cities.id = locations.city_id)
);

-- 12. 为 teams 表添加 route_id 字段
ALTER TABLE teams ADD COLUMN route_id TEXT REFERENCES routes(id) ON DELETE CASCADE;

-- 13. 为现有 teams 分配默认 route（每个 location 的第一条 route）
UPDATE teams
SET route_id = 'route_' || location_id
WHERE route_id IS NULL;

-- 14. 创建 teams route 索引
CREATE INDEX teams_route_idx ON teams(route_id);

-- ==========================================
-- 数据验证查询（执行后检查）
-- ==========================================

-- 检查所有 location 是否至少有一条 route
-- SELECT l.id, l.name, COUNT(r.id) as route_count
-- FROM locations l
-- LEFT JOIN routes r ON l.id = r.location_id
-- GROUP BY l.id
-- HAVING route_count = 0;

-- 检查 teams 是否都有有效的 route_id
-- SELECT t.id, t.title
-- FROM teams t
-- LEFT JOIN routes r ON t.route_id = r.id
-- WHERE r.id IS NULL;

-- 检查标签迁移情况
-- SELECT COUNT(*) as tag_count FROM tags;
-- SELECT COUNT(*) as entity_tag_count FROM entity_to_tags;
