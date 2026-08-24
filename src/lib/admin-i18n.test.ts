import { describe, expect, it } from "vitest";

import {
  ADMIN_ERROR_REASONS,
  isAdminErrorReason,
} from "@/contracts/admin-i18n";
import { SEASONS } from "@/contracts/enums";
import {
  locationStatusKey,
  readAdminErrorReason,
  seasonKey,
  userRoleKey,
  userStatusKey,
} from "./admin-i18n";

describe("administrator i18n error contract", () => {
  it("recognizes every stable administrator error reason", () => {
    expect(ADMIN_ERROR_REASONS).toEqual([
      "admin_self_role_change",
      "admin_last_active_revoke",
      "tag_already_exists",
      "tag_update_conflict",
      "location_changed_concurrently",
      "location_has_references",
      "location_invalid_region",
      "location_image_host_disallowed",
    ]);

    for (const reason of ADMIN_ERROR_REASONS) {
      expect(isAdminErrorReason(reason)).toBe(true);
    }
  });

  it("rejects unknown and non-string reasons", () => {
    expect(isAdminErrorReason("server_message")).toBe(false);
    expect(isAdminErrorReason(null)).toBe(false);
    expect(isAdminErrorReason({})).toBe(false);
  });

  it("reads only a known reason from error details", () => {
    expect(readAdminErrorReason({
      error: {
        code: "CONFLICT",
        message: "Diagnostic message",
        details: { reason: "tag_update_conflict" },
      },
    })).toBe("tag_update_conflict");
  });

  it.each([
    null,
    { reason: "tag_update_conflict" },
    { error: "Diagnostic message" },
    { error: { message: "Diagnostic message" } },
    { error: { details: null } },
    { error: { details: { reason: "unknown_reason" } } },
    { error: { details: { reason: 1 } } },
  ])("does not expose message or malformed payload values: %j", (payload) => {
    expect(readAdminErrorReason(payload)).toBeNull();
  });
});

describe("administrator enum presentation keys", () => {
  it("maps user roles to shared enum keys", () => {
    expect(userRoleKey("user")).toBe("enums.userRole.user");
    expect(userRoleKey("admin")).toBe("enums.userRole.admin");
  });

  it("maps every user status to a shared enum key", () => {
    expect(userStatusKey("active")).toBe("enums.userStatus.active");
    expect(userStatusKey("suspended")).toBe("enums.userStatus.suspended");
    expect(userStatusKey("banned")).toBe("enums.userStatus.banned");
    expect(userStatusKey("deleted")).toBe("enums.userStatus.deleted");
  });

  it("maps every location status to a shared enum key", () => {
    expect(locationStatusKey("draft")).toBe("enums.locationStatus.draft");
    expect(locationStatusKey("published")).toBe("enums.locationStatus.published");
    expect(locationStatusKey("archived")).toBe("enums.locationStatus.archived");
  });

  it("maps every supported season to a shared enum key", () => {
    expect(SEASONS.map(seasonKey)).toEqual([
      "enums.season.spring",
      "enums.season.summer",
      "enums.season.autumn",
      "enums.season.winter",
    ]);
  });
});
