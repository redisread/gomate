-- Migration: 0012_teams_optimization
-- 优化 teams 和 team_members 表结构：
-- 1. 删除 teams.duration 字段（数据库始终为 NULL，由 API 从 startTime/endTime 动态计算）
-- 2. 删除 teams.currentMembers 字段（改为 SQL 子查询动态计算，避免数据不一致）
-- 3. 给 team_members 添加 statusUpdatedAt 字段（记录状态最后变更时间）
-- 4. 添加复合索引（status+createdAt 和 status+startTime）

-- SQLite 不支持直接 DROP COLUMN（3.35.0 之前版本），使用建新表→迁移数据→删旧表→重命名方式

-- ========== Step 1: 重建 teams 表（删除 duration 和 current_members 字段）==========

CREATE TABLE teams_new (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  leader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 10,
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'recruiting',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 迁移现有数据（跳过 duration 和 current_members 字段）
INSERT INTO teams_new (
  id, location_id, route_id, leader_id, title, description,
  start_time, end_time, max_members, requirements,
  status, created_at, updated_at
)
SELECT
  id, location_id, route_id, leader_id, title, description,
  start_time, end_time, max_members, requirements,
  status, created_at, updated_at
FROM teams;

-- 删除旧表
DROP TABLE teams;

-- 重命名新表
ALTER TABLE teams_new RENAME TO teams;

-- ========== Step 2: 重建 team_members 表（添加 status_updated_at 字段）==========

CREATE TABLE team_members_new (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  joined_at INTEGER,
  status_updated_at INTEGER,
  created_at INTEGER NOT NULL
);

-- 迁移现有数据
INSERT INTO team_members_new (id, team_id, user_id, status, joined_at, status_updated_at, created_at)
SELECT id, team_id, user_id, status, joined_at, joined_at, created_at
FROM team_members;

-- 删除旧表
DROP TABLE team_members;

-- 重命名新表
ALTER TABLE team_members_new RENAME TO team_members;

-- ========== Step 3: 重建索引 ==========

-- teams 表索引
CREATE INDEX teams_location_idx ON teams(location_id);
CREATE INDEX teams_route_idx ON teams(route_id);
CREATE INDEX teams_leader_idx ON teams(leader_id);
CREATE INDEX teams_status_idx ON teams(status);
CREATE INDEX teams_start_time_idx ON teams(start_time);
-- 新增复合索引
CREATE INDEX teams_status_created_at_idx ON teams(status, created_at);
CREATE INDEX teams_status_start_time_idx ON teams(status, start_time);

-- team_members 表索引
CREATE INDEX team_members_team_idx ON team_members(team_id);
CREATE INDEX team_members_user_idx ON team_members(user_id);
CREATE UNIQUE INDEX team_members_team_user_idx ON team_members(team_id, user_id);
