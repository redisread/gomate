import { describe, expect, it } from "vitest";
import { POSTER_PRESETS, getPosterPreset } from "./poster-presets";

describe("poster presets", () => {
  it("defines complete shared palettes for the three public preset ids", () => {
    expect(Object.keys(POSTER_PRESETS)).toEqual(["dusk", "ridge", "journal"]);

    for (const preset of Object.values(POSTER_PRESETS)) {
      expect(Object.values(preset.palette).every(Boolean)).toBe(true);
      expect(preset.location.coverHeight).toBeGreaterThan(0);
      expect(preset.team.coverHeight).toBeGreaterThan(0);
    }
  });

  it("uses distinct color and layout treatments", () => {
    const presets = Object.values(POSTER_PRESETS);

    expect(new Set(presets.map(({ palette }) => palette.primary)).size).toBe(3);
    expect(new Set(presets.map(({ location }) => location.coverHeight)).size).toBe(3);
    expect(new Set(presets.map(({ team }) => team.coverHeight)).size).toBe(3);
  });

  it("resolves dusk as the compatible default", () => {
    expect(getPosterPreset()).toBe(POSTER_PRESETS.dusk);
    expect(getPosterPreset("ridge")).toBe(POSTER_PRESETS.ridge);
  });
});
