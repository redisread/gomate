PRAGMA defer_foreign_keys = true;--> statement-breakpoint
DROP TRIGGER `teams_capacity_validate_update`;--> statement-breakpoint
DROP TRIGGER `teams_leader_validate_update`;--> statement-breakpoint
CREATE TABLE `__new_team_members` (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`left_at` integer,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_team_members`("team_id", "user_id", "joined_at", "left_at") SELECT "team_id", "user_id", "joined_at", "left_at" FROM `team_members`;--> statement-breakpoint
DROP TABLE `team_members`;--> statement-breakpoint
ALTER TABLE `__new_team_members` RENAME TO `team_members`;--> statement-breakpoint
CREATE INDEX `team_members_active_idx` ON `team_members` (`team_id`,`left_at`,`joined_at`,`user_id`);--> statement-breakpoint
CREATE INDEX `team_members_user_idx` ON `team_members` (`user_id`,`left_at`,`joined_at`,`team_id`);--> statement-breakpoint
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
END;
