import { describe, expect, it } from "vitest";
import { parseTeamDifficultyFilters, parseTeamTagFilters } from "./team-filter-params";

describe("team filter URL parsing", () => {
  it("keeps only unique supported difficulty values", () => {
    expect(parseTeamDifficultyFilters("easy,unknown,easy,hard")).toEqual(["easy", "hard"]);
  });

  it("limits tag filters and rejects oversized values", () => {
    const tags = Array.from({ length: 25 }, (_, index) => `tag-${index}`).join(",");
    expect(parseTeamTagFilters(`${"x".repeat(65)},${tags}`)).toHaveLength(20);
  });
});
