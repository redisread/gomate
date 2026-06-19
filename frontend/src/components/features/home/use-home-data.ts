"use client";

import * as React from "react";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { effectiveThemeStore } from "@/stores/theme";
import type { Team } from "@/lib/types";
import { useLocations } from "@/hooks/use-locations";
import { useInView, useAnimateIn, useParallax, useSearchInteraction } from "@/hooks/use-animations";

export function useHomeData() {
  // 使用 SWR 获取地点列表（带缓存）
  const [currentPage, setCurrentPage] = React.useState(1);
  const { locations, pagination, isLoading, error: _error } = useLocations(currentPage, 6);

  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  // Theme - 只在客户端检测，避免 SSR/CSR 不一致
  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const unsubscribe = effectiveThemeStore.subscribe((effective) => {
      setIsDark(effective === "dark");
    });
    return unsubscribe;
  }, []);

  // Login status
  React.useEffect(() => {
    (async () => {
      const user = await fetchCurrentUser();
      setIsLoggedIn(!!user);
    })();
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
      const res = await fetchAPI("/api/teams?status=recruiting&pageSize=4");
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch (error) {
      console.error("[HomeClient] 获取队伍列表失败:", error);
    }
  }, []);

  React.useEffect(() => {
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
    locations, teams, isLoading, currentPage, pagination, isLoggedIn, isDark,
    preloadImages,
    animate, parallaxY, search,
    locationsRef, locationsInView, howItWorksRef, howItWorksInView,
    teamsRef, teamsInView, ctaRef, ctaInView,
    setCurrentPage, fetchLocations, handleSearch,
  };
}
