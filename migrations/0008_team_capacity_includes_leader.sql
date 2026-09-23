DROP TRIGGER `team_members_capacity_validate_insert`;--> statement-breakpoint
DROP TRIGGER `team_members_capacity_validate_reactivate`;--> statement-breakpoint
DROP TRIGGER `teams_capacity_validate_update`;--> statement-breakpoint
UPDATE `teams`
SET `max_participants` = 1 + (
	SELECT COUNT(*) FROM `team_members`
	WHERE `team_id` = `teams`.`id` AND `left_at` IS NULL
)
WHERE `max_participants` < 49
	AND `max_participants` < 1 + (
		SELECT COUNT(*) FROM `team_members`
		WHERE `team_id` = `teams`.`id` AND `left_at` IS NULL
	);--> statement-breakpoint
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
END;--> statement-breakpoint
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
END;--> statement-breakpoint
CREATE TRIGGER `teams_capacity_validate_update`
BEFORE UPDATE OF `max_participants` ON `teams`
WHEN NEW.`max_participants` < 1 + (
	SELECT COUNT(*) FROM `team_members`
	WHERE `team_id` = NEW.`id` AND `left_at` IS NULL
)
BEGIN
	SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED');
END;
