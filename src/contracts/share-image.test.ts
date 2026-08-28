import { describe, expect, it } from "vitest";
import {
  DEFAULT_POSTER_PRESET,
  isPosterPresetId,
  POSTER_PRESET_IDS,
  POSTER_RENDER_VERSION,
  resolvePosterPreset,
} from "./share-image";

describe("poster preset contract", () => {
  it("defines the three supported presets and a stable default", () => {
    expect(POSTER_PRESET_IDS).toEqual(["dusk", "ridge", "journal"]);
    expect(DEFAULT_POSTER_PRESET).toBe("dusk");
    expect(POSTER_RENDER_VERSION).toBe("v3");
  });

  it("validates and resolves request values", () => {
    expect(isPosterPresetId("ridge")).toBe(true);
    expect(isPosterPresetId("custom-css")).toBe(false);
    expect(resolvePosterPreset(undefined)).toBe("dusk");
    expect(resolvePosterPreset("journal")).toBe("journal");
    expect(resolvePosterPreset("custom-css")).toBeNull();
  });
});
