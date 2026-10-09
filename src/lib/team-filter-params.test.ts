import { describe, expect, it } from "vitest";
import { parseTeamTagFilters } from "./team-filter-params";

describe("team filter URL parsing", () => {

  it("limits tag filters and rejects oversized values", () => {
    const tags = Array.from({ length: 25 }, (_, index) => `tag-${index}`).join(",");
    expect(parseTeamTagFilters(`${"x".repeat(65)},${tags}`)).toHaveLength(20);
  });
});
