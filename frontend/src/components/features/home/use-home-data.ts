"use client";

import * as React from "react";
import { fetchPublicAPI } from "@/lib/api";
import { effectiveThemeStore } from "@/stores/theme";
import type { Team } from "@/lib/types";
import { useLocations, type LocationsResponse } from "@/hooks/use-locations";
import { useInView, useAnimateIn, useSearchInteraction } from "@/hooks/use-animations";

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
  const [teamsLoading, setTeamsLoading] = React.useState(!initialData?.teams);
  const [isDark, setIsDark] = React.useState(false);

  // Theme - 只在客户端检测，避免 SSR/CSR 不一致
  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const unsubscribe = effectiveThemeStore.subscribe((effective) => {
      setIsDark(effective === "dark");
    });
    return unsubscribe;
  }, []);

  // Animation hooks
  const animate = useAnimateIn();
  const search = useSearchInteraction();

  // Section refs
  const [teamsRef, teamsInView] = useInView(0.08);

  // Data fetchers
  const fetchTeams = React.useCallback(async () => {
    try {
      setTeamsLoading(true);
      const cityParam = userCity ? `&cityId=${encodeURIComponent(userCity)}` : "";
      const res = await fetchPublicAPI(`/api/teams?status=recruiting&pageSize=4${cityParam}`);
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch (error) {
      console.error("[HomeClient] 获取队伍列表失败:", error);
    } finally {
      setTeamsLoading(false);
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

  const handleSearch = (query: string) => {
    if (query.trim()) {
      window.location.href = `/locations?q=${encodeURIComponent(query.trim())}`;
    } else {
      window.location.href = "/locations";
    }
  };

  return {
    locations, teams, teamsLoading, isDark,
    preloadImages,
    animate, search,
    teamsRef, teamsInView,
    userCity: userCity ?? null,
    handleSearch,
  };
}
