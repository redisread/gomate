-- 初始数据库迁移 - GoMate 户外徒步平台

-- 创建地点表
CREATE TABLE IF NOT EXISTS `locations` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `name` TEXT NOT NULL,
    `slug` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `difficulty` TEXT NOT NULL,
    `duration` TEXT NOT NULL,
    `distance` TEXT NOT NULL,
    `best_season` TEXT NOT NULL,
    `cover_image` TEXT NOT NULL,
    `images` TEXT NOT NULL,
    `route_description` TEXT,
    `tips` TEXT,
    `equipment_needed` TEXT,
    `coordinates` TEXT NOT NULL,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL
);

-- 地点表索引
CREATE UNIQUE INDEX IF NOT EXISTS `locations_slug_unique` ON `locations` (`slug`);
CREATE UNIQUE INDEX IF NOT EXISTS `locations_slug_idx` ON `locations` (`slug`);
CREATE INDEX IF NOT EXISTS `locations_difficulty_idx` ON `locations` (`difficulty`);

-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `name` TEXT NOT NULL,
    `email` TEXT NOT NULL,
    `email_verified` INTEGER DEFAULT 0 NOT NULL,
    `image` TEXT,
    `bio` TEXT,
    `experience` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL
);

-- 用户表索引
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_idx` ON `users` (`email`);

-- 创建队伍表
CREATE TABLE IF NOT EXISTS `teams` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `location_id` TEXT NOT NULL,
    `leader_id` TEXT NOT NULL,
    `title` TEXT NOT NULL,
    `description` TEXT,
    `start_time` INTEGER NOT NULL,
    `end_time` INTEGER NOT NULL,
    `max_members` INTEGER DEFAULT 10 NOT NULL,
    `current_members` INTEGER DEFAULT 1 NOT NULL,
    `requirements` TEXT,
    `status` TEXT DEFAULT 'recruiting' NOT NULL,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 队伍表索引
CREATE INDEX IF NOT EXISTS `teams_location_idx` ON `teams` (`location_id`);
CREATE INDEX IF NOT EXISTS `teams_leader_idx` ON `teams` (`leader_id`);
CREATE INDEX IF NOT EXISTS `teams_status_idx` ON `teams` (`status`);
CREATE INDEX IF NOT EXISTS `teams_start_time_idx` ON `teams` (`start_time`);

-- 创建队伍成员表
CREATE TABLE IF NOT EXISTS `team_members` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `team_id` TEXT NOT NULL,
    `user_id` TEXT NOT NULL,
    `role` TEXT DEFAULT 'member' NOT NULL,
    `status` TEXT DEFAULT 'pending' NOT NULL,
    `joined_at` INTEGER,
    `created_at` INTEGER NOT NULL,
    FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 队伍成员表索引
CREATE INDEX IF NOT EXISTS `team_members_team_idx` ON `team_members` (`team_id`);
CREATE INDEX IF NOT EXISTS `team_members_user_idx` ON `team_members` (`user_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `team_members_team_user_idx` ON `team_members` (`team_id`,`user_id`);
