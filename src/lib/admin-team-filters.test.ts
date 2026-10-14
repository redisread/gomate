import { describe, expect, it } from "vitest";
import {
  adminTeamFilterParams,
  readAdminTeamFilters,
} from "./admin-team-filters";

describe("administrator team URL filters", () => {
  it("restores literal searches and both independent status dimensions", () => {
    const filters = readAdminTeamFilters(
      new URLSearchParams(
        "q=%20领队%20&lifecycle=completed&recruitmentStatus=closed",
      ),
    );
    expect(filters).toEqual({
      q: "领队",
      lifecycle: "completed",
      recruitmentStatus: "closed",
    });
    expect(readAdminTeamFilters(adminTeamFilterParams(filters))).toEqual(
      filters,
    );
  });

  it("ignores unknown and inherited enum values from external URLs", () => {
    for (const value of ["invalid", "__proto__", "constructor", "toString"]) {
      expect(
        readAdminTeamFilters(
          new URLSearchParams({ lifecycle: value, recruitmentStatus: value }),
        ),
      ).toEqual({});
    }
  });

  it("bounds restored search text and excludes cursors from filter state", () => {
    const filters = readAdminTeamFilters(
      new URLSearchParams({ q: "a".repeat(110), cursor: "old", page: "2" }),
    );
    expect(filters).toEqual({ q: "a".repeat(100) });
    expect([...adminTeamFilterParams(filters).keys()]).toEqual(["q"]);
  });
});
