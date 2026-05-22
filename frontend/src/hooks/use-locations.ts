"use client";

import useSWR from "swr";
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

const fetcher = async (url: string): Promise<LocationsResponse> => {
  const res = await fetchAPI(url);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "获取地点列表失败");
  }
  return data;
};

/**
 * 使用 SWR 获取地点列表，支持缓存和自动重验证
 * 缓存时间：5分钟
 */
export function useLocations(page = 1, pageSize = 6) {
  const { data, error, isLoading, mutate } = useSWR<LocationsResponse>(
    `/api/locations?page=${page}&pageSize=${pageSize}&view=card`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5分钟去重
      keepPreviousData: true, // 切换分页时保持旧数据
      refreshInterval: 0, // 不自动刷新
    }
  );

  return {
    locations: data?.locations ?? [],
    pagination: data?.pagination ?? { page, pageSize, total: 0, totalPages: 0 },
    isLoading,
    error,
    mutate,
  };
}

/**
 * 使用 SWR 获取热门标签
 */
export function useLocationTags() {
  const { data, error, isLoading } = useSWR<{ success: boolean; tags: { id: string; name: string; type: string }[] }>(
    "/api/locations?tags=true",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000, // 10分钟，标签变化较少
    }
  );

  return {
    tags: data?.tags ?? [],
    isLoading,
    error,
  };
}
