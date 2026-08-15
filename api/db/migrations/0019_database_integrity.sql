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

PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
DROP TABLE IF EXISTS `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `teams_location_idx` ON `teams` (`location_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_leader_idx` ON `teams` (`leader_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_status_idx` ON `teams` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_start_time_idx` ON `teams` (`start_time`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_title_idx` ON `teams` (`title`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_status_created_at_idx` ON `teams` (`status`, `created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_status_start_time_idx` ON `teams` (`status`, `start_time`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_status_end_time_idx` ON `teams` (`status`, `end_time`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `teams_actor_api_key_id_idx` ON `teams` (`actor_api_key_id`);--> statement-breakpoint

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
