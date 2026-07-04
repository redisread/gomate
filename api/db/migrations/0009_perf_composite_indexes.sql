-- Migration: Add composite indexes for query optimization
-- 使用 IF NOT EXISTS 保证幂等：生产环境可能已通过其他路径创建部分索引
-- Stories: status + created_at (for filtered list queries)
CREATE INDEX IF NOT EXISTS stories_status_created_at_idx ON stories(status, created_at);

-- Team members: team_id + status (for member count queries)
CREATE INDEX IF NOT EXISTS team_members_team_status_idx ON team_members(team_id, status);

-- User favorites: user_id + created_at (for favorites list)
CREATE INDEX IF NOT EXISTS user_favorites_user_created_idx ON user_favorites(user_id, created_at);

-- Share events: entity_type + entity_id (for share stats)
CREATE INDEX IF NOT EXISTS share_events_entity_idx ON share_events(entity_type, entity_id);
