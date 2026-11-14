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
CREATE TRIGGER media_users_reference_insert
BEFORE INSERT ON users
WHEN EXISTS (
 SELECT 1 FROM media_objects AS media, (SELECT NEW.image AS value) AS reference
 WHERE reference.value IS NOT NULL AND (
 (media.state IN ('writing','deleting','done','blocked') AND (reference.value = media.key OR reference.value = media.url OR
    substr(reference.value, -length(media.key)-1) = '/' || media.key))
 OR (
    (reference.value GLOB '*[?#%]*' OR reference.value LIKE '%/../%' OR
      reference.value LIKE '%/./%' OR instr(reference.value, char(92)) > 0 OR
      instr(CAST(reference.value AS BLOB), x'00') > 0 OR
      reference.value GLOB ('*[' || char(1) || '-' || char(32) || ']*'))
    AND NOT EXISTS (
      SELECT 1 FROM (SELECT lower(substr(substr(reference.value, instr(reference.value, '://') + 3), 1, instr(substr(reference.value, instr(reference.value, '://') + 3), '/') - 1)) AS external_host,
        lower(substr(substr(media.url, instr(media.url, '://') + 3), 1, instr(substr(media.url, instr(media.url, '://') + 3), '/') - 1)) AS managed_authority)
      WHERE substr(reference.value, 1, 8) = 'https://'
        AND external_host != '' AND external_host NOT GLOB '*[^a-z0-9.-]*'
        AND external_host != substr(managed_authority, 1, instr(managed_authority || ':', ':') - 1)
        AND (external_host IN ('gomate.cos.jiahongw.com', 'cdn.discordapp.com', 'images.unsplash.com')
          OR external_host LIKE '%.githubusercontent.com'
          OR external_host LIKE '%.googleusercontent.com')
    )
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
 (media.state IN ('writing','deleting','done','blocked') AND (reference.value = media.key OR reference.value = media.url OR
    substr(reference.value, -length(media.key)-1) = '/' || media.key))
 OR (
    (reference.value GLOB '*[?#%]*' OR reference.value LIKE '%/../%' OR
      reference.value LIKE '%/./%' OR instr(reference.value, char(92)) > 0 OR
      instr(CAST(reference.value AS BLOB), x'00') > 0 OR
      reference.value GLOB ('*[' || char(1) || '-' || char(32) || ']*'))
    AND NOT EXISTS (
      SELECT 1 FROM (SELECT lower(substr(substr(reference.value, instr(reference.value, '://') + 3), 1, instr(substr(reference.value, instr(reference.value, '://') + 3), '/') - 1)) AS external_host,
        lower(substr(substr(media.url, instr(media.url, '://') + 3), 1, instr(substr(media.url, instr(media.url, '://') + 3), '/') - 1)) AS managed_authority)
      WHERE substr(reference.value, 1, 8) = 'https://'
        AND external_host != '' AND external_host NOT GLOB '*[^a-z0-9.-]*'
        AND external_host != substr(managed_authority, 1, instr(managed_authority || ':', ':') - 1)
        AND (external_host IN ('gomate.cos.jiahongw.com', 'cdn.discordapp.com', 'images.unsplash.com')
          OR external_host LIKE '%.githubusercontent.com'
          OR external_host LIKE '%.googleusercontent.com')
    )
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
 (media.state IN ('writing','deleting','done','blocked') AND (reference.value = media.key OR reference.value = media.url OR
    substr(reference.value, -length(media.key)-1) = '/' || media.key))
 OR (
    (reference.value GLOB '*[?#%]*' OR reference.value LIKE '%/../%' OR
      reference.value LIKE '%/./%' OR instr(reference.value, char(92)) > 0 OR
      instr(CAST(reference.value AS BLOB), x'00') > 0 OR
      reference.value GLOB ('*[' || char(1) || '-' || char(32) || ']*'))
    AND NOT EXISTS (
      SELECT 1 FROM (SELECT lower(substr(substr(reference.value, instr(reference.value, '://') + 3), 1, instr(substr(reference.value, instr(reference.value, '://') + 3), '/') - 1)) AS external_host,
        lower(substr(substr(media.url, instr(media.url, '://') + 3), 1, instr(substr(media.url, instr(media.url, '://') + 3), '/') - 1)) AS managed_authority)
      WHERE substr(reference.value, 1, 8) = 'https://'
        AND external_host != '' AND external_host NOT GLOB '*[^a-z0-9.-]*'
        AND external_host != substr(managed_authority, 1, instr(managed_authority || ':', ':') - 1)
        AND (external_host IN ('gomate.cos.jiahongw.com', 'cdn.discordapp.com', 'images.unsplash.com')
          OR external_host LIKE '%.githubusercontent.com'
          OR external_host LIKE '%.googleusercontent.com')
    )
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
 (media.state IN ('writing','deleting','done','blocked') AND (reference.value = media.key OR reference.value = media.url OR
    substr(reference.value, -length(media.key)-1) = '/' || media.key))
 OR (
    (reference.value GLOB '*[?#%]*' OR reference.value LIKE '%/../%' OR
      reference.value LIKE '%/./%' OR instr(reference.value, char(92)) > 0 OR
      instr(CAST(reference.value AS BLOB), x'00') > 0 OR
      reference.value GLOB ('*[' || char(1) || '-' || char(32) || ']*'))
    AND NOT EXISTS (
      SELECT 1 FROM (SELECT lower(substr(substr(reference.value, instr(reference.value, '://') + 3), 1, instr(substr(reference.value, instr(reference.value, '://') + 3), '/') - 1)) AS external_host,
        lower(substr(substr(media.url, instr(media.url, '://') + 3), 1, instr(substr(media.url, instr(media.url, '://') + 3), '/') - 1)) AS managed_authority)
      WHERE substr(reference.value, 1, 8) = 'https://'
        AND external_host != '' AND external_host NOT GLOB '*[^a-z0-9.-]*'
        AND external_host != substr(managed_authority, 1, instr(managed_authority || ':', ':') - 1)
        AND (external_host IN ('gomate.cos.jiahongw.com', 'cdn.discordapp.com', 'images.unsplash.com')
          OR external_host LIKE '%.githubusercontent.com'
          OR external_host LIKE '%.googleusercontent.com')
    )
  )
 )
)
BEGIN
 SELECT RAISE(ABORT, 'media_reference_unavailable');
END;
