import { describe, expect, it } from "vitest";
import { buildPosterCacheKey } from "./poster";

describe("poster cache identity", () => {
  it("separates otherwise identical preset variants", async () => {
    const base = { renderVersion: "v3", title: "Sunday hiking", locale: "en" };

    const dusk = await buildPosterCacheKey("share/team", "team-1", {
      ...base,
      preset: "dusk",
    });
    const ridge = await buildPosterCacheKey("share/team", "team-1", {
      ...base,
      preset: "ridge",
    });

    expect(dusk).not.toBe(ridge);
  });
});
