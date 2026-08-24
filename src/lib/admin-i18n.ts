import {
  isAdminErrorReason,
  type AdminErrorReason,
} from "@/contracts/admin-i18n";
import type {
  LocationStatus,
  Season,
  UserRole,
  UserStatus,
} from "@/contracts/enums";
import type { TranslationKey } from "@/i18n/types";

const USER_ROLE_KEY = {
  user: "enums.userRole.user",
  admin: "enums.userRole.admin",
} satisfies Record<UserRole, TranslationKey>;

const USER_STATUS_KEY = {
  active: "enums.userStatus.active",
  suspended: "enums.userStatus.suspended",
  banned: "enums.userStatus.banned",
  deleted: "enums.userStatus.deleted",
} satisfies Record<UserStatus, TranslationKey>;

const LOCATION_STATUS_KEY = {
  draft: "enums.locationStatus.draft",
  published: "enums.locationStatus.published",
  archived: "enums.locationStatus.archived",
} satisfies Record<LocationStatus, TranslationKey>;

const SEASON_KEY = {
  spring: "enums.season.spring",
  summer: "enums.season.summer",
  autumn: "enums.season.autumn",
  winter: "enums.season.winter",
} satisfies Record<Season, TranslationKey>;

const ADMIN_ERROR_KEY = {
  admin_self_role_change: "admin.errors.adminSelfRoleChange",
  admin_last_active_revoke: "admin.errors.adminLastActiveRevoke",
  tag_already_exists: "admin.errors.tagAlreadyExists",
  tag_update_conflict: "admin.errors.tagUpdateConflict",
  location_changed_concurrently: "admin.errors.locationChangedConcurrently",
  location_has_references: "admin.errors.locationHasReferences",
  location_invalid_region: "admin.errors.locationInvalidRegion",
  location_image_host_disallowed: "admin.errors.locationImageHostDisallowed",
} satisfies Record<AdminErrorReason, TranslationKey>;

export function userRoleKey(role: UserRole): TranslationKey {
  return USER_ROLE_KEY[role];
}

export function userStatusKey(status: UserStatus): TranslationKey {
  return USER_STATUS_KEY[status];
}

export function locationStatusKey(status: LocationStatus): TranslationKey {
  return LOCATION_STATUS_KEY[status];
}

export function seasonKey(season: Season): TranslationKey {
  return SEASON_KEY[season];
}

export function readAdminErrorReason(
  payload: unknown,
): AdminErrorReason | null {
  if (!payload || typeof payload !== "object") return null;

  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;

  const details = (error as { details?: unknown }).details;
  if (!details || typeof details !== "object") return null;

  const reason = (details as { reason?: unknown }).reason;
  return isAdminErrorReason(reason) ? reason : null;
}

export function adminActionErrorKey(payload: unknown): TranslationKey | null {
  const reason = readAdminErrorReason(payload);
  return reason ? ADMIN_ERROR_KEY[reason] : null;
}

class AdminLocalizedError extends Error {}

export async function adminJsonOrThrow<T>(
  response: Response,
  translate: (key: TranslationKey) => string,
  fallbackKey: TranslationKey,
): Promise<T> {
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || payload === null) {
    throw new AdminLocalizedError(
      translate(adminActionErrorKey(payload) ?? fallbackKey),
    );
  }
  return payload as T;
}

export function adminCatchMessage(
  cause: unknown,
  translate: (key: TranslationKey) => string,
  fallbackKey: TranslationKey,
): string {
  return cause instanceof AdminLocalizedError
    ? cause.message
    : translate(fallbackKey);
}
