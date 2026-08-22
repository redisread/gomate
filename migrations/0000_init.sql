CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`nickname` text,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT 0 NOT NULL,
	`image` text,
	`bio` text,
	`gender` text,
	`birthday` integer,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`extra` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `users_email_verified_check` CHECK (`email_verified` in (0, 1)),
	CONSTRAINT `users_gender_check` CHECK (`gender` is null or `gender` in ('male', 'female', 'other')),
	CONSTRAINT `users_role_check` CHECK (`role` in ('user', 'admin')),
	CONSTRAINT `users_status_check` CHECK (`status` in ('active', 'suspended', 'banned', 'deleted')),
	CONSTRAINT `users_extra_json_check` CHECK (json_valid(`extra`) and json_type(`extra`) = 'object')
);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE INDEX `users_status_created_idx` ON `users` (`status`, `created_at`, `id`);
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);
CREATE TRIGGER `sessions_active_user_insert_guard`
BEFORE INSERT ON `sessions`
WHEN NOT EXISTS (
	SELECT 1 FROM `users`
	WHERE `id` = NEW.`user_id`
		AND `status` = 'active'
		AND `deleted_at` IS NULL
)
BEGIN
	SELECT RAISE(ABORT, 'SESSION_USER_INACTIVE');
END;
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `accounts_provider_unique` ON `accounts` (`provider_id`, `account_id`);
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE UNIQUE INDEX `verifications_identifier_unique` ON `verifications` (`identifier`);
CREATE INDEX `verifications_expires_idx` ON `verifications` (`expires_at`);
CREATE TRIGGER `users_auth_revoke_after_inactive`
AFTER UPDATE OF `status`, `deleted_at` ON `users`
WHEN NEW.`status` <> 'active' OR NEW.`deleted_at` IS NOT NULL
BEGIN
	DELETE FROM `sessions` WHERE `user_id` = NEW.`id`;
	DELETE FROM `verifications`
	WHERE `identifier` = 'password-reset:' || NEW.`id`;
END;
CREATE TABLE `region` (
	`id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`name_en` text,
	`slug` text NOT NULL,
	`code` text,
	`level` text NOT NULL,
	`timezone` text,
	`center_latitude` real,
	`center_longitude` real,
	`service_enabled` integer DEFAULT 0 NOT NULL,
	`is_hot` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `region` (`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `region_country_code_check` CHECK (length(`country_code`) = 2 and `country_code` = upper(`country_code`)),
	CONSTRAINT `region_parent_not_self_check` CHECK (`id` <> `parent_id`),
	CONSTRAINT `region_level_check` CHECK (`level` in ('province', 'city', 'district', 'other')),
	CONSTRAINT `region_center_latitude_check` CHECK (`center_latitude` is null or `center_latitude` between -90 and 90),
	CONSTRAINT `region_center_longitude_check` CHECK (`center_longitude` is null or `center_longitude` between -180 and 180),
	CONSTRAINT `region_service_enabled_check` CHECK (`service_enabled` in (0, 1)),
	CONSTRAINT `region_is_hot_check` CHECK (`is_hot` in (0, 1)),
	CONSTRAINT `region_service_shape_check` CHECK (`service_enabled` = 0 or (`level` = 'city' and `timezone` is not null and `center_latitude` is not null and `center_longitude` is not null))
);
CREATE UNIQUE INDEX `region_country_slug_unique` ON `region` (`country_code`, `slug`);
CREATE UNIQUE INDEX `region_country_code_unique` ON `region` (`country_code`, `code`) WHERE `code` is not null;
CREATE INDEX `region_hierarchy_idx` ON `region` (`country_code`, `parent_id`, `level`, `sort_order`);
CREATE INDEX `region_service_picker_idx` ON `region` (`country_code`, `service_enabled`, `is_hot`, `sort_order`, `id`);
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`region_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`supported_activity_types` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`subtitle` text,
	`description` text NOT NULL,
	`address` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`cover_image_url` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`extra` text DEFAULT '{}' NOT NULL,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`region_id`) REFERENCES `region` (`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `locations_supported_activity_types_json_check` CHECK (json_valid(`supported_activity_types`) and json_type(`supported_activity_types`) = 'array'),
	CONSTRAINT `locations_status_check` CHECK (`status` in ('draft', 'published', 'archived')),
	CONSTRAINT `locations_latitude_check` CHECK (`latitude` between -90 and 90),
	CONSTRAINT `locations_longitude_check` CHECK (`longitude` between -180 and 180),
	CONSTRAINT `locations_images_json_check` CHECK (json_valid(`images`) and json_type(`images`) = 'array'),
	CONSTRAINT `locations_extra_json_check` CHECK (json_valid(`extra`) and json_type(`extra`) = 'object'),
	CONSTRAINT `locations_published_activity_check` CHECK (`status` <> 'published' or json_array_length(`supported_activity_types`) > 0)
);
CREATE UNIQUE INDEX `locations_region_slug_unique` ON `locations` (`region_id`, `slug`);
CREATE INDEX `locations_region_feed_idx` ON `locations` (`region_id`, `status`, `created_at`, `id`);
CREATE TABLE `teams` (
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
	FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`leader_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `teams_activity_type_check` CHECK (`activity_type` in ('hiking', 'explore', 'leisure', 'travel')),
	CONSTRAINT `teams_time_range_check` CHECK (`end_at` >= `start_at`),
	CONSTRAINT `teams_capacity_check` CHECK (`max_participants` between 1 and 49),
	CONSTRAINT `teams_requirements_json_check` CHECK (json_valid(`requirements`) and json_type(`requirements`) = 'array'),
	CONSTRAINT `teams_recruitment_status_check` CHECK (`recruitment_status` in ('open', 'closed')),
	CONSTRAINT `teams_checklist_json_check` CHECK (`checklist` is null or (json_valid(`checklist`) and json_type(`checklist`) = 'object'))
);
CREATE INDEX `teams_location_start_idx` ON `teams` (`location_id`, `start_at`, `id`);
CREATE INDEX `teams_location_activity_feed_idx` ON `teams` (`location_id`, `activity_type`, `recruitment_status`, `start_at`, `id`);
CREATE INDEX `teams_leader_created_idx` ON `teams` (`leader_id`, `created_at`, `id`);
CREATE INDEX `teams_end_idx` ON `teams` (`cancelled_at`, `end_at`, `id`);
CREATE TABLE `team_join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message` text,
	`decided_by_user_id` text,
	`decided_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decided_by_user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `team_join_requests_status_check` CHECK (`status` in ('pending', 'approved', 'rejected', 'cancelled')),
	CONSTRAINT `team_join_requests_decision_check` CHECK (
		(`status` = 'pending' and `decided_at` is null and `decided_by_user_id` is null)
		or (`status` in ('approved', 'rejected') and `decided_at` is not null and `decided_by_user_id` is not null)
		or (`status` = 'cancelled' and `decided_at` is not null)
	)
);
CREATE UNIQUE INDEX `team_join_requests_one_pending_unique` ON `team_join_requests` (`team_id`, `user_id`) WHERE `status` = 'pending';
CREATE INDEX `team_join_requests_team_status_idx` ON `team_join_requests` (`team_id`, `status`, `created_at`, `id`);
CREATE INDEX `team_join_requests_user_created_idx` ON `team_join_requests` (`user_id`, `created_at`, `id`);
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`team_id` text,
	`location_id` text,
	`title` text,
	`summary` text,
	`content` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `stories_content_check` CHECK (length(trim(`content`)) > 0),
	CONSTRAINT `stories_images_json_check` CHECK (json_valid(`images`) and json_type(`images`) = 'array'),
	CONSTRAINT `stories_status_check` CHECK (`status` in ('draft', 'published', 'hidden')),
	CONSTRAINT `stories_view_count_check` CHECK (`view_count` >= 0),
	CONSTRAINT `stories_like_count_check` CHECK (`like_count` >= 0),
	CONSTRAINT `stories_normal_title_check` CHECK (`team_id` is not null or (`title` is not null and length(trim(`title`)) > 0))
);
CREATE INDEX `stories_feed_idx` ON `stories` (`status`, `created_at`, `id`);
CREATE INDEX `stories_author_idx` ON `stories` (`author_id`, `created_at`, `id`);
CREATE INDEX `stories_team_feed_idx` ON `stories` (`team_id`, `status`, `created_at`, `id`);
CREATE INDEX `stories_location_feed_idx` ON `stories` (`location_id`, `status`, `created_at`, `id`);
CREATE TABLE `location_tags` (
	`location_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY (`location_id`, `tag_id`),
	FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `location_tags_tag_idx` ON `location_tags` (`tag_id`, `location_id`);
CREATE TABLE `team_tags` (
	`team_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY (`team_id`, `tag_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `team_tags_tag_idx` ON `team_tags` (`tag_id`, `team_id`);
CREATE TABLE `story_tags` (
	`story_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY (`story_id`, `tag_id`),
	FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `story_tags_tag_idx` ON `story_tags` (`tag_id`, `story_id`);
CREATE TABLE `story_likes` (
	`user_id` text NOT NULL,
	`story_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY (`user_id`, `story_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `story_likes_story_idx` ON `story_likes` (`story_id`, `created_at`, `user_id`);
CREATE TABLE `user_location_favorites` (
	`user_id` text NOT NULL,
	`location_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY (`user_id`, `location_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `user_location_favorites_user_idx` ON `user_location_favorites` (`user_id`, `created_at`, `location_id`);
CREATE INDEX `user_location_favorites_location_idx` ON `user_location_favorites` (`location_id`, `created_at`, `user_id`);
CREATE TABLE `user_story_favorites` (
	`user_id` text NOT NULL,
	`story_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY (`user_id`, `story_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `user_story_favorites_user_idx` ON `user_story_favorites` (`user_id`, `created_at`, `story_id`);
CREATE INDEX `user_story_favorites_story_idx` ON `user_story_favorites` (`story_id`, `created_at`, `user_id`);
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`member_user_id` text NOT NULL,
	`initiated_by_user_id` text NOT NULL,
	`last_message_preview` text,
	`last_message_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`initiated_by_user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE restrict
);
CREATE UNIQUE INDEX `conversations_team_member_unique` ON `conversations` (`team_id`, `member_user_id`);
CREATE INDEX `conversations_member_inbox_idx` ON `conversations` (`member_user_id`, `last_message_at`, `id`);
CREATE INDEX `conversations_team_inbox_idx` ON `conversations` (`team_id`, `last_message_at`, `id`);
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`content` text NOT NULL,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `messages_content_check` CHECK (length(trim(`content`)) > 0)
);
CREATE INDEX `messages_conversation_cursor_idx` ON `messages` (`conversation_id`, `created_at`, `id`);
CREATE INDEX `messages_sender_idx` ON `messages` (`sender_id`, `created_at`, `id`);
CREATE TRIGGER `story_likes_count_after_insert`
AFTER INSERT ON `story_likes`
BEGIN
	UPDATE `stories` SET `like_count` = `like_count` + 1 WHERE `id` = NEW.`story_id`;
	SELECT RAISE(ABORT, 'STORY_LIKE_COUNT_FAILED') WHERE changes() <> 1;
END;
CREATE TRIGGER `story_likes_count_after_delete`
AFTER DELETE ON `story_likes`
BEGIN
	UPDATE `stories` SET `like_count` = max(0, `like_count` - 1) WHERE `id` = OLD.`story_id`;
END;
CREATE TRIGGER `messages_summary_after_insert`
AFTER INSERT ON `messages`
BEGIN
	UPDATE `conversations`
	SET `last_message_preview` = substr(NEW.`content`, 1, 100),
		`last_message_at` = NEW.`created_at`,
		`updated_at` = NEW.`created_at`
	WHERE `id` = NEW.`conversation_id`;
	SELECT RAISE(ABORT, 'MESSAGE_SUMMARY_FAILED') WHERE changes() <> 1;
END;
CREATE TRIGGER `users_deleted_state_validate_insert`
BEFORE INSERT ON `users`
WHEN (`NEW`.`status` = 'deleted') <> (`NEW`.`deleted_at` IS NOT NULL)
BEGIN
	SELECT RAISE(ABORT, 'USER_DELETED_STATE_INVALID');
END;
CREATE TRIGGER `users_deleted_state_validate_update`
BEFORE UPDATE OF `status`, `deleted_at` ON `users`
WHEN (`NEW`.`status` = 'deleted') <> (`NEW`.`deleted_at` IS NOT NULL)
BEGIN
	SELECT RAISE(ABORT, 'USER_DELETED_STATE_INVALID');
END;
CREATE TABLE IF NOT EXISTS "team_members" (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`left_at` integer,
	PRIMARY KEY(`team_id`, `user_id`),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `team_members_active_idx` ON `team_members` (`team_id`,`left_at`,`joined_at`,`user_id`);
CREATE INDEX `team_members_user_idx` ON `team_members` (`user_id`,`left_at`,`joined_at`,`team_id`);
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
END;
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
END;
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
CREATE TRIGGER `teams_capacity_validate_update`
BEFORE UPDATE OF `max_participants` ON `teams`
WHEN NEW.`max_participants` < (
	SELECT COUNT(*) FROM `team_members`
	WHERE `team_id` = NEW.`id` AND `left_at` IS NULL
)
BEGIN
	SELECT RAISE(ABORT, 'TEAM_CAPACITY_EXCEEDED');
END;
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
