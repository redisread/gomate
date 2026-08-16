"use client";

import { useState, useCallback, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import { readShareImageBlob } from "@/lib/share-image-client";

interface UseShareImageOptions {
  type: "location" | "team" | "story";
  id: string;
}

interface ShareImageResult {
  blob: Blob;
  url: string;
}

/**
 * 使用后端 API 生成分享图片
 * 替代 html-to-image 客户端生成
 */
export function useShareImage({ type, id }: UseShareImageOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  /**
   * 生成分享图片
   * @param refresh - 强制刷新缓存
   */
  const generateImage = useCallback(
    async (refresh = false): Promise<ShareImageResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const endpoint = (() => {
          const qs = refresh ? "?refresh=1" : "";
          switch (type) {
            case "location": return `${API_BASE}/share-image/location/${id}${qs}`;
            case "team":     return `${API_BASE}/share-image/team/${id}${qs}`;
            case "story":    return `${API_BASE}/share-image/story/${id}${qs}`;
          }
        })();

        const response = await fetch(endpoint);

        const blob = await readShareImageBlob(response);
        const url = URL.createObjectURL(blob);

        setImageUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return url;
        });

        return { blob, url };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate image";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [type, id]
  );

  /**
   * 下载图片
   */
  const downloadImage = useCallback(
    async (filename?: string) => {
      const result = imageUrl ? null : await generateImage();
      const url = imageUrl ?? result?.url;
      if (!url) return false;

      try {
        const link = document.createElement("a");
        link.href = url;
        link.download =
          filename || `gomate-${type}-${id.slice(0, 8)}-${Date.now()}.svg`;
        link.click();
        return true;
      } catch {
        return false;
      }
    },
    [generateImage, imageUrl, type, id]
  );

  /**
   * 获取下载链接（用于 iOS Safari）
   */
  const getDownloadUrl = useCallback(async (): Promise<string | null> => {
    const result = await generateImage();
    return result?.url || null;
  }, [generateImage]);

  /**
   * 清理资源
   */
  const cleanup = useCallback(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
  }, [imageUrl]);

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
