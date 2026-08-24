"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_POSTER_PRESET,
  isPosterPresetId,
  type PosterPresetId,
} from "@/contracts/share-image";

const STORAGE_KEY = "gomate.poster-preset";

function readStoredPreset(): PosterPresetId {
  if (typeof window === "undefined") return DEFAULT_POSTER_PRESET;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isPosterPresetId(stored) ? stored : DEFAULT_POSTER_PRESET;
  } catch {
    return DEFAULT_POSTER_PRESET;
  }
}

export function usePosterPreset(): readonly [
  preset: PosterPresetId,
  setPreset: (preset: PosterPresetId) => void,
  isReady: boolean,
] {
  const [preset, setPresetState] = useState<PosterPresetId>(DEFAULT_POSTER_PRESET);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setPresetState(readStoredPreset());
    setIsReady(true);
  }, []);

  const setPreset = useCallback((nextPreset: PosterPresetId) => {
    setPresetState(nextPreset);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextPreset);
    } catch {
      // Storage can be unavailable in private or embedded browser contexts.
    }
  }, []);

  return [preset, setPreset, isReady] as const;
}
