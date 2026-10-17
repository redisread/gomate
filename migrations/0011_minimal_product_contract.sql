-- Contract phase: held from production until a reviewed release manifest enables it.
-- D1 keeps foreign keys enabled. Preserve core children before replacing teams;
-- deferred checks alone do not suppress ON DELETE CASCADE.
DROP TABLE `messages`;--> statement-breakpoint
DROP TABLE `conversations`;--> statement-breakpoint
DROP TABLE `story_likes`;--> statement-breakpoint
DROP TABLE `story_tags`;--> statement-breakpoint
DROP TABLE `user_story_favorites`;--> statement-breakpoint
DROP TABLE `stories`;--> statement-breakpoint
DROP TABLE `user_location_favorites`;--> statement-breakpoint
DROP TABLE `team_join_requests`;--> statement-breakpoint
DROP TRIGGER `team_members_capacity_validate_insert`;--> statement-breakpoint
DROP TRIGGER `team_members_capacity_validate_reactivate`;--> statement-breakpoint
DROP TRIGGER `teams_capacity_validate_update`;--> statement-breakpoint
DROP TRIGGER `team_members_leader_validate_insert`;--> statement-breakpoint
DROP TRIGGER `team_members_leader_validate_reactivate`;--> statement-breakpoint
DROP TRIGGER `teams_leader_validate_update`;--> statement-breakpoint
CREATE TABLE `__preserved_team_members` AS SELECT * FROM `team_members`;--> statement-breakpoint
DROP TABLE `team_members`;--> statement-breakpoint
CREATE TABLE `__preserved_team_tags` AS SELECT * FROM `team_tags`;--> statement-breakpoint
DROP TABLE `team_tags`;--> statement-breakpoint
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
	`meeting_point` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "teams_time_range_check" CHECK("__new_teams"."end_at" >= "__new_teams"."start_at"),
	CONSTRAINT "teams_capacity_check" CHECK("__new_teams"."max_participants" between 1 and 49),
	CONSTRAINT "teams_requirements_json_check" CHECK(json_valid("__new_teams"."requirements") and json_type("__new_teams"."requirements") = 'array'),
	CONSTRAINT "teams_recruitment_status_check" CHECK("__new_teams"."recruitment_status" in ('open', 'closed'))
);
--> statement-breakpoint
INSERT INTO `__new_teams`("id", "location_id", "leader_id", "activity_type", "title", "description", "start_at", "end_at", "max_participants", "requirements", "recruitment_status", "formed_at", "cancelled_at", "meeting_point", "created_at", "updated_at") SELECT "id", "location_id", "leader_id", "activity_type", "title", "description", "start_at", "end_at", "max_participants", "requirements", "recruitment_status", "formed_at", "cancelled_at", "meeting_point", "created_at", "updated_at" FROM `teams`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
CREATE INDEX `teams_location_start_idx` ON `teams` (`location_id`,`start_at`,`id`);--> statement-breakpoint
CREATE INDEX `teams_location_activity_feed_idx` ON `teams` (`location_id`,`activity_type`,`recruitment_status`,`start_at`,`id`);--> statement-breakpoint
CREATE INDEX `teams_leader_created_idx` ON `teams` (`leader_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `teams_end_idx` ON `teams` (`cancelled_at`,`end_at`,`id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members" (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`left_at` integer,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_members_active_idx` ON `team_members` (`team_id`,`left_at`,`joined_at`,`user_id`);
--> statement-breakpoint
CREATE INDEX `team_members_user_idx` ON `team_members` (`user_id`,`left_at`,`joined_at`,`team_id`);
--> statement-breakpoint
INSERT INTO `team_members` SELECT * FROM `__preserved_team_members`;--> statement-breakpoint
DROP TABLE `__preserved_team_members`;--> statement-breakpoint
CREATE TABLE `team_tags` (
	`team_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY (`team_id`, `tag_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_tags_tag_idx` ON `team_tags` (`tag_id`, `team_id`);
--> statement-breakpoint
INSERT INTO `team_tags` SELECT * FROM `__preserved_team_tags`;--> statement-breakpoint
DROP TABLE `__preserved_team_tags`;--> statement-breakpoint
CREATE TRIGGER `team_members_capacity_validate_insert`
BEFORE INSERT ON `team_members`
WHEN NEW.`left_at` IS NULL
BEGIN
	SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED')
	WHERE 1 + (
		SELECT COUNT(*) FROM `team_members`
		WHERE `team_id` = NEW.`team_id` AND `left_at` IS NULL
	) >= (
		SELECT `max_participants` FROM `teams` WHERE `id` = NEW.`team_id`
	);
END;
--> statement-breakpoint
CREATE TRIGGER `team_members_capacity_validate_reactivate`
BEFORE UPDATE OF `left_at` ON `team_members`
WHEN OLD.`left_at` IS NOT NULL AND NEW.`left_at` IS NULL
BEGIN
	SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED')
	WHERE 1 + (
		SELECT COUNT(*) FROM `team_members`
		WHERE `team_id` = NEW.`team_id` AND `left_at` IS NULL
	) >= (
		SELECT `max_participants` FROM `teams` WHERE `id` = NEW.`team_id`
	);
END;
--> statement-breakpoint
CREATE TRIGGER `teams_capacity_validate_update`
BEFORE UPDATE OF `max_participants` ON `teams`
WHEN NEW.`max_participants` < 1 + (
	SELECT COUNT(*) FROM `team_members`
	WHERE `team_id` = NEW.`id` AND `left_at` IS NULL
)
BEGIN
	SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED');
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
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
END;
--> statement-breakpoint
