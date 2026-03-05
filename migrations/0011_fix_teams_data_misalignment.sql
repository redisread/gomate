-- ==========================================
-- 修复 teams 表数据错位问题
-- 创建时间：2026-03-05
-- 问题：0010 迁移使用 SELECT * 导致列错位
-- ==========================================

-- 问题分析：
-- 旧表列顺序：id, location_id, leader_id, title, description, start_time, end_time,
--             duration, max_members, current_members, requirements, status,
--             created_at, updated_at, route_id
-- 新表列顺序：id, location_id, route_id, leader_id, title, description, start_time,
--             end_time, duration, max_members, current_members, requirements, status,
--             created_at, updated_at
--
-- 错位映射：
-- 新表.route_id      ← 旧表.leader_id
-- 新表.leader_id     ← 旧表.title
-- 新表.requirements  ← 旧表.status
-- 新表.status        ← 旧表.created_at
-- 新表.created_at    ← 旧表.updated_at
-- 新表.updated_at    ← 旧表.route_id

-- 1. 创建临时表存储正确的数据
CREATE TABLE teams_fixed (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  leader_id TEXT NOT NULL,
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

-- 2. 从错位的数据中恢复正确的数据
--
-- 当前错位的表结构（实际存储）：
-- 列 1: id (正确)
-- 列 2: location_id (正确)
-- 列 3: route_id 位置 → 实际存储 leader_id 数据
-- 列 4: leader_id 位置 → 实际存储 title 数据
-- 列 5: title 位置 → 实际存储 description 数据
-- 列 6: description 位置 → 实际存储 start_time 数据
-- 列 7: start_time 位置 → 实际存储 end_time 数据
-- 列 8: end_time 位置 → 实际存储 duration 数据
-- 列 9: duration 位置 → 实际存储 max_members 数据
-- 列 10: max_members 位置 → 实际存储 current_members 数据
-- 列 11: current_members 位置 → 实际存储 requirements 数据
-- 列 12: requirements 位置 → 实际存储 status 数据
-- 列 13: status 位置 → 实际存储 created_at 数据
-- 列 14: created_at 位置 → 实际存储 updated_at 数据
-- 列 15: updated_at 位置 → 实际存储 route_id 数据
--
-- 修复策略：读取错位的列，写入正确的列

INSERT INTO teams_fixed (
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
  id,              -- 列 1 → id (正确)
  location_id,     -- 列 2 → location_id (正确)
  updated_at,      -- 列 15 → route_id (从错位的 updated_at 列读取真实的 route_id 数据)
  route_id,        -- 列 3 → leader_id (从错位的 route_id 列读取真实的 leader_id 数据)
  leader_id,       -- 列 4 → title (从错位的 leader_id 列读取真实的 title 数据)
  title,           -- 列 5 → description (从错位的 title 列读取真实的 description 数据)
  CAST(description AS INTEGER), -- 列 6 → start_time (从错位的 description 列读取真实的 start_time 数据)
  CAST(start_time AS INTEGER),  -- 列 7 → end_time (从错位的 start_time 列读取真实的 end_time 数据)
  end_time,        -- 列 8 → duration (从错位的 end_time 列读取真实的 duration 数据)
  CAST(duration AS INTEGER),    -- 列 9 → max_members (从错位的 duration 列读取真实的 max_members 数据)
  CAST(max_members AS INTEGER), -- 列 10 → current_members (从错位的 max_members 列读取真实的 current_members 数据)
  current_members, -- 列 11 → requirements (从错位的 current_members 列读取真实的 requirements 数据)
  requirements,    -- 列 12 → status (从错位的 requirements 列读取真实的 status 数据)
  CAST(status AS INTEGER),      -- 列 13 → created_at (从错位的 status 列读取真实的 created_at 数据)
  CAST(created_at AS INTEGER)   -- 列 14 → updated_at (从错位的 created_at 列读取真实的 updated_at 数据)
FROM teams;

-- 3. 删除错位的旧表
DROP TABLE teams;

-- 4. 重命名修复后的表
ALTER TABLE teams_fixed RENAME TO teams;

-- 5. 重建索引
CREATE INDEX teams_location_idx ON teams(location_id);
CREATE INDEX teams_route_idx ON teams(route_id);
CREATE INDEX teams_leader_idx ON teams(leader_id);
CREATE INDEX teams_status_idx ON teams(status);
CREATE INDEX teams_start_time_idx ON teams(start_time);

-- ==========================================
-- 数据验证查询（执行后检查）
-- ==========================================

-- 检查 status 字段是否为有效枚举值
-- SELECT id, status FROM teams
-- WHERE status NOT IN ('recruiting', 'full', 'ongoing', 'completed', 'cancelled');

-- 检查 requirements 字段是否为有效 JSON
-- SELECT id, requirements FROM teams WHERE requirements IS NOT NULL;

-- 检查时间戳字段是否为合理的 Unix 时间戳（2020年后）
-- SELECT id, created_at, updated_at FROM teams
-- WHERE created_at < 1577836800 OR updated_at < 1577836800;

-- 检查 route_id 是否存在
-- SELECT t.id, t.route_id FROM teams t
-- LEFT JOIN routes r ON t.route_id = r.id
-- WHERE r.id IS NULL;
