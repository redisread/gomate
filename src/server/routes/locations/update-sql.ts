export function buildLocationUpdateSql(
  assignments: string[],
  activityTypeGuard: string,
) {
  return `
    UPDATE locations
    SET ${assignments.join(", ")}
    WHERE id = ?
      AND updated_at = ?
      AND cover_image_url IS ?
      AND images = ?
      AND region_id = ?
      AND supported_activity_types = ?
      AND status = ?
      AND latitude IS ?
      AND longitude IS ?
      AND EXISTS (
        SELECT 1
        FROM region AS target_region
        WHERE target_region.id = ?
          AND target_region.level = 'city'
          AND target_region.service_enabled = 1
      )
      ${activityTypeGuard}
  `;
}
