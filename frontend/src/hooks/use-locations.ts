"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchPublicAPI } from "@/lib/api";
import type { Location } from "@/lib/types";

export interface LocationsResponse {
  success: boolean;
  locations: Location[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  _meta?: {
    cityMatch: 'exact' | 'mixed' | 'fallback';
  };
}

/**
 * 获取地点列表，支持分页和城市筛选
 * @param cityId 可选 cityId，登录用户已设城市时传入（P1 city 个性化 #193 T3）
 */
export function useLocations(page = 1, pageSize = 6, initialData?: LocationsResponse | null, cityId?: string | null) {
  const [data, setData] = useState<LocationsResponse | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);
  const initialKeyRef = useRef(
    initialData ? `${initialData.pagination.page}:${initialData.pagination.pageSize}` : "",
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cityParam = cityId ? `&cityId=${encodeURIComponent(cityId)}` : "";
      const res = await fetchPublicAPI(`/api/locations?page=${page}&pageSize=${pageSize}&view=card${cityParam}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "获取地点列表失败");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("获取地点列表失败"));
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, cityId]);

  useEffect(() => {
    const key = `${page}:${pageSize}`;
    if (initialKeyRef.current === key) {
      initialKeyRef.current = "";
      return;
    }
    fetchData();
  }, [fetchData, page, pageSize]);

  const mutate = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    locations: data?.locations ?? [],
    pagination: data?.pagination ?? { page, pageSize, total: 0, totalPages: 0 },
    cityMatch: data?._meta?.cityMatch ?? null,
    isLoading,
    error,
    mutate,
  };
}

/**
 * 获取热门标签
 */
export function useLocationTags() {
  const [tags, setTags] = useState<{ id: string; name: string; type: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchTags = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchPublicAPI("/api/locations?tags=true");
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || "获取标签失败");
        }
        if (mounted) {
          setTags(json.tags);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error("获取标签失败"));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTags();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    tags,
    isLoading,
    error,
  };
}
