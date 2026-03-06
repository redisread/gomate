-- 创建用户收藏表
CREATE TABLE `user_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 创建用户索引
CREATE INDEX `user_favorites_user_idx` ON `user_favorites` (`user_id`);

-- 创建实体索引
CREATE INDEX `user_favorites_entity_idx` ON `user_favorites` (`entity_type`, `entity_id`);

-- 创建联合唯一索引，防止重复收藏
CREATE UNIQUE INDEX `user_favorites_unique_idx` ON `user_favorites` (`user_id`, `entity_type`, `entity_id`);
