-- ============================================
-- 创建远程 D1 缺少的表
-- ============================================

-- 城市表
CREATE TABLE IF NOT EXISTS `cities` (
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
CREATE UNIQUE INDEX IF NOT EXISTS `cities_adcode_idx` ON `cities` (`adcode`);
CREATE INDEX IF NOT EXISTS `cities_is_hot_idx` ON `cities` (`is_hot`);

-- 路线表
CREATE TABLE IF NOT EXISTS `routes` (
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
CREATE INDEX IF NOT EXISTS `routes_location_idx` ON `routes` (`location_id`);
CREATE INDEX IF NOT EXISTS `routes_city_idx` ON `routes` (`city_id`);
CREATE INDEX IF NOT EXISTS `routes_difficulty_idx` ON `routes` (`difficulty`);
CREATE INDEX IF NOT EXISTS `routes_duration_idx` ON `routes` (`duration_min`,`duration_max`);
CREATE INDEX IF NOT EXISTS `routes_distance_idx` ON `routes` (`distance`);
CREATE INDEX IF NOT EXISTS `routes_elevation_idx` ON `routes` (`elevation`);

-- 标签表
CREATE TABLE IF NOT EXISTS `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- 标签表索引
CREATE UNIQUE INDEX IF NOT EXISTS `tags_name_idx` ON `tags` (`name`);
CREATE INDEX IF NOT EXISTS `tags_type_idx` ON `tags` (`type`);

-- 标签关联表
CREATE TABLE IF NOT EXISTS `entity_to_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 标签关联表索引
CREATE INDEX IF NOT EXISTS `entity_to_tags_entity_idx` ON `entity_to_tags` (`entity_id`,`entity_type`);
CREATE INDEX IF NOT EXISTS `entity_to_tags_tag_idx` ON `entity_to_tags` (`tag_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `entity_to_tags_unique_idx` ON `entity_to_tags` (`entity_id`,`entity_type`,`tag_id`);

-- POI 库表
CREATE TABLE IF NOT EXISTS `pois` (
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
CREATE INDEX IF NOT EXISTS `pois_name_idx` ON `pois` (`name`);
CREATE INDEX IF NOT EXISTS `pois_category_idx` ON `pois` (`category`);

-- 实体-POI 关联表
CREATE TABLE IF NOT EXISTS `entity_to_pois` (
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
CREATE INDEX IF NOT EXISTS `entity_to_pois_poi_idx` ON `entity_to_pois` (`poi_id`);
CREATE INDEX IF NOT EXISTS `entity_to_pois_entity_idx` ON `entity_to_pois` (`entity_type`,`entity_id`);
CREATE INDEX IF NOT EXISTS `entity_to_pois_role_idx` ON `entity_to_pois` (`role_type`);
CREATE INDEX IF NOT EXISTS `entity_to_pois_order_idx` ON `entity_to_pois` (`entity_id`,`order`);
CREATE UNIQUE INDEX IF NOT EXISTS `entity_to_pois_unique_idx` ON `entity_to_pois` (`poi_id`,`entity_type`,`entity_id`,`role_type`);

-- 用户收藏表
CREATE TABLE IF NOT EXISTS `user_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 用户收藏表索引
CREATE INDEX IF NOT EXISTS `user_favorites_user_idx` ON `user_favorites` (`user_id`);
CREATE INDEX IF NOT EXISTS `user_favorites_entity_idx` ON `user_favorites` (`entity_type`,`entity_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `user_favorites_unique_idx` ON `user_favorites` (`user_id`,`entity_type`,`entity_id`);
