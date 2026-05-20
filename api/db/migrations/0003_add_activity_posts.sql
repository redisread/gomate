CREATE TABLE `activity_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`location_id` text,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`images` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_posts_team_idx` ON `activity_posts` (`team_id`);--> statement-breakpoint
CREATE INDEX `activity_posts_location_idx` ON `activity_posts` (`location_id`);--> statement-breakpoint
CREATE INDEX `activity_posts_author_idx` ON `activity_posts` (`author_id`);--> statement-breakpoint
CREATE INDEX `activity_posts_status_idx` ON `activity_posts` (`status`);--> statement-breakpoint
CREATE INDEX `activity_posts_created_at_idx` ON `activity_posts` (`created_at`);
