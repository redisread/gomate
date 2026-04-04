PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pois` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`coordinates` text NOT NULL,
	`category` text DEFAULT 'poi',
	`images` text,
	`extra` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_pois`("id", "name", "description", "coordinates", "category", "images", "extra", "created_at", "updated_at") SELECT "id", "name", "description", "coordinates", "category", "images", "extra", "created_at", "updated_at" FROM `pois`;--> statement-breakpoint
DROP TABLE `pois`;--> statement-breakpoint
ALTER TABLE `__new_pois` RENAME TO `pois`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `pois_name_idx` ON `pois` (`name`);--> statement-breakpoint
ALTER TABLE `team_members` ADD `extra` text;