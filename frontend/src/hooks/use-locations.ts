"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchPublicAPI } from "@/lib/api";
import type { Location, Tag } from "@/lib/types";

export interface LocationsResponse {
  success: boolean;
  locations: Location[];
  total: number;
  nextCursor: string | null;
}

/**
 * 获取地点列表首页，支持 V2 Region 筛选。
 */
export function useLocations(limit = 6, initialData?: LocationsResponse | null, regionId?: string | null) {
  const [data, setData] = useState<LocationsResponse | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);
  const skipInitialFetchRef = useRef(Boolean(initialData));

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const regionParam = regionId ? `&regionId=${encodeURIComponent(regionId)}` : "";
      const res = await fetchPublicAPI(`/locations?limit=${limit}${regionParam}`);
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
  }, [limit, regionId]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }
    fetchData();
  }, [fetchData]);

  const mutate = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    locations: data?.locations ?? [],
    pagination: {
      limit,
      total: data?.total ?? 0,
      nextCursor: data?.nextCursor ?? null,
    },
    isLoading,
    error,
    mutate,
  };
}

/**
 * 获取热门标签
 */
export function useLocationTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchTags = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchPublicAPI("/tags?limit=200");
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || "获取标签失败");
        }
        if (mounted) {
          setTags(json.tags ?? []);
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
