-- Migration: Add user_story_likes table for story like toggle
-- Created: 2026-06-28

CREATE TABLE IF NOT EXISTS user_story_likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (user_id, story_id)
);

CREATE INDEX IF NOT EXISTS user_story_likes_user_idx ON user_story_likes(user_id);
CREATE INDEX IF NOT EXISTS user_story_likes_story_idx ON user_story_likes(story_id);