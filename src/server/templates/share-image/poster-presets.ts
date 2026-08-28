import type { PosterPresetId } from "../../../contracts/share-image";
import { DEFAULT_POSTER_PRESET } from "../../../contracts/share-image";
import { POSTER_TOKENS } from "./poster-tokens";

export interface PosterPalette {
  bg: string;
  surface: string;
  primary: string;
  primaryDark: string;
  title: string;
  body: string;
  muted: string;
  sky: string;
  skyDeep: string;
  sunGlow: string;
  white: string;
  border: string;
  tagBackground: string;
  tagBorder: string;
  coverOverlay: string;
  coverGlow: string;
  titleShadow: string;
  footerTint: string;
}

interface PosterLayout {
  coverHeight: number;
  emptyCoverHeight: number;
  coverInset: number;
  cardRadius: number;
  titleAlign: "left" | "center";
}

export interface PosterPresetDefinition {
  id: PosterPresetId;
  palette: PosterPalette;
  location: PosterLayout;
  team: PosterLayout;
}

export const POSTER_PRESETS: Record<PosterPresetId, PosterPresetDefinition> = {
  dusk: {
    id: "dusk",
    palette: {
      ...POSTER_TOKENS,
      primaryDark: "#B45309",
      white: "#FFFFFF",
      border: "#E7E5E4",
      tagBackground: "#FFFBEB",
      tagBorder: "#FEF3C7",
      coverOverlay: "linear-gradient(180deg, rgba(42,59,92,0.45) 0%, rgba(26,37,64,0.65) 100%)",
      coverGlow: "linear-gradient(180deg, rgba(28,25,23,0) 0%, rgba(42,59,92,0.30) 45%, rgba(232,144,48,0.55) 100%)",
      titleShadow: "0 0 16px rgba(232,144,48,0.5)",
      footerTint: "rgba(232,144,48,0.04)",
    },
    location: { coverHeight: 210, emptyCoverHeight: 210, coverInset: 0, cardRadius: 14, titleAlign: "left" },
    team: { coverHeight: 108, emptyCoverHeight: 84, coverInset: 0, cardRadius: 18, titleAlign: "center" },
  },
  ridge: {
    id: "ridge",
    palette: {
      bg: "#EFF6F4",
      surface: "#FFFFFF",
      primary: "#0F766E",
      primaryDark: "#115E59",
      title: "#12312D",
      body: "#3F5D58",
      muted: "#78918C",
      sky: "#315B63",
      skyDeep: "#18383F",
      sunGlow: "#5FA99F",
      white: "#FFFFFF",
      border: "#CFE1DD",
      tagBackground: "#E6F3F0",
      tagBorder: "#BFDDD7",
      coverOverlay: "linear-gradient(180deg, rgba(24,56,63,0.35) 0%, rgba(15,118,110,0.58) 100%)",
      coverGlow: "linear-gradient(180deg, rgba(24,56,63,0) 0%, rgba(49,91,99,0.25) 45%, rgba(95,169,159,0.52) 100%)",
      titleShadow: "0 0 16px rgba(95,169,159,0.45)",
      footerTint: "rgba(15,118,110,0.05)",
    },
    location: { coverHeight: 184, emptyCoverHeight: 184, coverInset: 0, cardRadius: 8, titleAlign: "left" },
    team: { coverHeight: 84, emptyCoverHeight: 76, coverInset: 0, cardRadius: 10, titleAlign: "left" },
  },
  journal: {
    id: "journal",
    palette: {
      bg: "#F6F0E4",
      surface: "#FFFDF7",
      primary: "#A33D2B",
      primaryDark: "#7F2F23",
      title: "#342A25",
      body: "#65554B",
      muted: "#958277",
      sky: "#846E62",
      skyDeep: "#4A3C35",
      sunGlow: "#D48A5B",
      white: "#FFFFFF",
      border: "#DDCFBD",
      tagBackground: "#F7E7D9",
      tagBorder: "#E8C9B2",
      coverOverlay: "linear-gradient(180deg, rgba(74,60,53,0.28) 0%, rgba(127,47,35,0.52) 100%)",
      coverGlow: "linear-gradient(180deg, rgba(74,60,53,0) 0%, rgba(132,110,98,0.24) 45%, rgba(212,138,91,0.48) 100%)",
      titleShadow: "0 0 16px rgba(212,138,91,0.42)",
      footerTint: "rgba(163,61,43,0.04)",
    },
    location: { coverHeight: 196, emptyCoverHeight: 196, coverInset: 14, cardRadius: 4, titleAlign: "left" },
    team: { coverHeight: 94, emptyCoverHeight: 80, coverInset: 14, cardRadius: 4, titleAlign: "left" },
  },
};

export function getPosterPreset(id: PosterPresetId = DEFAULT_POSTER_PRESET): PosterPresetDefinition {
  return POSTER_PRESETS[id];
}
