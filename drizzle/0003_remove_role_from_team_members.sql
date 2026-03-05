-- 移除 team_members 表的 role 字段
-- 该字段是冗余的，因为可以通过 team.leaderId === member.userId 判断是否为队长

-- SQLite 不支持直接 DROP COLUMN，需要重建表
-- 1. 创建新表（不包含 role 字段）
CREATE TABLE team_members_new (
  id TEXT PRIMARY KEY NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' NOT NULL,
  joined_at INTEGER,
  created_at INTEGER NOT NULL
);

-- 2. 复制数据（排除 role 字段）
INSERT INTO team_members_new (id, team_id, user_id, status, joined_at, created_at)
SELECT id, team_id, user_id, status, joined_at, created_at
FROM team_members;

-- 3. 删除旧表
DROP TABLE team_members;

-- 4. 重命名新表
ALTER TABLE team_members_new RENAME TO team_members;

-- 5. 重建索引
CREATE INDEX team_members_team_idx ON team_members(team_id);
CREATE INDEX team_members_user_idx ON team_members(user_id);
CREATE UNIQUE INDEX team_members_team_user_idx ON team_members(team_id, user_id);
