/**
 * 地点详情数据 hook
 * 管理地点加载、队伍、相关地点等状态
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Location, Team } from "@/lib/types";
import { safeFetch } from "@/lib/api-helpers";

interface UseLocationDetailOptions {
  locationId: string;
  onError?: (error: string) => void;
}

interface UseLocationDetailReturn {
  location: Location | null;
  teams: Team[];
  relatedLocations: Location[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useLocationDetail({ locationId, onError }: UseLocationDetailOptions): UseLocationDetailReturn {
  const [location, setLocation] = useState<Location | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [relatedLocations, setRelatedLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 用 ref 持有最新的 onError，避免其变化时重建 loadLocation 导致无限循环
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; });

  const loadTeams = useCallback(async (locId: string) => {
    const data = await safeFetch<{ success: boolean; teams: Team[] }>(
      `/api/teams?locationId=${locId}&status=recruiting&pageSize=5`,
      { silent: true }
    );
    if (data?.success) setTeams(data.teams || []);
  }, []);

  const loadRelatedLocations = useCallback(async (currentLocationId: string) => {
    const data = await safeFetch<{ success: boolean; locations: Location[] }>(
      "/api/locations?pageSize=4",
      { silent: true }
    );
    if (data?.success) {
      setRelatedLocations(
        (data.locations || []).filter((l) => l.id !== currentLocationId).slice(0, 3)
      );
    }
  }, []);

  const loadLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const data = await safeFetch<{ success: boolean; location: Location }>(
      `/api/locations/${locationId}`
    );

    if (data?.success && data.location) {
      setLocation(data.location);
      loadTeams(data.location.id);
      loadRelatedLocations(data.location.id);
    } else {
      const errorMsg = "Location not found";
      setError(errorMsg);
      onErrorRef.current?.(errorMsg);
    }

    setIsLoading(false);
  }, [locationId, loadTeams, loadRelatedLocations]);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  return {
    location,
    teams,
    relatedLocations,
    isLoading,
    error,
    reload: loadLocation,
  };
}
