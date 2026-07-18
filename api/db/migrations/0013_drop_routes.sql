DELETE FROM `entity_to_tags` WHERE `entity_type` = 'route';--> statement-breakpoint
DELETE FROM `tags` WHERE `type` = 'route';--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_teams` (
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_teams`("id", "location_id", "leader_id", "title", "description", "start_time", "end_time", "duration_min", "max_members", "requirements", "icon", "status", "created_at", "updated_at") SELECT "id", "location_id", "leader_id", "title", "description", "start_time", "end_time", "duration_min", "max_members", "requirements", "icon", "status", "created_at", "updated_at" FROM `teams`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `teams_location_idx` ON `teams` (`location_id`);--> statement-breakpoint
CREATE INDEX `teams_leader_idx` ON `teams` (`leader_id`);--> statement-breakpoint
CREATE INDEX `teams_status_idx` ON `teams` (`status`);--> statement-breakpoint
CREATE INDEX `teams_start_time_idx` ON `teams` (`start_time`);--> statement-breakpoint
CREATE INDEX `teams_title_idx` ON `teams` (`title`);--> statement-breakpoint
CREATE INDEX `teams_status_created_at_idx` ON `teams` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `teams_status_start_time_idx` ON `teams` (`status`,`start_time`);--> statement-breakpoint
DROP TABLE `routes`;