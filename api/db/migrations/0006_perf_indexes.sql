-- Migration: Add indexes for public list and messaging hot paths
-- Created: 2026-06-27

CREATE INDEX IF NOT EXISTS locations_name_idx
  ON locations(name);

CREATE INDEX IF NOT EXISTS entity_to_tags_type_tag_entity_idx
  ON entity_to_tags(entity_type, tag_id, entity_id);

CREATE INDEX IF NOT EXISTS team_members_team_status_idx
  ON team_members(team_id, status);

CREATE INDEX IF NOT EXISTS messages_conversation_created_at_idx
  ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS messages_conversation_unread_sender_idx
  ON messages(conversation_id, is_read, sender_id);
