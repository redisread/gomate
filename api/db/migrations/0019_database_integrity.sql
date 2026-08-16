-- Database integrity hardening.
-- Rebuilds teams with the foreign keys lost in 0013, normalizes legacy statuses,
-- removes redundant indexes, and moves derived-state maintenance into SQLite triggers.

CREATE TABLE IF NOT EXISTS `_0019_integrity_guard` (
  `ok` integer NOT NULL CHECK (`ok` = 1)
);--> statement-breakpoint
DELETE FROM `_0019_integrity_guard`;--> statement-breakpoint

-- Normalize the legacy users.city representation before enforcing city-id semantics.
UPDATE `users`
SET `city` = NULL
WHERE `city` = '';--> statement-breakpoint
UPDATE `users`
SET `city` = (
  SELECT c.id FROM `cities` c WHERE c.name = users.city ORDER BY c.id LIMIT 1
)
WHERE `city` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `cities` c WHERE c.id = users.city)
  AND EXISTS (SELECT 1 FROM `cities` c WHERE c.name = users.city);--> statement-breakpoint

-- Polymorphic relations cannot use native FKs; remove already-orphaned legacy rows
-- before installing validation/cleanup triggers for all future writes.
DELETE FROM `entity_to_tags`
WHERE `entity_type` NOT IN ('location', 'activity', 'story')
   OR (`entity_type` = 'location' AND NOT EXISTS (SELECT 1 FROM `locations` WHERE id = entity_to_tags.entity_id))
   OR (`entity_type` = 'activity' AND NOT EXISTS (SELECT 1 FROM `teams` WHERE id = entity_to_tags.entity_id))
   OR (`entity_type` = 'story' AND NOT EXISTS (SELECT 1 FROM `stories` WHERE id = entity_to_tags.entity_id));--> statement-breakpoint
DELETE FROM `user_favorites`
WHERE `entity_type` NOT IN ('location', 'story')
   OR (`entity_type` = 'location' AND NOT EXISTS (SELECT 1 FROM `locations` WHERE id = user_favorites.entity_id))
   OR (`entity_type` = 'story' AND NOT EXISTS (SELECT 1 FROM `stories` WHERE id = user_favorites.entity_id));--> statement-breakpoint

-- Apply the cleanup that the intended child FKs would already have performed.
-- Delete deepest children first so this also works on databases where those FKs
-- were lost and no cascade behavior is available.
DELETE FROM `messages`
WHERE NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = messages.sender_id)
   OR NOT EXISTS (
     SELECT 1
     FROM `conversations` c
     JOIN `teams` t ON t.id = c.team_id
     JOIN `users` participant ON participant.id = c.user_id
     JOIN `users` leader ON leader.id = c.leader_id
     JOIN `users` initiator ON initiator.id = c.initiator_id
     WHERE c.id = messages.conversation_id
   );--> statement-breakpoint
DELETE FROM `conversations`
WHERE NOT EXISTS (SELECT 1 FROM `teams` t WHERE t.id = conversations.team_id)
   OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = conversations.user_id)
   OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = conversations.leader_id)
   OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = conversations.initiator_id);--> statement-breakpoint
DELETE FROM `team_members`
WHERE NOT EXISTS (SELECT 1 FROM `teams` t WHERE t.id = team_members.team_id)
   OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = team_members.user_id);--> statement-breakpoint
UPDATE `activity_posts`
SET `location_id` = NULL
WHERE `location_id` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `locations` l WHERE l.id = activity_posts.location_id);--> statement-breakpoint
DELETE FROM `activity_posts`
WHERE NOT EXISTS (SELECT 1 FROM `teams` t WHERE t.id = activity_posts.team_id)
   OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = activity_posts.author_id);--> statement-breakpoint

INSERT INTO `_0019_integrity_guard` (`ok`)
SELECT CASE WHEN EXISTS (
  SELECT 1
  FROM `teams` t
  LEFT JOIN `locations` l ON l.id = t.location_id
  LEFT JOIN `users` u ON u.id = t.leader_id
  WHERE l.id IS NULL
     OR u.id IS NULL
     OR t.duration_min < 0
     OR t.duration_min > 1440
     OR t.max_members < 2
     OR t.max_members > 50
     OR t.end_time < t.start_time
     OR t.status NOT IN (
       'recruiting', 'full', 'formed', 'cancelled', 'completed',
       'confirmed', 'ongoing', 'ended'
     )
) THEN 0 ELSE 1 END;--> statement-breakpoint
INSERT INTO `_0019_integrity_guard` (`ok`)
SELECT CASE WHEN
  EXISTS (
    SELECT 1 FROM `users` u
    WHERE u.city IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `cities` c WHERE c.id = u.city)
  )
  OR EXISTS (
    SELECT 1 FROM `team_members` tm
    WHERE tm.status NOT IN ('pending', 'approved', 'rejected', 'leave_pending', 'cancelled')
       OR NOT EXISTS (SELECT 1 FROM `teams` t WHERE t.id = tm.team_id)
       OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = tm.user_id)
  )
  OR EXISTS (
    SELECT 1 FROM `conversations` c
    WHERE NOT EXISTS (SELECT 1 FROM `teams` t WHERE t.id = c.team_id)
       OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = c.user_id)
       OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = c.leader_id)
       OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = c.initiator_id)
  )
  OR EXISTS (
    SELECT 1 FROM `messages` m
    WHERE NOT EXISTS (SELECT 1 FROM `conversations` c WHERE c.id = m.conversation_id)
       OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = m.sender_id)
  )
  OR EXISTS (
    SELECT 1 FROM `activity_posts` ap
    WHERE NOT EXISTS (SELECT 1 FROM `teams` t WHERE t.id = ap.team_id)
       OR (ap.location_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `locations` l WHERE l.id = ap.location_id))
       OR NOT EXISTS (SELECT 1 FROM `users` u WHERE u.id = ap.author_id)
  )
  OR EXISTS (
    SELECT 1 FROM `teams` t
    WHERE (
      SELECT COUNT(*) FROM `team_members` tm
      WHERE tm.team_id = t.id AND tm.status IN ('approved', 'leave_pending')
    ) > t.max_members
  )
THEN 0 ELSE 1 END;--> statement-breakpoint
DROP TABLE IF EXISTS `_0019_integrity_guard`;--> statement-breakpoint

-- D1 keeps foreign keys enabled inside migrations, while historical production
-- databases can be missing some child-table FKs. Rebuild the complete teams graph
-- instead of relying on environment-specific DROP TABLE cascade behavior.
PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
DROP TRIGGER IF EXISTS `teams_polymorphic_cleanup`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `entity_to_tags_validate_insert`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `entity_to_tags_validate_update`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_validate_insert`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_validate_update`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `teams_capacity_validate_update`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_status_after_insert`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_status_after_update`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `team_members_status_after_delete`;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `__new_teams` (
  `id` text PRIMARY KEY NOT NULL,
  `location_id` text NOT NULL,
  `leader_id` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `start_time` integer NOT NULL,
  `end_time` integer NOT NULL,
  `duration_min` integer DEFAULT 240 NOT NULL,
  `max_members` integer DEFAULT 10 NOT NULL,
  `requirements` text,
  `icon` text DEFAULT '⛰️' NOT NULL,
  `status` text DEFAULT 'recruiting' NOT NULL,
  `checklist` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `actor_api_key_id` text,
  CONSTRAINT `teams_location_id_locations_id_fk`
    FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT `teams_leader_id_users_id_fk`
    FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT `teams_status_check`
    CHECK (`status` IN ('recruiting', 'full', 'formed', 'cancelled', 'completed')),
  CONSTRAINT `teams_duration_min_check` CHECK (`duration_min` BETWEEN 0 AND 1440),
  CONSTRAINT `teams_max_members_check` CHECK (`max_members` BETWEEN 2 AND 50),
  CONSTRAINT `teams_time_range_check` CHECK (`end_time` >= `start_time`)
);--> statement-breakpoint
DELETE FROM `__new_teams`;--> statement-breakpoint
INSERT INTO `__new_teams` (
  `id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`,
  `duration_min`, `max_members`, `requirements`, `icon`, `status`, `checklist`,
  `created_at`, `updated_at`, `actor_api_key_id`
)
SELECT
  `id`, `location_id`, `leader_id`, `title`, `description`, `start_time`, `end_time`,
  `duration_min`, `max_members`, `requirements`, `icon`,
  CASE
    WHEN `status` IN ('confirmed', 'ongoing') THEN 'formed'
    WHEN `status` = 'ended' THEN 'completed'
    ELSE `status`
  END,
  `checklist`, `created_at`, `updated_at`, `actor_api_key_id`
FROM `teams`;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `__new_team_members` (
  `id` text PRIMARY KEY NOT NULL,
  `team_id` text NOT NULL,
  `user_id` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `joined_at` integer,
  `status_updated_at` integer,
  `extra` text,
  `created_at` integer NOT NULL,
  `actor_api_key_id` text,
  CONSTRAINT `team_members_team_id_teams_id_fk`
    FOREIGN KEY (`team_id`) REFERENCES `__new_teams`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `team_members_user_id_users_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
DELETE FROM `__new_team_members`;--> statement-breakpoint
INSERT INTO `__new_team_members` (
  `id`, `team_id`, `user_id`, `status`, `joined_at`, `status_updated_at`,
  `extra`, `created_at`, `actor_api_key_id`
)
SELECT
  `id`, `team_id`, `user_id`, `status`, `joined_at`, `status_updated_at`,
  `extra`, `created_at`, `actor_api_key_id`
FROM `team_members`;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `__new_conversations` (
  `id` text PRIMARY KEY NOT NULL,
  `team_id` text NOT NULL,
  `user_id` text NOT NULL,
  `leader_id` text NOT NULL,
  `initiator_id` text NOT NULL,
  `last_message_content` text,
  `last_message_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  CONSTRAINT `conversations_team_id_teams_id_fk`
    FOREIGN KEY (`team_id`) REFERENCES `__new_teams`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `conversations_user_id_users_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  CONSTRAINT `conversations_leader_id_users_id_fk`
    FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  CONSTRAINT `conversations_initiator_id_users_id_fk`
    FOREIGN KEY (`initiator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
DELETE FROM `__new_conversations`;--> statement-breakpoint
INSERT INTO `__new_conversations` (
  `id`, `team_id`, `user_id`, `leader_id`, `initiator_id`, `last_message_content`,
  `last_message_at`, `created_at`, `updated_at`
)
SELECT
  `id`, `team_id`, `user_id`, `leader_id`, `initiator_id`, `last_message_content`,
  `last_message_at`, `created_at`, `updated_at`
FROM `conversations`;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `__new_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `conversation_id` text NOT NULL,
  `sender_id` text NOT NULL,
  `content` text NOT NULL,
  `is_read` integer DEFAULT 0 NOT NULL,
  `read_at` integer,
  `created_at` integer NOT NULL,
  CONSTRAINT `messages_conversation_id_conversations_id_fk`
    FOREIGN KEY (`conversation_id`) REFERENCES `__new_conversations`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `messages_sender_id_users_id_fk`
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
DELETE FROM `__new_messages`;--> statement-breakpoint
INSERT INTO `__new_messages` (
  `id`, `conversation_id`, `sender_id`, `content`, `is_read`, `read_at`, `created_at`
)
SELECT
  `id`, `conversation_id`, `sender_id`, `content`, `is_read`, `read_at`, `created_at`
FROM `messages`;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `__new_activity_posts` (
  `id` text PRIMARY KEY NOT NULL,
  `team_id` text NOT NULL,
  `location_id` text,
  `author_id` text NOT NULL,
  `content` text NOT NULL,
  `images` text NOT NULL,
  `status` text DEFAULT 'visible' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  CONSTRAINT `activity_posts_team_id_teams_id_fk`
    FOREIGN KEY (`team_id`) REFERENCES `__new_teams`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `activity_posts_location_id_locations_id_fk`
    FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
  CONSTRAINT `activity_posts_author_id_users_id_fk`
    FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
DELETE FROM `__new_activity_posts`;--> statement-breakpoint
INSERT INTO `__new_activity_posts` (
  `id`, `team_id`, `location_id`, `author_id`, `content`, `images`, `status`,
  `created_at`, `updated_at`
)
SELECT
  `id`, `team_id`, `location_id`, `author_id`, `content`, `images`, `status`,
  `created_at`, `updated_at`
FROM `activity_posts`;--> statement-breakpoint

-- Drop children first so the parent replacement never depends on cascade behavior.
DROP TABLE IF EXISTS `messages`;--> statement-breakpoint
DROP TABLE IF EXISTS `conversations`;--> statement-breakpoint
DROP TABLE IF EXISTS `team_members`;--> statement-breakpoint
DROP TABLE IF EXISTS `activity_posts`;--> statement-breakpoint
DROP TABLE IF EXISTS `teams`;--> statement-breakpoint

ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
ALTER TABLE `__new_team_members` RENAME TO `team_members`;--> statement-breakpoint
ALTER TABLE `__new_conversations` RENAME TO `conversations`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
ALTER TABLE `__new_activity_posts` RENAME TO `activity_posts`;--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `teams_location_idx` ON `teams` (`location_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_leader_idx` ON `teams` (`leader_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_status_idx` ON `teams` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_start_time_idx` ON `teams` (`start_time`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_title_idx` ON `teams` (`title`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_status_created_at_idx` ON `teams` (`status`, `created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_status_start_time_idx` ON `teams` (`status`, `start_time`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_status_end_time_idx` ON `teams` (`status`, `end_time`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_actor_api_key_id_idx` ON `teams` (`actor_api_key_id`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `team_members_team_idx` ON `team_members` (`team_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `team_members_user_idx` ON `team_members` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `team_members_team_status_idx` ON `team_members` (`team_id`, `status`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `team_members_team_user_idx` ON `team_members` (`team_id`, `user_id`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `conversations_team_idx` ON `conversations` (`team_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `conversations_user_idx` ON `conversations` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `conversations_leader_idx` ON `conversations` (`leader_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `conversations_participant_idx` ON `conversations` (`team_id`, `user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `conversations_last_msg_idx` ON `conversations` (`last_message_at`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `messages_conversation_idx` ON `messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `messages_sender_idx` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `messages_created_idx` ON `messages` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `messages_conversation_created_at_idx` ON `messages` (`conversation_id`, `created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `messages_conversation_unread_sender_idx` ON `messages` (`conversation_id`, `is_read`, `sender_id`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `activity_posts_team_idx` ON `activity_posts` (`team_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_posts_location_idx` ON `activity_posts` (`location_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_posts_author_idx` ON `activity_posts` (`author_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_posts_status_idx` ON `activity_posts` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_posts_created_at_idx` ON `activity_posts` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_posts_location_created_at_idx` ON `activity_posts` (`location_id`, `created_at`);--> statement-breakpoint

DROP INDEX IF EXISTS `users_email_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `sessions_token_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `cities_adcode_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `locations_slug_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `tags_name_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `password_resets_token_idx`;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `users_city_idx` ON `users` (`city`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `locations_actor_api_key_id_idx` ON `locations` (`actor_api_key_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `team_members_actor_api_key_id_idx` ON `team_members` (`actor_api_key_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `stories_actor_api_key_id_idx` ON `stories` (`actor_api_key_id`);--> statement-breakpoint

UPDATE `locations`
SET `city_name` = (SELECT c.name FROM cities c WHERE c.id = locations.city_id)
WHERE EXISTS (SELECT 1 FROM cities c WHERE c.id = locations.city_id);--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `locations_city_name_after_insert`
AFTER INSERT ON `locations`
BEGIN
  UPDATE `locations`
  SET `city_name` = (SELECT c.name FROM `cities` c WHERE c.id = NEW.city_id)
  WHERE id = NEW.id;
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `locations_city_name_after_city_update`
AFTER UPDATE OF `city_id`, `city_name` ON `locations`
WHEN NEW.city_name IS NOT (SELECT c.name FROM `cities` c WHERE c.id = NEW.city_id)
BEGIN
  UPDATE `locations`
  SET `city_name` = (SELECT c.name FROM `cities` c WHERE c.id = NEW.city_id)
  WHERE id = NEW.id;
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `locations_city_name_after_city_rename`
AFTER UPDATE OF `name` ON `cities`
BEGIN
  UPDATE `locations` SET `city_name` = NEW.name WHERE `city_id` = NEW.id;
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `users_city_validate_insert`
BEFORE INSERT ON `users`
WHEN NEW.city IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `cities` WHERE id = NEW.city)
BEGIN
  SELECT RAISE(ABORT, 'users.city must reference cities.id');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `users_city_validate_update`
BEFORE UPDATE OF `city` ON `users`
WHEN NEW.city IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `cities` WHERE id = NEW.city)
BEGIN
  SELECT RAISE(ABORT, 'users.city must reference cities.id');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `cities_users_restrict_delete`
BEFORE DELETE ON `cities`
WHEN EXISTS (SELECT 1 FROM `users` WHERE city = OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'city is referenced by users');
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `entity_to_tags_validate_insert`
BEFORE INSERT ON `entity_to_tags`
WHEN NEW.entity_type NOT IN ('location', 'activity', 'story')
  OR (NEW.entity_type = 'location' AND NOT EXISTS (SELECT 1 FROM `locations` WHERE id = NEW.entity_id))
  OR (NEW.entity_type = 'activity' AND NOT EXISTS (SELECT 1 FROM `teams` WHERE id = NEW.entity_id))
  OR (NEW.entity_type = 'story' AND NOT EXISTS (SELECT 1 FROM `stories` WHERE id = NEW.entity_id))
BEGIN
  SELECT RAISE(ABORT, 'entity_to_tags references an invalid entity');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `entity_to_tags_validate_update`
BEFORE UPDATE OF `entity_type`, `entity_id` ON `entity_to_tags`
WHEN NEW.entity_type NOT IN ('location', 'activity', 'story')
  OR (NEW.entity_type = 'location' AND NOT EXISTS (SELECT 1 FROM `locations` WHERE id = NEW.entity_id))
  OR (NEW.entity_type = 'activity' AND NOT EXISTS (SELECT 1 FROM `teams` WHERE id = NEW.entity_id))
  OR (NEW.entity_type = 'story' AND NOT EXISTS (SELECT 1 FROM `stories` WHERE id = NEW.entity_id))
BEGIN
  SELECT RAISE(ABORT, 'entity_to_tags references an invalid entity');
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `user_favorites_validate_insert`
BEFORE INSERT ON `user_favorites`
WHEN NEW.entity_type NOT IN ('location', 'story')
  OR (NEW.entity_type = 'location' AND NOT EXISTS (SELECT 1 FROM `locations` WHERE id = NEW.entity_id))
  OR (NEW.entity_type = 'story' AND NOT EXISTS (SELECT 1 FROM `stories` WHERE id = NEW.entity_id))
BEGIN
  SELECT RAISE(ABORT, 'user_favorites references an invalid entity');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `user_favorites_validate_update`
BEFORE UPDATE OF `entity_type`, `entity_id` ON `user_favorites`
WHEN NEW.entity_type NOT IN ('location', 'story')
  OR (NEW.entity_type = 'location' AND NOT EXISTS (SELECT 1 FROM `locations` WHERE id = NEW.entity_id))
  OR (NEW.entity_type = 'story' AND NOT EXISTS (SELECT 1 FROM `stories` WHERE id = NEW.entity_id))
BEGIN
  SELECT RAISE(ABORT, 'user_favorites references an invalid entity');
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `locations_polymorphic_cleanup`
AFTER DELETE ON `locations`
BEGIN
  DELETE FROM `entity_to_tags` WHERE entity_type = 'location' AND entity_id = OLD.id;
  DELETE FROM `user_favorites` WHERE entity_type = 'location' AND entity_id = OLD.id;
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `stories_polymorphic_cleanup`
AFTER DELETE ON `stories`
BEGIN
  DELETE FROM `entity_to_tags` WHERE entity_type = 'story' AND entity_id = OLD.id;
  DELETE FROM `user_favorites` WHERE entity_type = 'story' AND entity_id = OLD.id;
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `teams_polymorphic_cleanup`
AFTER DELETE ON `teams`
BEGIN
  DELETE FROM `entity_to_tags` WHERE entity_type = 'activity' AND entity_id = OLD.id;
END;--> statement-breakpoint

UPDATE `stories`
SET `like_count` = (
  SELECT COUNT(*) FROM `user_story_likes` likes WHERE likes.story_id = stories.id
);--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `user_story_likes_count_after_insert`
AFTER INSERT ON `user_story_likes`
BEGIN
  UPDATE `stories`
  SET `like_count` = COALESCE(`like_count`, 0) + 1,
      `updated_at` = (unixepoch() * 1000)
  WHERE id = NEW.story_id;
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `user_story_likes_count_after_delete`
AFTER DELETE ON `user_story_likes`
BEGIN
  UPDATE `stories`
  SET `like_count` = MAX(0, COALESCE(`like_count`, 0) - 1),
      `updated_at` = (unixepoch() * 1000)
  WHERE id = OLD.story_id;
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `messages_summary_after_insert`
AFTER INSERT ON `messages`
BEGIN
  UPDATE `conversations`
  SET `last_message_content` = SUBSTR(NEW.content, 1, 100),
      `last_message_at` = NEW.created_at,
      `updated_at` = NEW.created_at
  WHERE id = NEW.conversation_id;
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `team_members_validate_insert`
BEFORE INSERT ON `team_members`
WHEN NEW.status NOT IN ('pending', 'approved', 'rejected', 'leave_pending', 'cancelled')
  OR (
    NEW.status = 'approved'
    AND (SELECT COUNT(*) FROM `team_members`
         WHERE team_id = NEW.team_id AND status IN ('approved', 'leave_pending'))
        >= (SELECT max_members FROM `teams` WHERE id = NEW.team_id)
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid membership status or team capacity exceeded');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `team_members_validate_update`
BEFORE UPDATE OF `status`, `team_id` ON `team_members`
WHEN NEW.status NOT IN ('pending', 'approved', 'rejected', 'leave_pending', 'cancelled')
  OR NEW.team_id <> OLD.team_id
  OR (
    NEW.status = 'approved'
    AND OLD.status NOT IN ('approved', 'leave_pending')
    AND (SELECT COUNT(*) FROM `team_members`
         WHERE team_id = NEW.team_id AND status IN ('approved', 'leave_pending'))
        >= (SELECT max_members FROM `teams` WHERE id = NEW.team_id)
  )
BEGIN
  SELECT RAISE(ABORT, 'invalid membership status or team capacity exceeded');
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `teams_capacity_validate_update`
BEFORE UPDATE OF `max_members` ON `teams`
WHEN NEW.max_members < (
  SELECT COUNT(*) FROM `team_members`
  WHERE team_id = NEW.id AND status IN ('approved', 'leave_pending')
)
BEGIN
  SELECT RAISE(ABORT, 'team max_members cannot be below current members');
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `team_members_status_after_insert`
AFTER INSERT ON `team_members`
BEGIN
  UPDATE `teams`
  SET `status` = CASE
        WHEN `status` IN ('recruiting', 'full') AND (
          SELECT COUNT(*) FROM `team_members`
          WHERE team_id = NEW.team_id AND status IN ('approved', 'leave_pending')
        ) >= `max_members` THEN 'full'
        WHEN `status` IN ('recruiting', 'full') THEN 'recruiting'
        ELSE `status`
      END,
      `updated_at` = (unixepoch() * 1000)
  WHERE id = NEW.team_id;
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `team_members_status_after_update`
AFTER UPDATE OF `status` ON `team_members`
BEGIN
  UPDATE `teams`
  SET `status` = CASE
        WHEN `status` IN ('recruiting', 'full') AND (
          SELECT COUNT(*) FROM `team_members`
          WHERE team_id = NEW.team_id AND status IN ('approved', 'leave_pending')
        ) >= `max_members` THEN 'full'
        WHEN `status` IN ('recruiting', 'full') THEN 'recruiting'
        ELSE `status`
      END,
      `updated_at` = (unixepoch() * 1000)
  WHERE id = NEW.team_id;
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `team_members_status_after_delete`
AFTER DELETE ON `team_members`
BEGIN
  UPDATE `teams`
  SET `status` = CASE
        WHEN `status` IN ('recruiting', 'full') AND (
          SELECT COUNT(*) FROM `team_members`
          WHERE team_id = OLD.team_id AND status IN ('approved', 'leave_pending')
        ) >= `max_members` THEN 'full'
        WHEN `status` IN ('recruiting', 'full') THEN 'recruiting'
        ELSE `status`
      END,
      `updated_at` = (unixepoch() * 1000)
  WHERE id = OLD.team_id;
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `users_domain_validate_insert`
BEFORE INSERT ON `users`
WHEN NEW.role NOT IN ('user', 'admin')
  OR NEW.status NOT IN ('active', 'suspended', 'banned', 'deleted')
  OR NEW.level NOT IN ('beginner', 'intermediate', 'advanced', 'expert')
  OR (NEW.gender IS NOT NULL AND NEW.gender NOT IN ('male', 'female', 'other'))
  OR (NEW.completed_hikes IS NOT NULL AND NEW.completed_hikes < 0)
BEGIN
  SELECT RAISE(ABORT, 'invalid users domain value');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `users_domain_validate_update`
BEFORE UPDATE OF `role`, `status`, `level`, `gender`, `completed_hikes` ON `users`
WHEN NEW.role NOT IN ('user', 'admin')
  OR NEW.status NOT IN ('active', 'suspended', 'banned', 'deleted')
  OR NEW.level NOT IN ('beginner', 'intermediate', 'advanced', 'expert')
  OR (NEW.gender IS NOT NULL AND NEW.gender NOT IN ('male', 'female', 'other'))
  OR (NEW.completed_hikes IS NOT NULL AND NEW.completed_hikes < 0)
BEGIN
  SELECT RAISE(ABORT, 'invalid users domain value');
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `locations_domain_validate_insert`
BEFORE INSERT ON `locations`
WHEN (NEW.difficulty IS NOT NULL AND NEW.difficulty NOT IN ('easy', 'moderate', 'hard', 'expert'))
  OR (NEW.duration_min IS NOT NULL AND NEW.duration_min < 0)
  OR (NEW.duration_max IS NOT NULL AND NEW.duration_max < 0)
  OR (NEW.duration_min IS NOT NULL AND NEW.duration_max IS NOT NULL AND NEW.duration_max < NEW.duration_min)
  OR (NEW.parking_available IS NOT NULL AND NEW.parking_available NOT IN (0, 1))
  OR NOT json_valid(NEW.best_season)
  OR NOT json_valid(NEW.images)
  OR NOT json_valid(NEW.coordinates)
BEGIN
  SELECT RAISE(ABORT, 'invalid locations domain value');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `locations_domain_validate_update`
BEFORE UPDATE OF `difficulty`, `duration_min`, `duration_max`, `parking_available`, `best_season`, `images`, `coordinates` ON `locations`
WHEN (NEW.difficulty IS NOT NULL AND NEW.difficulty NOT IN ('easy', 'moderate', 'hard', 'expert'))
  OR (NEW.duration_min IS NOT NULL AND NEW.duration_min < 0)
  OR (NEW.duration_max IS NOT NULL AND NEW.duration_max < 0)
  OR (NEW.duration_min IS NOT NULL AND NEW.duration_max IS NOT NULL AND NEW.duration_max < NEW.duration_min)
  OR (NEW.parking_available IS NOT NULL AND NEW.parking_available NOT IN (0, 1))
  OR NOT json_valid(NEW.best_season)
  OR NOT json_valid(NEW.images)
  OR NOT json_valid(NEW.coordinates)
BEGIN
  SELECT RAISE(ABORT, 'invalid locations domain value');
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `tags_domain_validate_insert`
BEFORE INSERT ON `tags`
WHEN NEW.type NOT IN ('location', 'activity', 'story')
BEGIN
  SELECT RAISE(ABORT, 'invalid tag type');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `tags_domain_validate_update`
BEFORE UPDATE OF `type` ON `tags`
WHEN NEW.type NOT IN ('location', 'activity', 'story')
BEGIN
  SELECT RAISE(ABORT, 'invalid tag type');
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `stories_domain_validate_insert`
BEFORE INSERT ON `stories`
WHEN NEW.status NOT IN ('draft', 'published', 'hidden')
  OR COALESCE(NEW.view_count, 0) < 0
  OR COALESCE(NEW.like_count, 0) < 0
BEGIN
  SELECT RAISE(ABORT, 'invalid story domain value');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `stories_domain_validate_update`
BEFORE UPDATE OF `status`, `view_count`, `like_count` ON `stories`
WHEN NEW.status NOT IN ('draft', 'published', 'hidden')
  OR COALESCE(NEW.view_count, 0) < 0
  OR COALESCE(NEW.like_count, 0) < 0
BEGIN
  SELECT RAISE(ABORT, 'invalid story domain value');
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `activity_posts_domain_validate_insert`
BEFORE INSERT ON `activity_posts`
WHEN NEW.status NOT IN ('visible', 'hidden', 'deleted') OR NOT json_valid(NEW.images)
BEGIN
  SELECT RAISE(ABORT, 'invalid activity post domain value');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `activity_posts_domain_validate_update`
BEFORE UPDATE OF `status`, `images` ON `activity_posts`
WHEN NEW.status NOT IN ('visible', 'hidden', 'deleted') OR NOT json_valid(NEW.images)
BEGIN
  SELECT RAISE(ABORT, 'invalid activity post domain value');
END;
