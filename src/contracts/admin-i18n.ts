export const ADMIN_ERROR_REASONS = [
  "admin_self_role_change",
  "admin_last_active_revoke",
  "tag_already_exists",
  "tag_update_conflict",
  "location_changed_concurrently",
  "location_has_references",
  "location_invalid_region",
  "location_image_host_disallowed",
] as const;

export type AdminErrorReason = (typeof ADMIN_ERROR_REASONS)[number];

const ADMIN_ERROR_REASON_SET = new Set<string>(ADMIN_ERROR_REASONS);

export function isAdminErrorReason(value: unknown): value is AdminErrorReason {
  return typeof value === "string" && ADMIN_ERROR_REASON_SET.has(value);
}
