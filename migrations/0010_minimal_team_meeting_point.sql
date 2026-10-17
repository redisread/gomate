ALTER TABLE `teams` ADD `meeting_point` text;
--> statement-breakpoint
UPDATE teams
SET meeting_point = nullif(trim(
  coalesce(json_extract(checklist, '$.meetingPoint.name'), '') ||
  CASE WHEN coalesce(json_extract(checklist, '$.meetingPoint.time'), '') <> ''
    THEN char(10) || json_extract(checklist, '$.meetingPoint.time') ELSE '' END ||
  CASE WHEN coalesce(json_extract(checklist, '$.meetingPoint.note'), '') <> ''
    THEN char(10) || json_extract(checklist, '$.meetingPoint.note') ELSE '' END
), '')
WHERE checklist IS NOT NULL AND json_valid(checklist)
  AND json_type(checklist, '$.meetingPoint') = 'object';
