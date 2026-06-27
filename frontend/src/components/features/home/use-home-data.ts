"use client";

import * as React from "react";
import { fetchPublicAPI } from "@/lib/api";
import { effectiveThemeStore } from "@/stores/theme";
import type { Team } from "@/lib/types";
import { useLocations, type LocationsResponse } from "@/hooks/use-locations";
import { useInView, useAnimateIn, useParallax, useSearchInteraction } from "@/hooks/use-animations";

export interface HomeInitialData {
  locations?: LocationsResponse | null;
  teams?: Team[];
}

export function useHomeData(initialData?: HomeInitialData) {
  // 使用 SWR 获取地点列表（带缓存）
  const [currentPage, setCurrentPage] = React.useState(1);
  const { locations, pagination, isLoading, error: _error } = useLocations(currentPage, 6, initialData?.locations);

  const [teams, setTeams] = React.useState<Team[]>(initialData?.teams ?? []);
  const [teamsLoading, setTeamsLoading] = React.useState(!initialData?.teams);
  const [isDark, setIsDark] = React.useState(false);
  const hasInitialTeamsRef = React.useRef(Boolean(initialData?.teams));

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
  const { y: parallaxY } = useParallax(0.015);
  const search = useSearchInteraction();

  // Section refs
  const [locationsRef, locationsInView] = useInView(0.08);
  const [howItWorksRef, howItWorksInView] = useInView(0.08);
  const [teamsRef, teamsInView] = useInView(0.08);
  const [ctaRef, ctaInView] = useInView(0.15);

  // Data fetchers
  const fetchTeams = React.useCallback(async () => {
    try {
      setTeamsLoading(true);
      const res = await fetchPublicAPI("/api/teams?status=recruiting&pageSize=4");
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch (error) {
      console.error("[HomeClient] 获取队伍列表失败:", error);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (hasInitialTeamsRef.current) {
      hasInitialTeamsRef.current = false;
      return;
    }
    fetchTeams();
  }, [fetchTeams]);

  const fetchLocations = React.useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

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
    locations, teams, teamsLoading, isLoading, currentPage, pagination, isDark,
    preloadImages,
    animate, parallaxY, search,
    locationsRef, locationsInView, howItWorksRef, howItWorksInView,
    teamsRef, teamsInView, ctaRef, ctaInView,
    setCurrentPage, fetchLocations, handleSearch,
  };
}
