"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

interface UseFavoriteOptions {
  entityType: "location" | "route";
  entityId: string;
}

interface UseFavoriteReturn {
  isFavorite: boolean;
  isLoading: boolean;
  isToggling: boolean;
  toggleFavorite: () => Promise<void>;
  addFavorite: () => Promise<void>;
  removeFavorite: () => Promise<void>;
}

/**
 * 收藏功能 Hook
 * 提供地点/路线的收藏状态管理和操作
 */
export function useFavorite({
  entityType,
  entityId,
}: UseFavoriteOptions): UseFavoriteReturn {
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // 获取初始收藏状态
  useEffect(() => {
    if (!isAuthenticated || !entityId) {
      setIsFavorite(false);
      return;
    }

    const checkFavoriteStatus = async () => {
      setIsLoading(true);
      try {
        if (entityType === "location") {
          const response = await fetch(`/api/locations/${entityId}/favorite`);
          if (response.ok) {
            const data = await response.json();
            setIsFavorite(data.isFavorite);
          }
        }
      } catch (error) {
        console.error("获取收藏状态失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFavoriteStatus();
  }, [isAuthenticated, entityType, entityId]);

  /**
   * 添加收藏
   */
  const addFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error("请先登录");
    }

    setIsToggling(true);
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityType,
          entityId,
        }),
      });

      if (response.ok) {
        setIsFavorite(true);
      } else {
        const data = await response.json();
        throw new Error(data.error || "添加收藏失败");
      }
    } finally {
      setIsToggling(false);
    }
  }, [isAuthenticated, entityType, entityId]);

  /**
   * 取消收藏
   */
  const removeFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error("请先登录");
    }

    setIsToggling(true);
    try {
      const response = await fetch(
        `/api/favorites?entityType=${entityType}&entityId=${entityId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setIsFavorite(false);
      } else {
        const data = await response.json();
        throw new Error(data.error || "取消收藏失败");
      }
    } finally {
      setIsToggling(false);
    }
  }, [isAuthenticated, entityType, entityId]);

  /**
   * 切换收藏状态
   */
  const toggleFavorite = useCallback(async () => {
    if (isFavorite) {
      await removeFavorite();
    } else {
      await addFavorite();
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    isFavorite,
    isLoading,
    isToggling,
    toggleFavorite,
    addFavorite,
    removeFavorite,
  };
}

/**
 * 获取用户收藏列表 Hook
 */
export function useFavorites(entityType?: "location" | "route") {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<
    Array<{
      id: string;
      entityType: string;
      entityId: string;
      createdAt: Date;
      location?: {
        id: string;
        name: string;
        coverImage: string;
        address: string | null;
        cityName: string | null;
      };
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      return;
    }

    setIsLoading(true);
    try {
      const url = entityType
        ? `/api/favorites?entityType=${entityType}`
        : "/api/favorites";
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFavorites(data.favorites);
        }
      }
    } catch (error) {
      console.error("获取收藏列表失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, entityType]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    favorites,
    isLoading,
    refresh: fetchFavorites,
  };
}
