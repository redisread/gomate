"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_POSTER_PRESET,
  POSTER_RENDER_VERSION,
  type PosterPresetId,
} from "@/contracts/share-image";
import { getLocale } from "@/i18n";
import { API_BASE } from "@/lib/api";
import { readShareImageBlob } from "@/lib/share-image-client";

interface UseShareImageOptions {
  type: "location" | "team" | "story";
  id: string;
  preset?: PosterPresetId;
}

interface ShareImageResult {
  blob: Blob;
  url: string;
}

export function useShareImage({
  type,
  id,
  preset = DEFAULT_POSTER_PRESET,
}: UseShareImageOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, ShareImageResult>());
  const activeControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);

  const releaseResources = useCallback(() => {
    requestSequenceRef.current += 1;
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
    for (const result of cacheRef.current.values()) {
      URL.revokeObjectURL(result.url);
    }
    cacheRef.current.clear();
  }, []);

  useEffect(() => releaseResources, [releaseResources]);

  const generateImage = useCallback(async (): Promise<ShareImageResult | null> => {
    const locale = getLocale();
    const params = new URLSearchParams({ locale });
    if (type !== "story") params.set("preset", preset);
    params.set("v", POSTER_RENDER_VERSION);

    const endpoint = `${API_BASE}/share-image/${type}/${id}?${params.toString()}`;
    const cacheKey = `${type}:${id}:${locale}:${type === "story" ? "story" : preset}`;
    const cached = cacheRef.current.get(cacheKey);

    requestSequenceRef.current += 1;
    const requestSequence = requestSequenceRef.current;
    activeControllerRef.current?.abort();

    if (cached) {
      activeControllerRef.current = null;
      setImageUrl(cached.url);
      setError(null);
      setIsLoading(false);
      return cached;
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, { signal: controller.signal });
      const blob = await readShareImageBlob(response);
      if (controller.signal.aborted || requestSequence !== requestSequenceRef.current) {
        return null;
      }

      const result = { blob, url: URL.createObjectURL(blob) };
      cacheRef.current.set(cacheKey, result);
      setImageUrl(result.url);
      return result;
    } catch (caught) {
      if (controller.signal.aborted || requestSequence !== requestSequenceRef.current) {
        return null;
      }
      setImageUrl(null);
      setError(caught instanceof Error ? caught.message : "Failed to generate image");
      return null;
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        activeControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, [id, preset, type]);

  const downloadImage = useCallback(async (filename?: string) => {
    const result = imageUrl ? null : await generateImage();
    const url = imageUrl ?? result?.url;
    if (!url) return false;

    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `gomate-${type}-${id.slice(0, 8)}-${Date.now()}.svg`;
      link.click();
      return true;
    } catch {
      return false;
    }
  }, [generateImage, id, imageUrl, type]);

  const getDownloadUrl = useCallback(async (): Promise<string | null> => {
    const result = await generateImage();
    return result?.url ?? null;
  }, [generateImage]);

  const cleanup = useCallback(() => {
    releaseResources();
    setImageUrl(null);
    setError(null);
    setIsLoading(false);
  }, [releaseResources]);

  return {
    isLoading,
    error,
    imageUrl,
    generateImage,
    downloadImage,
    getDownloadUrl,
    cleanup,
  };
}
