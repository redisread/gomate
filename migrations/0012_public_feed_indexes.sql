CREATE INDEX `locations_public_feed_idx` ON `locations` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `teams_start_feed_idx` ON `teams` (`start_at`,`id`);