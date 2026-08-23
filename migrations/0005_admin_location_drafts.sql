DROP TRIGGER `team_members_capacity_validate_insert`;--> statement-breakpoint
DROP TRIGGER `team_members_capacity_validate_reactivate`;--> statement-breakpoint
DROP TRIGGER `team_members_leader_validate_insert`;--> statement-breakpoint
DROP TRIGGER `team_members_leader_validate_reactivate`;--> statement-breakpoint
DROP TRIGGER `teams_capacity_validate_update`;--> statement-breakpoint
DROP TRIGGER `teams_leader_validate_update`;--> statement-breakpoint
DROP TRIGGER `story_likes_count_after_insert`;--> statement-breakpoint
DROP TRIGGER `story_likes_count_after_delete`;--> statement-breakpoint
DROP TRIGGER `messages_summary_after_insert`;--> statement-breakpoint
CREATE TABLE `__backup_locations` AS SELECT * FROM `locations`;--> statement-breakpoint
CREATE TABLE `__backup_location_tags` AS SELECT * FROM `location_tags`;--> statement-breakpoint
CREATE TABLE `__backup_user_location_favorites` AS SELECT * FROM `user_location_favorites`;--> statement-breakpoint
CREATE TABLE `__backup_teams` AS SELECT * FROM `teams`;--> statement-breakpoint
CREATE TABLE `__backup_team_tags` AS SELECT * FROM `team_tags`;--> statement-breakpoint
CREATE TABLE `__backup_team_join_requests` AS SELECT * FROM `team_join_requests`;--> statement-breakpoint
CREATE TABLE `__backup_team_members` AS SELECT * FROM `team_members`;--> statement-breakpoint
CREATE TABLE `__backup_stories` AS SELECT * FROM `stories`;--> statement-breakpoint
CREATE TABLE `__backup_story_tags` AS SELECT * FROM `story_tags`;--> statement-breakpoint
CREATE TABLE `__backup_story_likes` AS SELECT * FROM `story_likes`;--> statement-breakpoint
CREATE TABLE `__backup_user_story_favorites` AS SELECT * FROM `user_story_favorites`;--> statement-breakpoint
CREATE TABLE `__backup_conversations` AS SELECT * FROM `conversations`;--> statement-breakpoint
CREATE TABLE `__backup_messages` AS SELECT * FROM `messages`;--> statement-breakpoint
DELETE FROM `conversations`;--> statement-breakpoint
DELETE FROM `stories`;--> statement-breakpoint
DELETE FROM `teams`;--> statement-breakpoint
DELETE FROM `locations`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`region_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`supported_activity_types` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`subtitle` text,
	`description` text NOT NULL,
	`address` text,
	`latitude` real,
	`longitude` real,
	`cover_image_url` text,
	`images` text DEFAULT '[]' NOT NULL,
	`extra` text DEFAULT '{}' NOT NULL,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`region_id`) REFERENCES `region`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "locations_supported_activity_types_json_check" CHECK(json_valid("__new_locations"."supported_activity_types") and json_type("__new_locations"."supported_activity_types") = 'array'),
	CONSTRAINT "locations_status_check" CHECK("__new_locations"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "locations_latitude_check" CHECK("__new_locations"."latitude" is null or "__new_locations"."latitude" between -90 and 90),
	CONSTRAINT "locations_longitude_check" CHECK("__new_locations"."longitude" is null or "__new_locations"."longitude" between -180 and 180),
	CONSTRAINT "locations_images_json_check" CHECK(json_valid("__new_locations"."images") and json_type("__new_locations"."images") = 'array'),
	CONSTRAINT "locations_extra_json_check" CHECK(json_valid("__new_locations"."extra") and json_type("__new_locations"."extra") = 'object')
);
--> statement-breakpoint
INSERT INTO `__new_locations`("id", "region_id", "name", "slug", "supported_activity_types", "status", "subtitle", "description", "address", "latitude", "longitude", "cover_image_url", "images", "extra", "created_by_user_id", "created_at", "updated_at") SELECT "id", "region_id", "name", "slug", "supported_activity_types", "status", "subtitle", "description", "address", "latitude", "longitude", "cover_image_url", "images", "extra", "created_by_user_id", "created_at", "updated_at" FROM `locations`;--> statement-breakpoint
DROP TABLE `locations`;--> statement-breakpoint
ALTER TABLE `__new_locations` RENAME TO `locations`;--> statement-breakpoint
CREATE UNIQUE INDEX `locations_region_slug_unique` ON `locations` (`region_id`,`slug`);--> statement-breakpoint
CREATE INDEX `locations_region_feed_idx` ON `locations` (`region_id`,`status`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `__new_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`leader_id` text NOT NULL,
	`activity_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`max_participants` integer DEFAULT 9 NOT NULL,
	`requirements` text DEFAULT '[]' NOT NULL,
	`recruitment_status` text DEFAULT 'open' NOT NULL,
	`formed_at` integer,
	`cancelled_at` integer,
	`checklist` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "teams_time_range_check" CHECK("__new_teams"."end_at" >= "__new_teams"."start_at"),
	CONSTRAINT "teams_capacity_check" CHECK("__new_teams"."max_participants" between 1 and 49),
	CONSTRAINT "teams_requirements_json_check" CHECK(json_valid("__new_teams"."requirements") and json_type("__new_teams"."requirements") = 'array'),
	CONSTRAINT "teams_recruitment_status_check" CHECK("__new_teams"."recruitment_status" in ('open', 'closed')),
	CONSTRAINT "teams_checklist_json_check" CHECK("__new_teams"."checklist" is null or (json_valid("__new_teams"."checklist") and json_type("__new_teams"."checklist") = 'object'))
);
--> statement-breakpoint
INSERT INTO `__new_teams`("id", "location_id", "leader_id", "activity_type", "title", "description", "start_at", "end_at", "max_participants", "requirements", "recruitment_status", "formed_at", "cancelled_at", "checklist", "created_at", "updated_at") SELECT "id", "location_id", "leader_id", "activity_type", "title", "description", "start_at", "end_at", "max_participants", "requirements", "recruitment_status", "formed_at", "cancelled_at", "checklist", "created_at", "updated_at" FROM `teams`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
CREATE INDEX `teams_location_start_idx` ON `teams` (`location_id`,`start_at`,`id`);--> statement-breakpoint
CREATE INDEX `teams_location_activity_feed_idx` ON `teams` (`location_id`,`activity_type`,`recruitment_status`,`start_at`,`id`);--> statement-breakpoint
CREATE INDEX `teams_leader_created_idx` ON `teams` (`leader_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `teams_end_idx` ON `teams` (`cancelled_at`,`end_at`,`id`);--> statement-breakpoint
INSERT INTO `locations` SELECT * FROM `__backup_locations`;--> statement-breakpoint
INSERT INTO `teams` SELECT * FROM `__backup_teams`;--> statement-breakpoint
INSERT INTO `location_tags` SELECT * FROM `__backup_location_tags`;--> statement-breakpoint
INSERT INTO `user_location_favorites` SELECT * FROM `__backup_user_location_favorites`;--> statement-breakpoint
INSERT INTO `team_tags` SELECT * FROM `__backup_team_tags`;--> statement-breakpoint
INSERT INTO `team_join_requests` SELECT * FROM `__backup_team_join_requests`;--> statement-breakpoint
INSERT INTO `team_members` SELECT * FROM `__backup_team_members`;--> statement-breakpoint
INSERT INTO `stories` SELECT * FROM `__backup_stories`;--> statement-breakpoint
INSERT INTO `story_tags` SELECT * FROM `__backup_story_tags`;--> statement-breakpoint
INSERT INTO `story_likes` SELECT * FROM `__backup_story_likes`;--> statement-breakpoint
INSERT INTO `user_story_favorites` SELECT * FROM `__backup_user_story_favorites`;--> statement-breakpoint
INSERT INTO `conversations` SELECT * FROM `__backup_conversations`;--> statement-breakpoint
INSERT INTO `messages` SELECT * FROM `__backup_messages`;--> statement-breakpoint
DROP TABLE `__backup_location_tags`;--> statement-breakpoint
DROP TABLE `__backup_locations`;--> statement-breakpoint
DROP TABLE `__backup_user_location_favorites`;--> statement-breakpoint
DROP TABLE `__backup_teams`;--> statement-breakpoint
DROP TABLE `__backup_team_tags`;--> statement-breakpoint
DROP TABLE `__backup_team_join_requests`;--> statement-breakpoint
DROP TABLE `__backup_team_members`;--> statement-breakpoint
DROP TABLE `__backup_stories`;--> statement-breakpoint
DROP TABLE `__backup_story_tags`;--> statement-breakpoint
DROP TABLE `__backup_story_likes`;--> statement-breakpoint
DROP TABLE `__backup_user_story_favorites`;--> statement-breakpoint
DROP TABLE `__backup_conversations`;--> statement-breakpoint
DROP TABLE `__backup_messages`;--> statement-breakpoint
CREATE TRIGGER `team_members_capacity_validate_insert`
BEFORE INSERT ON `team_members`
WHEN NEW.`left_at` IS NULL
BEGIN
	SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED')
	WHERE (
		SELECT COUNT(*) FROM `team_members`
		WHERE `team_id` = NEW.`team_id` AND `left_at` IS NULL
	) >= (
		SELECT `max_participants` FROM `teams` WHERE `id` = NEW.`team_id`
	);
END;--> statement-breakpoint
CREATE TRIGGER `team_members_capacity_validate_reactivate`
BEFORE UPDATE OF `left_at` ON `team_members`
WHEN OLD.`left_at` IS NOT NULL AND NEW.`left_at` IS NULL
BEGIN
	SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED')
	WHERE (
		SELECT COUNT(*) FROM `team_members`
		WHERE `team_id` = NEW.`team_id` AND `left_at` IS NULL
	) >= (
		SELECT `max_participants` FROM `teams` WHERE `id` = NEW.`team_id`
	);
END;--> statement-breakpoint
CREATE TRIGGER `team_members_leader_validate_insert`
BEFORE INSERT ON `team_members`
WHEN `NEW`.`left_at` IS NULL
	AND EXISTS (
		SELECT 1 FROM `teams`
		WHERE `teams`.`id` = `NEW`.`team_id`
			AND `teams`.`leader_id` = `NEW`.`user_id`
	)
BEGIN
	SELECT RAISE(ABORT, 'TEAM_LEADER_MEMBER_CONFLICT');
END;--> statement-breakpoint
CREATE TRIGGER `team_members_leader_validate_reactivate`
BEFORE UPDATE OF `team_id`, `user_id`, `left_at` ON `team_members`
WHEN `NEW`.`left_at` IS NULL
	AND EXISTS (
		SELECT 1 FROM `teams`
		WHERE `teams`.`id` = `NEW`.`team_id`
			AND `teams`.`leader_id` = `NEW`.`user_id`
	)
BEGIN
	SELECT RAISE(ABORT, 'TEAM_LEADER_MEMBER_CONFLICT');
END;--> statement-breakpoint
CREATE TRIGGER `teams_capacity_validate_update`
BEFORE UPDATE OF `max_participants` ON `teams`
WHEN NEW.`max_participants` < (
	SELECT COUNT(*) FROM `team_members`
	WHERE `team_id` = NEW.`id` AND `left_at` IS NULL
)
BEGIN
	SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED');
END;--> statement-breakpoint
CREATE TRIGGER `teams_leader_validate_update`
BEFORE UPDATE OF `leader_id` ON `teams`
WHEN EXISTS (
	SELECT 1 FROM `team_members`
	WHERE `team_members`.`team_id` = `NEW`.`id`
		AND `team_members`.`user_id` = `NEW`.`leader_id`
		AND `team_members`.`left_at` IS NULL
)
BEGIN
	SELECT RAISE(ABORT, 'TEAM_LEADER_MEMBER_CONFLICT');
END;--> statement-breakpoint
CREATE TRIGGER `story_likes_count_after_insert`
AFTER INSERT ON `story_likes`
BEGIN
	UPDATE `stories` SET `like_count` = `like_count` + 1 WHERE `id` = NEW.`story_id`;
	SELECT RAISE(ABORT, 'STORY_LIKE_COUNT_FAILED') WHERE changes() <> 1;
END;--> statement-breakpoint
CREATE TRIGGER `story_likes_count_after_delete`
AFTER DELETE ON `story_likes`
BEGIN
	UPDATE `stories` SET `like_count` = max(0, `like_count` - 1) WHERE `id` = OLD.`story_id`;
END;--> statement-breakpoint
CREATE TRIGGER `messages_summary_after_insert`
AFTER INSERT ON `messages`
BEGIN
	UPDATE `conversations`
	SET `last_message_preview` = substr(NEW.`content`, 1, 100),
		`last_message_at` = NEW.`created_at`,
		`updated_at` = NEW.`created_at`
	WHERE `id` = NEW.`conversation_id`;
	SELECT RAISE(ABORT, 'MESSAGE_SUMMARY_FAILED') WHERE changes() <> 1;
END;--> statement-breakpoint
PRAGMA foreign_keys=ON;
