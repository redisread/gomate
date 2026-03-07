-- 路线表优化改造 Migration
-- 1. cities 表新增 updated_at 字段
-- 2. routes 表字段类型改造（duration/distance/elevation 改为数值类型）
-- 3. 新增 waypoints 表

-- ==================== Step 1: 修改 cities 表 ====================
-- SQLite 不支持函数作为默认值，需要重建表

-- 1.1 创建新表
CREATE TABLE cities_new (
  id TEXT PRIMARY KEY NOT NULL,
  adcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pinyin TEXT,
  province TEXT,
  level TEXT,
  is_hot INTEGER DEFAULT 0 NOT NULL,
  parent_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 1.2 复制数据（使用当前时间戳作为 updated_at）
INSERT INTO cities_new (id, adcode, name, pinyin, province, level, is_hot, parent_id, created_at, updated_at)
SELECT id, adcode, name, pinyin, province, level, is_hot, parent_id, created_at, created_at
FROM cities;

-- 1.3 删除旧表
DROP TABLE cities;

-- 1.4 重命名新表
ALTER TABLE cities_new RENAME TO cities;

-- 1.5 重建索引
CREATE UNIQUE INDEX cities_adcode_idx ON cities(adcode);
CREATE INDEX cities_is_hot_idx ON cities(is_hot);

-- ==================== Step 2: 创建 waypoints 表 ====================
CREATE TABLE waypoints (
  id TEXT PRIMARY KEY NOT NULL,
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  coordinates TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX waypoints_route_idx ON waypoints(route_id);
CREATE INDEX waypoints_order_idx ON waypoints(route_id, "order");
CREATE UNIQUE INDEX waypoints_route_order_idx ON waypoints(route_id, "order");

-- ==================== Step 3: 重建 routes 表 ====================
-- SQLite 不支持直接修改列类型，需要重建表

-- 3.1 创建新表（包含新字段结构）
CREATE TABLE routes_new (
  id TEXT PRIMARY KEY NOT NULL,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  duration_max INTEGER NOT NULL,
  distance REAL NOT NULL,
  elevation INTEGER,
  route_guide TEXT,
  extra TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 3.2 复制数据（使用默认值填充新字段，实际数据由迁移脚本更新）
INSERT INTO routes_new (
  id, location_id, city_id, name, description, difficulty,
  duration_min, duration_max, distance, elevation, route_guide,
  extra, created_at, updated_at
)
SELECT
  id, location_id, city_id, name, description, difficulty,
  240, 300, 8.0, NULL, route_guide,
  NULL, created_at, updated_at
FROM routes;

-- 3.3 删除旧表
DROP TABLE routes;

-- 3.4 重命名新表
ALTER TABLE routes_new RENAME TO routes;

-- 3.5 重建索引
CREATE INDEX routes_location_idx ON routes(location_id);
CREATE INDEX routes_city_idx ON routes(city_id);
CREATE INDEX routes_difficulty_idx ON routes(difficulty);
CREATE INDEX routes_duration_idx ON routes(duration_min, duration_max);
CREATE INDEX routes_distance_idx ON routes(distance);
CREATE INDEX routes_elevation_idx ON routes(elevation);
