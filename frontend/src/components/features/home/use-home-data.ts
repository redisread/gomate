"use client";

import * as React from "react";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { effectiveThemeStore } from "@/stores/theme";
import type { Location, Team } from "@/lib/types";
import { useInView, useAnimateIn, useParallax, useSearchInteraction } from "@/hooks/use-animations";

export function useHomeData() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({ total: 0, totalPages: 0, pageSize: 6 });
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Theme - 延迟到客户端再设置，避免 SSR/CSR 不一致
  React.useEffect(() => {
    setMounted(true);
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
  const fetchLocations = React.useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/locations?page=${page}&pageSize=6`);
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    fetchLocations(1);
    fetchTeams();
  }, [fetchLocations, fetchTeams]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      window.location.href = `/locations?q=${encodeURIComponent(query.trim())}`;
    } else {
      window.location.href = "/locations";
    }
  };

  return {
    locations, teams, isLoading, currentPage, pagination, isLoggedIn, isDark, mounted,
    animate, parallaxY, search,
    locationsRef, locationsInView, howItWorksRef, howItWorksInView,
    teamsRef, teamsInView, ctaRef, ctaInView,
    setCurrentPage, fetchLocations, handleSearch,
  };
}
