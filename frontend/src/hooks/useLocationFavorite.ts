/**
 * 地点收藏 hook
 * 管理收藏状态和操作
 */

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { safeFetch } from "@/lib/api-helpers";

interface UseLocationFavoriteOptions {
  locationId: string | undefined;
  userId: string | null;
  onLoginRequired?: () => void;
}

interface UseLocationFavoriteReturn {
  isFavorited: boolean;
  heartAnimating: boolean;
  toggleFavorite: () => Promise<void>;
}

export function useLocationFavorite({
  locationId,
  userId,
  onLoginRequired,
}: UseLocationFavoriteOptions): UseLocationFavoriteReturn {
  const [isFavorited, setIsFavorited] = useState(false);
  const [heartAnimating, setHeartAnimating] = useState(false);

  // 初始化收藏状态
  useEffect(() => {
    if (!locationId || !userId) return;

    safeFetch<{ favorites: { entityId: string }[] }>("/favorites?entityType=location", {
      silent: true,
    }).then((data) => {
      if (data?.favorites) {
        setIsFavorited(data.favorites.some((f) => f.entityId === locationId));
      }
    });
  }, [locationId, userId]);

  const toggleFavorite = useCallback(async () => {
    if (!userId) {
      onLoginRequired?.();
      return;
    }

    if (!locationId) return;

    // 动画
    setHeartAnimating(true);
    setTimeout(() => setHeartAnimating(false), 400);

    // 乐观更新
    const newFavorited = !isFavorited;
    setIsFavorited(newFavorited);

    try {
      if (newFavorited) {
        await fetchAPI("/favorites", {
          method: "POST",
          body: JSON.stringify({ entityType: "location", entityId: locationId }),
        });
      } else {
        await fetchAPI(`/favorites?entityType=location&entityId=${locationId}`, {
          method: "DELETE",
        });
      }
    } catch {
      // 回滚
      setIsFavorited(!newFavorited);
    }
  }, [locationId, userId, isFavorited, onLoginRequired]);

  return {
    isFavorited,
    heartAnimating,
    toggleFavorite,
  };
}
