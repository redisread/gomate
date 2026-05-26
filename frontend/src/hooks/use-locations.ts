"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import type { Location } from "@/lib/types";

interface LocationsResponse {
  success: boolean;
  locations: Location[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 获取地点列表，支持分页
 */
export function useLocations(page = 1, pageSize = 6) {
  const [data, setData] = useState<LocationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAPI(`/api/locations?page=${page}&pageSize=${pageSize}&view=card`);
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
  }, [page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mutate = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    locations: data?.locations ?? [],
    pagination: data?.pagination ?? { page, pageSize, total: 0, totalPages: 0 },
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
        const res = await fetchAPI("/api/locations?tags=true");
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
