-- ==========================================
-- 清理 locations 表：删除已迁移到 routes 的字段
-- 创建时间：2026-03-05
-- ==========================================

-- SQLite 不支持 ALTER TABLE DROP COLUMN，需要通过重建表的方式删除字段

-- 1. 创建新表结构（只保留地点相关字段）
CREATE TABLE locations_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  description TEXT NOT NULL,
  address TEXT,
  city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  city_name TEXT,
  best_season TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  images TEXT NOT NULL,
  coordinates TEXT NOT NULL,
  extra TEXT,                            -- JSON: { facilities, tips, warnings }
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 2. 复制数据到新表
INSERT INTO locations_new (
  id, name, slug, subtitle, description, address,
  city_id, city_name, best_season, cover_image, images,
  coordinates, extra, created_at, updated_at
)
SELECT
  id, name, slug, subtitle, description, address,
  city_id, city_name, best_season, cover_image, images,
  coordinates, extra, created_at, updated_at
FROM locations;

-- 3. 删除旧表
DROP TABLE locations;

-- 4. 重命名新表
ALTER TABLE locations_new RENAME TO locations;

-- 5. 重建索引
CREATE UNIQUE INDEX locations_slug_idx ON locations(slug);
CREATE INDEX locations_city_idx ON locations(city_id);

-- 6. 重建 teams 表（保持外键约束）
-- 6.1 创建新 teams 表
CREATE TABLE teams_new (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  leader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  duration TEXT,
  max_members INTEGER NOT NULL DEFAULT 10,
  current_members INTEGER NOT NULL DEFAULT 1,
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'recruiting',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 6.2 复制数据（明确指定列名，避免 SELECT * 导致的列错位问题）
INSERT INTO teams_new (
  id,
  location_id,
  route_id,
  leader_id,
  title,
  description,
  start_time,
  end_time,
  duration,
  max_members,
  current_members,
  requirements,
  status,
  created_at,
  updated_at
)
SELECT
  id,
  location_id,
  route_id,
  leader_id,
  title,
  description,
  start_time,
  end_time,
  duration,
  max_members,
  current_members,
  requirements,
  status,
  created_at,
  updated_at
FROM teams;

-- 6.3 删除旧表
DROP TABLE teams;

-- 6.4 重命名新表
ALTER TABLE teams_new RENAME TO teams;

-- 6.5 重建索引
CREATE INDEX teams_location_idx ON teams(location_id);
CREATE INDEX teams_route_idx ON teams(route_id);
CREATE INDEX teams_leader_idx ON teams(leader_id);
CREATE INDEX teams_status_idx ON teams(status);
CREATE INDEX teams_start_time_idx ON teams(start_time);

-- ==========================================
-- 数据验证查询（执行后检查）
-- ==========================================

-- 检查 locations 表结构
-- PRAGMA table_info(locations);

-- 检查 teams 表是否正常
-- SELECT COUNT(*) FROM teams;

-- 检查外键约束
-- SELECT * FROM teams t
-- LEFT JOIN locations l ON t.location_id = l.id
-- LEFT JOIN routes r ON t.route_id = r.id
-- WHERE l.id IS NULL OR r.id IS NULL;
