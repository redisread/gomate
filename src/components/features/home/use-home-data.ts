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
 * @param userRegionId 用户的 Region id，空/null 时不传。
 */
export function useHomeData(initialData?: HomeInitialData, userRegionId?: string | null) {
  const { locations } = useLocations(6, initialData?.locations, userRegionId);

  const [teams, setTeams] = React.useState<Team[]>(initialData?.teams ?? []);

  // Animation hooks
  const animate = useAnimateIn();
  // Data fetchers
  const fetchTeams = React.useCallback(async () => {
    try {
      const regionParam = userRegionId ? `&regionId=${encodeURIComponent(userRegionId)}` : "";
      const res = await fetchPublicAPI(`/teams?recruitmentStatus=open&limit=4${regionParam}`);
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch (error) {
      console.error("[HomeClient] 获取队伍列表失败:", error);
    }
  }, [userRegionId]);

  // #221: always fetch on mount (hasInitialTeamsRef removed — SSR data is unfiltered,
  // we need client to override with correct regionId-filtered data after hydration)
  React.useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // 首屏图片预加载（前3张地点封面图）
  const preloadImages = React.useMemo(() => {
    return locations
      .slice(0, 3)
      .map((loc) => loc.coverImageUrl)
      .filter(Boolean) as string[];
  }, [locations]);

  return {
    locations, teams,
    preloadImages,
    animate,
    userRegionId: userRegionId ?? null,
  };
}
