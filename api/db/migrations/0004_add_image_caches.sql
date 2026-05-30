CREATE TABLE IF NOT EXISTS `image_caches` (
	`id` text PRIMARY KEY NOT NULL,
	`image_url` text NOT NULL,
	`base64_data` text NOT NULL,
	`content_type` text DEFAULT 'image/jpeg' NOT NULL,
	`size` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `image_caches_url_idx` ON `image_caches` (`image_url`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `image_caches_expires_idx` ON `image_caches` (`expires_at`);
