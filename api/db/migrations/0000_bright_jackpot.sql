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
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_idx` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `cities` (
	`id` text PRIMARY KEY NOT NULL,
	`adcode` text NOT NULL,
	`name` text NOT NULL,
	`pinyin` text,
	`province` text,
	`level` text,
	`is_hot` integer DEFAULT false NOT NULL,
	`parent_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cities_adcode_unique` ON `cities` (`adcode`);--> statement-breakpoint
CREATE UNIQUE INDEX `cities_adcode_idx` ON `cities` (`adcode`);--> statement-breakpoint
CREATE INDEX `cities_is_hot_idx` ON `cities` (`is_hot`);--> statement-breakpoint
CREATE TABLE `entity_to_pois` (
	`id` text PRIMARY KEY NOT NULL,
	`poi_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`role_type` text NOT NULL,
	`order` integer,
	`role_specific_data` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`poi_id`) REFERENCES `pois`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entity_to_pois_poi_idx` ON `entity_to_pois` (`poi_id`);--> statement-breakpoint
CREATE INDEX `entity_to_pois_entity_idx` ON `entity_to_pois` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `entity_to_pois_role_idx` ON `entity_to_pois` (`role_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `entity_to_pois_unique_idx` ON `entity_to_pois` (`poi_id`,`entity_type`,`entity_id`,`role_type`);--> statement-breakpoint
CREATE TABLE `entity_to_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entity_to_tags_entity_idx` ON `entity_to_tags` (`entity_id`,`entity_type`);--> statement-breakpoint
CREATE INDEX `entity_to_tags_tag_idx` ON `entity_to_tags` (`tag_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `entity_to_tags_unique_idx` ON `entity_to_tags` (`entity_id`,`entity_type`,`tag_id`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`type` text,
	`subtitle` text,
	`description` text NOT NULL,
	`address` text,
	`city_id` text NOT NULL,
	`city_name` text,
	`best_season` text NOT NULL,
	`cover_image` text NOT NULL,
	`images` text NOT NULL,
	`coordinates` text NOT NULL,
	`extra` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_slug_unique` ON `locations` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `locations_slug_idx` ON `locations` (`slug`);--> statement-breakpoint
CREATE INDEX `locations_city_idx` ON `locations` (`city_id`);--> statement-breakpoint
CREATE INDEX `locations_type_idx` ON `locations` (`type`);--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_resets_token_unique` ON `password_resets` (`token`);--> statement-breakpoint
CREATE INDEX `password_resets_token_idx` ON `password_resets` (`token`);--> statement-breakpoint
CREATE INDEX `password_resets_user_idx` ON `password_resets` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_resets_email_idx` ON `password_resets` (`email`);--> statement-breakpoint
CREATE TABLE `pois` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`coordinates` text NOT NULL,
	`category` text,
	`images` text,
	`extra` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pois_name_idx` ON `pois` (`name`);--> statement-breakpoint
CREATE INDEX `pois_category_idx` ON `pois` (`category`);--> statement-breakpoint
CREATE TABLE `routes` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`city_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`difficulty` text NOT NULL,
	`duration_min` integer NOT NULL,
	`duration_max` integer NOT NULL,
	`distance` real NOT NULL,
	`elevation` integer,
	`route_guide` text,
	`extra` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `routes_location_idx` ON `routes` (`location_id`);--> statement-breakpoint
CREATE INDEX `routes_city_idx` ON `routes` (`city_id`);--> statement-breakpoint
CREATE INDEX `routes_difficulty_idx` ON `routes` (`difficulty`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_token_idx` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_idx` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `tags_type_idx` ON `tags` (`type`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`joined_at` integer,
	`status_updated_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_members_team_idx` ON `team_members` (`team_id`);--> statement-breakpoint
CREATE INDEX `team_members_user_idx` ON `team_members` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_team_user_idx` ON `team_members` (`team_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`route_id` text,
	`leader_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`duration_min` integer DEFAULT 240 NOT NULL,
	`max_members` integer DEFAULT 10 NOT NULL,
	`requirements` text,
	`icon` text DEFAULT '⭿️' NOT NULL,
	`status` text DEFAULT 'recruiting' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `teams_location_idx` ON `teams` (`location_id`);--> statement-breakpoint
CREATE INDEX `teams_route_idx` ON `teams` (`route_id`);--> statement-breakpoint
CREATE INDEX `teams_leader_idx` ON `teams` (`leader_id`);--> statement-breakpoint
CREATE INDEX `teams_status_idx` ON `teams` (`status`);--> statement-breakpoint
CREATE INDEX `teams_start_time_idx` ON `teams` (`start_time`);--> statement-breakpoint
CREATE INDEX `teams_status_created_at_idx` ON `teams` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `teams_status_start_time_idx` ON `teams` (`status`,`start_time`);--> statement-breakpoint
CREATE TABLE `user_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_favorites_user_idx` ON `user_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_favorites_entity_idx` ON `user_favorites` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_favorites_unique_idx` ON `user_favorites` (`user_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`nickname` text,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`bio` text,
	`gender` text,
	`birthday` integer,
	`level` text DEFAULT 'beginner' NOT NULL,
	`completed_hikes` integer DEFAULT 0,
	`wechat` text,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`extra` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_name_idx` ON `users` (`name`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);