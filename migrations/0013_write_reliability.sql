CREATE TABLE `media_objects` (
	`key` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`state` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "media_objects_state_check" CHECK("media_objects"."state" in ('writing','ready','deleting','done','blocked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_objects_url_unique` ON `media_objects` (`url`);--> statement-breakpoint
CREATE INDEX `media_objects_due_idx` ON `media_objects` (`state`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `team_create_requests` (
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`team_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `request_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `teams` ADD `version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
CREATE TRIGGER teams_revision_after_update
AFTER UPDATE ON teams
WHEN NEW.version = OLD.version
BEGIN
  UPDATE teams SET version = OLD.version + 1 WHERE id = NEW.id;
END;

--> statement-breakpoint
CREATE TRIGGER media_users_reference_insert
BEFORE INSERT ON users
WHEN EXISTS (
      SELECT 1 FROM media_objects AS media, (SELECT NEW.image AS value) AS reference
      WHERE reference.value IS NOT NULL AND (
        (media.state IN ('writing','deleting','done','blocked') AND (
          reference.value = media.key OR reference.value = media.url OR
          substr(reference.value, -length(media.key)-1) = '/' || media.key
        )) OR (
          lower(substr(reference.value, 1, length(media.url)-length(media.key))) =
            lower(substr(media.url, 1, length(media.url)-length(media.key)))
          AND (reference.value GLOB '*[?#%]*' OR reference.value LIKE '%/../%' OR reference.value LIKE '%/./%' OR instr(reference.value, char(92)) > 0)
        )
      )
    )
BEGIN
  SELECT RAISE(ABORT, 'media_reference_unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER media_users_reference_update
BEFORE UPDATE OF image ON users
WHEN EXISTS (
      SELECT 1 FROM media_objects AS media, (SELECT NEW.image AS value) AS reference
      WHERE reference.value IS NOT NULL AND (
        (media.state IN ('writing','deleting','done','blocked') AND (
          reference.value = media.key OR reference.value = media.url OR
          substr(reference.value, -length(media.key)-1) = '/' || media.key
        )) OR (
          lower(substr(reference.value, 1, length(media.url)-length(media.key))) =
            lower(substr(media.url, 1, length(media.url)-length(media.key)))
          AND (reference.value GLOB '*[?#%]*' OR reference.value LIKE '%/../%' OR reference.value LIKE '%/./%' OR instr(reference.value, char(92)) > 0)
        )
      )
    )
BEGIN
  SELECT RAISE(ABORT, 'media_reference_unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER media_locations_reference_insert
BEFORE INSERT ON locations
WHEN EXISTS (
      SELECT 1 FROM media_objects AS media, (SELECT NEW.cover_image_url AS value UNION ALL SELECT value FROM json_each(NEW.images)) AS reference
      WHERE reference.value IS NOT NULL AND (
        (media.state IN ('writing','deleting','done','blocked') AND (
          reference.value = media.key OR reference.value = media.url OR
          substr(reference.value, -length(media.key)-1) = '/' || media.key
        )) OR (
          lower(substr(reference.value, 1, length(media.url)-length(media.key))) =
            lower(substr(media.url, 1, length(media.url)-length(media.key)))
          AND (reference.value GLOB '*[?#%]*' OR reference.value LIKE '%/../%' OR reference.value LIKE '%/./%' OR instr(reference.value, char(92)) > 0)
        )
      )
    )
BEGIN
  SELECT RAISE(ABORT, 'media_reference_unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER media_locations_reference_update
BEFORE UPDATE OF cover_image_url, images ON locations
WHEN EXISTS (
      SELECT 1 FROM media_objects AS media, (SELECT NEW.cover_image_url AS value UNION ALL SELECT value FROM json_each(NEW.images)) AS reference
      WHERE reference.value IS NOT NULL AND (
        (media.state IN ('writing','deleting','done','blocked') AND (
          reference.value = media.key OR reference.value = media.url OR
          substr(reference.value, -length(media.key)-1) = '/' || media.key
        )) OR (
          lower(substr(reference.value, 1, length(media.url)-length(media.key))) =
            lower(substr(media.url, 1, length(media.url)-length(media.key)))
          AND (reference.value GLOB '*[?#%]*' OR reference.value LIKE '%/../%' OR reference.value LIKE '%/./%' OR instr(reference.value, char(92)) > 0)
        )
      )
    )
BEGIN
  SELECT RAISE(ABORT, 'media_reference_unavailable');
END;
