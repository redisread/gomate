"use client";
import type { ApiResult } from "@/contracts/http-responses";
import type {
  TeamResponse,
  MyTeamStatus,
  TeamSuccess,
} from "@/contracts/team-api";

import * as React from "react";
import { fetchAPI, fetchCurrentUser, getApiErrorMessage } from "@/lib/api";
import type { Team } from "@/lib/types";
import { isTeamJoinable } from "@/lib/team-display";
import { useI18n } from "@/hooks/useI18n";

interface ToastOptions {
  type: "success" | "error";
  message: string;
}

type MemberStatus = "leader" | "member" | null;

export function useToast() {
  const [toast, setToast] = React.useState<ToastOptions | null>(null);
  const [exiting, setExiting] = React.useState(false);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = React.useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  React.useEffect(() => clear, [clear]);
  const show = React.useCallback((opts: ToastOptions) => {
    clear();
    setExiting(false);
    setToast(opts);
    timers.current.push(setTimeout(() => {
      setExiting(true);
      timers.current.push(setTimeout(() => setToast(null), 200));
    }, 2500));
  }, [clear]);
  return { toast, exiting, show };
}

export function useTeamDetail(teamId: string, initialTeam?: Team) {
  const { t } = useI18n(["teams", "errors", "common"]);
  const [team, setTeam] = React.useState<Team | null>(initialTeam ?? null);
  const [loading, setLoading] = React.useState(!initialTeam);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [memberStatus, setMemberStatus] = React.useState<MemberStatus>(null);
  const [joining, setJoining] = React.useState(false);
  const [showLeave, setShowLeave] = React.useState(false);
  const [showFormConfirm, setShowFormConfirm] = React.useState(false);
  const [isForming, setIsForming] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [statusLoadFailed, setStatusLoadFailed] = React.useState(false);
  const { toast, exiting, show: showToast } = useToast();

  const loadTeam = React.useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const response = await fetchAPI(`/teams/${teamId}`);
      if (response.status === 404) {
        setRefreshError(t("teams.notFound"));
        return;
      }
      const data = await response.json<ApiResult<TeamResponse>>();
      if (!response.ok) throw new Error("team unavailable");
      if (data.success && data.team) {
        setTeam(data.team);
        setRefreshError(null);
      } else {
        setRefreshError(t("teams.notFound"));
      }
    } catch {
      setRefreshError(t("teams.loadFailed"));
    } finally { setRefreshing(false); }
  }, [teamId, t]);

  const statusAbortRef = React.useRef<AbortController | null>(null);
  const refreshStatus = React.useCallback(async () => {
    statusAbortRef.current?.abort();
    const controller = new AbortController();
    statusAbortRef.current = controller;
    setStatusLoading(true);
    setStatusLoadFailed(false);
    try {
      const user = await fetchCurrentUser();
      if (controller.signal.aborted) return;
      setUserId(user?.id ?? null);
      if (!user) {
        setMemberStatus(null);
        return;
      }
      const response = await fetchAPI(`/teams/${teamId}/my-status`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      const data = await response.json<ApiResult<MyTeamStatus>>();
      if (!data.success) throw new Error("membership status failed");
      if (!controller.signal.aborted) setMemberStatus(data.status);
    } catch {
      if (!controller.signal.aborted) setStatusLoadFailed(true);
    } finally {
      if (!controller.signal.aborted) setStatusLoading(false);
    }
  }, [teamId]);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const useInitial = initialTeam?.id === teamId;
    setLoading(!useInitial);
    setStatusLoading(true);
    setError(null);
    const detail = useInitial ? Promise.resolve(initialTeam) : (async () => {
      const response = await fetchAPI(`/teams/${teamId}`, { signal: controller.signal });
      if (response.status === 404) throw new Error("missing");
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json<ApiResult<TeamResponse>>();
      if (!data.success || !data.team) throw new Error("unavailable");
      return data.team;
    })();
    void detail.then((data) => {
      if (!cancelled) { setTeam(data); setLoading(false); }
    }).catch((error: unknown) => {
      if (!cancelled) {
        setError(t(error instanceof Error && error.message === "missing" ? "teams.notFound" : "teams.loadFailed"));
        setLoading(false);
      }
    });
    void refreshStatus();
    return () => { cancelled = true; controller.abort(); statusAbortRef.current?.abort(); };
  }, [teamId, initialTeam, refreshStatus, t]);

  const handleJoin = React.useCallback(async () => {
    if (!userId) {
      showToast({ type: "error", message: t("teams.toast.loginFirst") });
      window.setTimeout(() => {
        window.location.href = `/login?redirect=/teams/${teamId}`;
      }, 1000);
      return;
    }
    setJoining(true);
    try {
      const response = await fetchAPI(`/teams/${teamId}/join`, {
        method: "POST",
      });
      const data = await response.json<ApiResult<TeamSuccess>>();
      if (data.success) {
        setMemberStatus("member");
        showToast({ type: "success", message: t("teams.joinedTeamStatus") });
        await loadTeam();
      } else {
        const message = getApiErrorMessage(data, t("errors.joinFailed"));
        showToast({ type: "error", message });
      }
    } catch {
      showToast({ type: "error", message: t("errors.joinFailed") });
    } finally {
      setJoining(false);
    }
  }, [userId, teamId, showToast, loadTeam, t]);

  const handleLeave = React.useCallback(async () => {
    setShowLeave(false);
    try {
      const response = await fetchAPI(`/teams/${teamId}/leave`, {
        method: "POST",
      });
      const data = await response.json<ApiResult<TeamSuccess>>();
      if (data.success) {
        setMemberStatus(null);
        showToast({ type: "success", message: t("teams.leftTeam") });
        await loadTeam();
      } else {
        showToast({
          type: "error",
          message: getApiErrorMessage(data, t("errors.leaveFailed")),
        });
      }
    } catch {
      showToast({ type: "error", message: t("errors.leaveFailed") });
    }
  }, [teamId, showToast, loadTeam, t]);

  const handleFormTeam = React.useCallback(async () => {
    setIsForming(true);
    try {
      const response = await fetchAPI(`/teams/${teamId}/form`, {
        method: "POST",
      });
      const data = await response.json<ApiResult<TeamResponse>>();
      if (data.success) {
        setTeam(data.team);
        showToast({ type: "success", message: t("teams.formTeamSuccess") });
      } else {
        showToast({
          type: "error",
          message: getApiErrorMessage(data, t("teams.formTeamFailed")),
        });
      }
    } catch {
      showToast({ type: "error", message: t("teams.formTeamFailed") });
    } finally {
      setIsForming(false);
      setShowFormConfirm(false);
    }
  }, [teamId, showToast, t]);

  const handleDelete = React.useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetchAPI(`/teams/${teamId}`, { method: "DELETE" });
      const data = await response.json<ApiResult<TeamSuccess>>();
      if (data.success) {
        showToast({ type: "success", message: t("teams.deleteTeamSuccess") });
        window.setTimeout(() => {
          window.location.href = "/my-teams";
        }, 1500);
      } else {
        showToast({
          type: "error",
          message: getApiErrorMessage(data, t("teams.deleteTeamFailed")),
        });
      }
    } catch {
      showToast({ type: "error", message: t("teams.deleteTeamFailed") });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [teamId, showToast, t]);

  const allMembers = React.useMemo(
    () => team?.participants ?? [],
    [team?.participants],
  );
  const isLeader = memberStatus === "leader";
  const isMember = memberStatus === "member";
  const isFull = team?.isFull ?? false;
  const canJoin =
    Boolean(team) && !isLeader && !isMember && isTeamJoinable(team!);
  const remaining = team
    ? Math.max(0, team.maxParticipants - team.activeParticipantCount)
    : 0;
  const location = team?.location ?? null;

  return {
    toast,
    exiting,
    team,
    loading,
    error,
    userId,
    memberStatus,
    joining,
    showLeave,
    setShowLeave,
    showFormConfirm,
    setShowFormConfirm,
    isForming,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting,
    statusLoadFailed,
    statusLoading,
    refreshError,
    refreshing,
    allMembers,
    isLeader,
    isMember,
    canJoin,
    isFull,
    remaining,
    location,
    handleJoin,
    handleLeave,
    handleFormTeam,
    handleDelete,
    loadTeam,
    retryStatus: refreshStatus,
    show: showToast,
  };
}
