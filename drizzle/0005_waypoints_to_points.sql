-- 将 waypoints 表改造为通用的 points 表
-- 支持路线途径点、地点打卡点、观景点等多种类型

-- ==================== Step 1: 创建新的 points 表 ====================
CREATE TABLE points (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  coordinates TEXT NOT NULL,
  "order" INTEGER,
  images TEXT,
  tags TEXT,
  extra TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX points_entity_idx ON points(entity_type, entity_id);
CREATE INDEX points_type_idx ON points(type);
CREATE INDEX points_order_idx ON points(entity_id, "order");

-- ==================== Step 2: 数据迁移 ====================
-- 将 waypoints 数据迁移到 points 表（如果 waypoints 表存在且有数据）
INSERT INTO points (id, entity_type, entity_id, type, name, description, coordinates, "order", images, tags, extra, created_at, updated_at)
SELECT
  id,
  'route' as entity_type,
  route_id as entity_id,
  'waypoint' as type,
  name,
  description,
  coordinates,
  "order",
  NULL as images,
  NULL as tags,
  NULL as extra,
  created_at,
  updated_at
FROM waypoints
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='waypoints');

-- ==================== Step 3: 删除旧的 waypoints 表 ====================
DROP TABLE IF EXISTS waypoints;
