import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import type { Team, TeamMember } from "@/lib/types";

interface UseTeamDetailOptions {
  teamId: string;
  autoLoad?: boolean;
}

interface UseTeamDetailReturn {
  team: Team | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setTeam: React.Dispatch<React.SetStateAction<Team | null>>;
}

/**
 * 获取队伍详情的通用 Hook
 * @example
 * const { team, isLoading, error, refetch } = useTeamDetail({ teamId: "123" });
 */
export function useTeamDetail({
  teamId,
  autoLoad = true,
}: UseTeamDetailOptions): UseTeamDetailReturn {
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!teamId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchAPI(`/api/teams/${teamId}`);

      if (res.status === 404) {
        setError("队伍不存在");
        setTeam(null);
        return;
      }

      const data = await res.json();

      if (data.success) {
        setTeam(data.team);
      } else {
        setError(data.error || "获取队伍详情失败");
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
      console.error("[useTeamDetail] 获取队伍失败:", err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (autoLoad) {
      fetchTeam();
    }
  }, [autoLoad, fetchTeam, teamId]);

  return {
    team,
    isLoading,
    error,
    refetch: fetchTeam,
    setTeam,
  };
}

/**
 * 获取当前用户在队伍中的状态
 * @example
 * const { memberStatus, isLoading, refetch } = useMyTeamStatus(teamId);
 */
export function useMyTeamStatus(teamId: string) {
  const [memberStatus, setMemberStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!teamId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchAPI(`/api/teams/${teamId}/my-status`);
      const data = await res.json();

      if (data.success) {
        setMemberStatus(data.status);
      }
    } catch (err) {
      console.error("[useMyTeamStatus] 获取状态失败:", err);
      setError("获取状态失败");
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, teamId]);

  return {
    memberStatus,
    isLoading,
    error,
    refetch: fetchStatus,
    setMemberStatus,
  };
}

/**
 * 获取队伍申请列表（仅队长可用）
 * @example
 * const { applications, isLoading, refetch } = useTeamApplications(teamId);
 */
export function useTeamApplications(teamId: string) {
  const [applications, setApplications] = useState<Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      name?: string;
      nickname?: string;
      avatar?: string;
    };
    message?: string;
    createdAt: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    if (!teamId) return;

    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/applications`);
      const data = await res.json();

      if (data.success) {
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error("[useTeamApplications] 获取申请列表失败:", err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications, teamId]);

  return {
    applications,
    isLoading,
    refetch: fetchApplications,
    setApplications,
  };
}

/**
 * 获取同地点的其他队伍
 * @example
 * const { otherTeams } = useOtherTeams(locationId, currentTeamId);
 */
export function useOtherTeams(
  locationId: string | undefined,
  currentTeamId: string | undefined
) {
  const [otherTeams, setOtherTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOtherTeams = useCallback(async () => {
    if (!locationId || !currentTeamId) return;

    setIsLoading(true);
    try {
      const res = await fetchAPI(
        `/api/teams?locationId=${locationId}&status=recruiting&pageSize=3`
      );
      const data = await res.json();

      if (data.success) {
        setOtherTeams(
          (data.teams || [])
            .filter((t: Team) => t.id !== currentTeamId)
            .slice(0, 2)
        );
      }
    } catch (err) {
      console.error("[useOtherTeams] 获取其他队伍失败:", err);
    } finally {
      setIsLoading(false);
    }
  }, [locationId, currentTeamId]);

  useEffect(() => {
    fetchOtherTeams();
  }, [fetchOtherTeams, locationId, currentTeamId]);

  return {
    otherTeams,
    isLoading,
    refetch: fetchOtherTeams,
  };
}

/**
 * 获取当前用户信息
 * @example
 * const { currentUser, isLoggedIn } = useCurrentUser();
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name?: string;
    nickname?: string;
    avatar?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI("/auth/get-session");
      const data = await res.json();

      if (data?.user?.id) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error("[useCurrentUser] 获取用户失败:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    currentUser,
    isLoggedIn: !!currentUser,
    isLoading,
    refetch: fetchUser,
  };
}
