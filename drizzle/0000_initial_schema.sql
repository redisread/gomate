-- ============================================
-- GoMate 初始数据库 Schema
-- 包含所有表的最终状态
-- ============================================

-- ============================================
-- 1. 认证系统表
-- ============================================

-- 用户表（Better Auth 扩展）
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);

-- 用户表索引
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE INDEX `users_email_idx` ON `users` (`email`);
CREATE INDEX `users_name_idx` ON `users` (`name`);

-- 会话表（Better Auth）
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 会话表索引
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);
CREATE INDEX `sessions_token_idx` ON `sessions` (`token`);

-- 第三方账号表（Better Auth）
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 账号表索引
CREATE UNIQUE INDEX `accounts_provider_idx` ON `accounts` (`provider_id`,`account_id`);
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);

-- 验证码表（Better Auth）
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- 验证码表索引
CREATE UNIQUE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);

-- ============================================
-- 2. 地点与路线表
-- ============================================

-- 城市表
CREATE TABLE `cities` (
	`id` text PRIMARY KEY NOT NULL,
	`adcode` text NOT NULL,
	`name` text NOT NULL,
	`pinyin` text,
	`province` text,
	`level` text,
	`is_hot` integer DEFAULT false NOT NULL,
	`parent_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- 城市表索引
CREATE UNIQUE INDEX `cities_adcode_idx` ON `cities` (`adcode`);
CREATE INDEX `cities_is_hot_idx` ON `cities` (`is_hot`);

-- 地点表
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE restrict
);

-- 地点表索引
CREATE UNIQUE INDEX `locations_slug_idx` ON `locations` (`slug`);
CREATE INDEX `locations_city_idx` ON `locations` (`city_id`);

-- 路线表
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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE restrict
);

-- 路线表索引
CREATE INDEX `routes_location_idx` ON `routes` (`location_id`);
CREATE INDEX `routes_city_idx` ON `routes` (`city_id`);
CREATE INDEX `routes_difficulty_idx` ON `routes` (`difficulty`);
CREATE INDEX `routes_duration_idx` ON `routes` (`duration_min`,`duration_max`);
CREATE INDEX `routes_distance_idx` ON `routes` (`distance`);
CREATE INDEX `routes_elevation_idx` ON `routes` (`elevation`);

-- ============================================
-- 3. 标签系统表
-- ============================================

-- 标签表
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- 标签表索引
CREATE UNIQUE INDEX `tags_name_idx` ON `tags` (`name`);
CREATE INDEX `tags_type_idx` ON `tags` (`type`);

-- 标签关联表
CREATE TABLE `entity_to_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 标签关联表索引
CREATE INDEX `entity_to_tags_entity_idx` ON `entity_to_tags` (`entity_id`,`entity_type`);
CREATE INDEX `entity_to_tags_tag_idx` ON `entity_to_tags` (`tag_id`);
CREATE UNIQUE INDEX `entity_to_tags_unique_idx` ON `entity_to_tags` (`entity_id`,`entity_type`,`tag_id`);

-- ============================================
-- 4. 队伍系统表
-- ============================================

-- 队伍表
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
	`icon` text DEFAULT '⛰️' NOT NULL,
	`status` text DEFAULT 'recruiting' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 队伍表索引
CREATE INDEX `teams_location_idx` ON `teams` (`location_id`);
CREATE INDEX `teams_route_idx` ON `teams` (`route_id`);
CREATE INDEX `teams_leader_idx` ON `teams` (`leader_id`);
CREATE INDEX `teams_status_idx` ON `teams` (`status`);
CREATE INDEX `teams_start_time_idx` ON `teams` (`start_time`);
CREATE INDEX `teams_status_created_at_idx` ON `teams` (`status`,`created_at`);
CREATE INDEX `teams_status_start_time_idx` ON `teams` (`status`,`start_time`);

-- 队伍成员表
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`joined_at` integer,
	`status_updated_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 队伍成员表索引
CREATE INDEX `team_members_team_idx` ON `team_members` (`team_id`);
CREATE INDEX `team_members_user_idx` ON `team_members` (`user_id`);
CREATE UNIQUE INDEX `team_members_team_user_idx` ON `team_members` (`team_id`,`user_id`);

-- ============================================
-- 5. POI 系统表
-- ============================================

-- POI 库表
CREATE TABLE `pois` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`coordinates` text NOT NULL,
	`category` text,
	`images` text,
	`extra` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- POI 表索引
CREATE INDEX `pois_name_idx` ON `pois` (`name`);
CREATE INDEX `pois_category_idx` ON `pois` (`category`);

-- 实体-POI 关联表
CREATE TABLE `entity_to_pois` (
	`id` text PRIMARY KEY NOT NULL,
	`poi_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`role_type` text NOT NULL,
	`order` integer,
	`role_specific_data` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`poi_id`) REFERENCES `pois`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 实体-POI 关联表索引
CREATE INDEX `entity_to_pois_poi_idx` ON `entity_to_pois` (`poi_id`);
CREATE INDEX `entity_to_pois_entity_idx` ON `entity_to_pois` (`entity_type`,`entity_id`);
CREATE INDEX `entity_to_pois_role_idx` ON `entity_to_pois` (`role_type`);
CREATE INDEX `entity_to_pois_order_idx` ON `entity_to_pois` (`entity_id`,`order`);
CREATE UNIQUE INDEX `entity_to_pois_unique_idx` ON `entity_to_pois` (`poi_id`,`entity_type`,`entity_id`,`role_type`);

-- ============================================
-- 6. 用户功能表
-- ============================================

-- 密码重置表
CREATE TABLE `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 密码重置表索引
CREATE UNIQUE INDEX `password_resets_token_unique` ON `password_resets` (`token`);
CREATE INDEX `password_resets_token_idx` ON `password_resets` (`token`);
CREATE INDEX `password_resets_user_idx` ON `password_resets` (`user_id`);
CREATE INDEX `password_resets_email_idx` ON `password_resets` (`email`);

-- 用户收藏表
CREATE TABLE `user_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 用户收藏表索引
CREATE INDEX `user_favorites_user_idx` ON `user_favorites` (`user_id`);
CREATE INDEX `user_favorites_entity_idx` ON `user_favorites` (`entity_type`,`entity_id`);
CREATE UNIQUE INDEX `user_favorites_unique_idx` ON `user_favorites` (`user_id`,`entity_type`,`entity_id`);
