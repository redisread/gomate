"use client";

import * as React from "react";
import { fetchPublicAPI } from "@/lib/api";
import type { Team } from "@/lib/types";
import { useLocations, type LocationsResponse } from "@/hooks/use-locations";
import { useAnimateIn } from "@/hooks/use-animations";

export interface HomeInitialData {
  locations?: LocationsResponse | null;
  teams?: Team[];
}

/**
 * @param userCity 用户的 cityId（P1 city 个性化 #193 T3），空/null 时不传
 */
export function useHomeData(initialData?: HomeInitialData, userCity?: string | null) {
  // 使用 SWR 获取地点列表（带缓存 + city 维度）
  const { locations } = useLocations(1, 6, initialData?.locations, userCity);

  const [teams, setTeams] = React.useState<Team[]>(initialData?.teams ?? []);

  // Animation hooks
  const animate = useAnimateIn();
  // Data fetchers
  const fetchTeams = React.useCallback(async () => {
    try {
      const cityParam = userCity ? `&cityId=${encodeURIComponent(userCity)}` : "";
      const res = await fetchPublicAPI(`/api/teams?status=recruiting&pageSize=4${cityParam}`);
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch (error) {
      console.error("[HomeClient] 获取队伍列表失败:", error);
    }
  }, [userCity]);

  // #221: always fetch on mount (hasInitialTeamsRef removed — SSR data is unfiltered,
  // we need client to override with correct cityId-filtered data after hydration)
  React.useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // 首屏图片预加载（前3张地点封面图）
  const preloadImages = React.useMemo(() => {
    return locations
      .slice(0, 3)
      .map((loc) => loc.coverImage)
      .filter(Boolean) as string[];
  }, [locations]);

  return {
    locations, teams,
    preloadImages,
    animate,
    userCity: userCity ?? null,
  };
}
