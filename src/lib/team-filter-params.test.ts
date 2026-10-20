import { describe, expect, it } from "vitest";
import { parseTeamTagFilters, parseTeamFilters, buildTeamListQuery } from "./team-filter-params";

describe("team filter URL parsing", () => {

  it("limits tag filters and rejects oversized values", () => {
    const tags = Array.from({ length: 25 }, (_, index) => `tag-${index}`).join(",");
    expect(parseTeamTagFilters(`${"x".repeat(65)},${tags}`)).toHaveLength(20);
  });
});

it("shares bounded URL filters and API query conversion", () => {
  const filters = parseTeamFilters(new URLSearchParams({ q: "x".repeat(140), regionId: "r".repeat(80), recruitmentStatus: "all", activityType: "invalid", tags: " a,a,b ", timeFilter: "invalid", startDate: "2026-10-21" }));
  expect(filters.searchQuery).toHaveLength(120);
  expect(filters.selectedRegionId).toHaveLength(64);
  expect(filters.selectedRecruitmentStatus).toBe("");
  expect(filters.selectedActivityType).toBe("");
  expect(filters.selectedTags).toEqual(["a", "b"]);
  const query = buildTeamListQuery(filters, "next");
  expect(query.get("recruitmentStatus")).toBeNull();
  expect(query.get("startDateFrom")).toBe("2026-10-21");
  expect(query.get("tagIds")).toBe("a,b");
  expect(query.get("cursor")).toBe("next");
  expect(parseTeamFilters(new URLSearchParams()).selectedRecruitmentStatus).toBe("open");
});
