-- Migration: Add share_events table for sharing analytics
-- Created: 2026-06-29

CREATE TABLE IF NOT EXISTS share_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  share_channel TEXT NOT NULL,
  user_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS share_events_entity_idx ON share_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS share_events_channel_idx ON share_events(share_channel);
CREATE INDEX IF NOT EXISTS share_events_created_at_idx ON share_events(created_at);
