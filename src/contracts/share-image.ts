export const POSTER_PRESET_IDS = ["dusk", "ridge", "journal"] as const;

export type PosterPresetId = (typeof POSTER_PRESET_IDS)[number];

export const DEFAULT_POSTER_PRESET: PosterPresetId = "dusk";
export const POSTER_RENDER_VERSION = "v3";

export function isPosterPresetId(value: unknown): value is PosterPresetId {
  return typeof value === "string"
    && (POSTER_PRESET_IDS as readonly string[]).includes(value);
}

export function resolvePosterPreset(
  value: string | null | undefined,
): PosterPresetId | null {
  if (value == null || value === "") return DEFAULT_POSTER_PRESET;
  return isPosterPresetId(value) ? value : null;
}
