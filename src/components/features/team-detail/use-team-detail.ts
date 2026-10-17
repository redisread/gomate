"use client";

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
  const show = React.useCallback((opts: ToastOptions) => {
    setExiting(false);
    setToast(opts);
    window.setTimeout(() => {
      setExiting(true);
      window.setTimeout(() => setToast(null), 200);
    }, 2500);
  }, []);
  return { toast, exiting, show };
}

export function useTeamDetail(teamId: string) {
  const { t } = useI18n(["teams", "errors", "common"]);
  const [team, setTeam] = React.useState<Team | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [memberStatus, setMemberStatus] = React.useState<MemberStatus>(null);
  const [joining, setJoining] = React.useState(false);
  const [showLeave, setShowLeave] = React.useState(false);
  const [showFormConfirm, setShowFormConfirm] = React.useState(false);
  const [updatingRecruitment, setUpdatingRecruitment] = React.useState(false);
  const [isForming, setIsForming] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [statusLoadFailed, setStatusLoadFailed] = React.useState(false);
  const { toast, exiting, show: showToast } = useToast();

  const loadTeam = React.useCallback(async () => {
    try {
      const response = await fetchAPI(`/teams/${teamId}`);
      if (response.status === 404) {
        setError(t("teams.notFound"));
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error("team unavailable");
      if (data.success && data.team) {
        setTeam(data.team as Team);
        setError(null);
      } else {
        setError(t("teams.notFound"));
      }
    } catch {
      setError(t("teams.loadFailed"));
    }
  }, [teamId, t]);

  const loadMembershipStatus = React.useCallback(
    async (authenticatedUserId: string | null) => {
      if (!authenticatedUserId) {
        setMemberStatus(null);
        setStatusLoadFailed(false);
        return;
      }
      try {
        const response = await fetchAPI(`/teams/${teamId}/my-status`);
        const data = await response.json();
        if (!data.success) throw new Error("membership status failed");
        setMemberStatus(data.status as MemberStatus);
        setStatusLoadFailed(false);
      } catch {
        setStatusLoadFailed(true);
      }
    },
    [teamId],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchAPI(`/teams/${teamId}`), fetchCurrentUser()])
      .then(async ([teamResponse, user]) => {
        if (cancelled) return;
        if (teamResponse.status === 404) {
          setError(t("teams.notFound"));
          return;
        }
        if (!teamResponse.ok) throw new Error("team unavailable");
        const data = await teamResponse.json();
        if (!data.success || !data.team) {
          setError(t("teams.notFound"));
          return;
        }
        setTeam(data.team as Team);
        const authenticatedUserId = user?.id ?? null;
        setUserId(authenticatedUserId);
        await loadMembershipStatus(authenticatedUserId);
      })
      .catch(() => {
        if (!cancelled) setError(t("teams.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, loadMembershipStatus, t]);

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
      const data = await response.json();
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
      const data = await response.json();
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
      const data = await response.json();
      if (data.success) {
        setTeam(data.team as Team);
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

  const handleRecruitment = React.useCallback(async () => {
    if (!team || updatingRecruitment) return;
    setUpdatingRecruitment(true);
    try {
      const response = await fetchAPI(`/teams/${teamId}/recruitment`, {
        method: "PUT",
        body: JSON.stringify({
          recruitmentStatus:
            team.recruitmentStatus === "open" ? "closed" : "open",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showToast({
          type: "error",
          message: getApiErrorMessage(data, t("teams.recruitmentFailed")),
        });
      } else {
        setTeam(data.team as Team);
        showToast({ type: "success", message: t("teams.recruitmentUpdated") });
      }
    } catch {
      showToast({ type: "error", message: t("teams.recruitmentFailed") });
      await loadTeam();
    } finally {
      setUpdatingRecruitment(false);
    }
  }, [team, teamId, updatingRecruitment, showToast, t, loadTeam]);

  const handleDelete = React.useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetchAPI(`/teams/${teamId}`, { method: "DELETE" });
      const data = await response.json();
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
    handleRecruitment,
    updatingRecruitment,
    handleDelete,
    loadTeam,
    retryStatus: () => loadMembershipStatus(userId),
    show: showToast,
  };
}
