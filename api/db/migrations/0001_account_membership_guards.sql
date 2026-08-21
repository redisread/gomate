UPDATE `users`
SET `status` = 'deleted'
WHERE `deleted_at` IS NOT NULL AND `status` <> 'deleted';
--> statement-breakpoint
UPDATE `users`
SET `deleted_at` = CASE
	WHEN `updated_at` > (unixepoch() * 1000) THEN `updated_at`
	ELSE (unixepoch() * 1000)
END
WHERE `status` = 'deleted' AND `deleted_at` IS NULL;
--> statement-breakpoint
UPDATE `team_members`
SET `left_at` = CASE
	WHEN `joined_at` >= (unixepoch() * 1000) THEN `joined_at` + 1
	ELSE (unixepoch() * 1000)
END
WHERE `left_at` IS NULL
	AND EXISTS (
		SELECT 1 FROM `teams`
		WHERE `teams`.`id` = `team_members`.`team_id`
			AND `teams`.`leader_id` = `team_members`.`user_id`
	);
--> statement-breakpoint
CREATE TRIGGER `users_deleted_state_validate_insert`
BEFORE INSERT ON `users`
WHEN (`NEW`.`status` = 'deleted') <> (`NEW`.`deleted_at` IS NOT NULL)
BEGIN
	SELECT RAISE(ABORT, 'USER_DELETED_STATE_INVALID');
END;
--> statement-breakpoint
CREATE TRIGGER `users_deleted_state_validate_update`
BEFORE UPDATE OF `status`, `deleted_at` ON `users`
WHEN (`NEW`.`status` = 'deleted') <> (`NEW`.`deleted_at` IS NOT NULL)
BEGIN
	SELECT RAISE(ABORT, 'USER_DELETED_STATE_INVALID');
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
