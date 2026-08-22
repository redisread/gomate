"use client";

import * as React from "react";
import { fetchAPI, fetchCurrentUser, getApiErrorMessage } from "@/lib/api";
import type { Location, Team, TeamMember } from "@/lib/types";
import type { TeamJoinApplication } from "./team-detail-types";
import { isTeamJoinable } from "@/lib/team-display";
import { useI18n } from "@/hooks/useI18n";

interface ToastOptions {
  type: "success" | "error";
  message: string;
}

type MemberStatus = "leader" | "member" | "pending" | null;

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

interface UseTeamDetailReturn {
  toast: ToastOptions | null;
  exiting: boolean;
  team: Team | null;
  loading: boolean;
  error: string | null;
  userId: string | null;
  memberStatus: MemberStatus;
  joining: boolean;
  joinMsg: string;
  setJoinMsg: React.Dispatch<React.SetStateAction<string>>;
  showJoinModal: boolean;
  setShowJoinModal: React.Dispatch<React.SetStateAction<boolean>>;
  showShare: boolean;
  setShowShare: React.Dispatch<React.SetStateAction<boolean>>;
  showLeave: boolean;
  setShowLeave: React.Dispatch<React.SetStateAction<boolean>>;
  showFormConfirm: boolean;
  setShowFormConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  isForming: boolean;
  showWechatConfirm: boolean;
  setShowWechatConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  showWechatSheet: boolean;
  setShowWechatSheet: React.Dispatch<React.SetStateAction<boolean>>;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  isDeleting: boolean;
  statusLoadFailed: boolean;
  applications: TeamJoinApplication[];
  allMembers: TeamMember[];
  isLeader: boolean;
  isMember: boolean;
  isPending: boolean;
  canJoin: boolean;
  isFull: boolean;
  remaining: number;
  location: Location | null;
  handleJoin: () => Promise<void>;
  handleSaveWechat: (wechat: string) => Promise<void>;
  handleLeave: () => Promise<void>;
  handleApprove: (requestId: string) => Promise<void>;
  handleReject: (requestId: string) => Promise<void>;
  handleFormTeam: () => Promise<void>;
  handleDelete: () => Promise<void>;
  loadTeam: () => Promise<void>;
  show: (opts: ToastOptions) => void;
}

export function useTeamDetail(teamId: string): UseTeamDetailReturn {
  const { t } = useI18n(["teams", "errors", "common"]);
  const [team, setTeam] = React.useState<Team | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [memberStatus, setMemberStatus] = React.useState<MemberStatus>(null);
  const [joining, setJoining] = React.useState(false);
  const [joinMsg, setJoinMsg] = React.useState("");
  const [showJoinModal, setShowJoinModal] = React.useState(false);
  const [showShare, setShowShare] = React.useState(false);
  const [showLeave, setShowLeave] = React.useState(false);
  const [showFormConfirm, setShowFormConfirm] = React.useState(false);
  const [isForming, setIsForming] = React.useState(false);
  const [applications, setApplications] = React.useState<TeamJoinApplication[]>([]);
  const [showWechatConfirm, setShowWechatConfirm] = React.useState(false);
  const [showWechatSheet, setShowWechatSheet] = React.useState(false);
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

  const loadMembershipStatus = React.useCallback(async (authenticatedUserId: string | null) => {
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
  }, [teamId]);

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
    return () => { cancelled = true; };
  }, [teamId, loadMembershipStatus, t]);

  const fetchApplications = React.useCallback(async () => {
    try {
      const response = await fetchAPI(`/teams/${teamId}/join-requests`);
      const data = await response.json();
      if (data.success) {
        setApplications((data.joinRequests || []).filter((request: TeamJoinApplication) => request.status === "pending"));
      }
    } catch {
      setApplications([]);
    }
  }, [teamId]);

  React.useEffect(() => {
    if (memberStatus === "leader") fetchApplications();
  }, [memberStatus, fetchApplications]);

  const handleJoin = React.useCallback(async () => {
    if (!userId) {
      showToast({ type: "error", message: t("teams.toast.loginFirst") });
      window.setTimeout(() => { window.location.href = `/login?redirect=/teams/${teamId}`; }, 1000);
      return;
    }
    setJoining(true);
    try {
      const response = await fetchAPI(`/teams/${teamId}/join`, {
        method: "POST",
        body: JSON.stringify({ message: joinMsg.trim() || undefined }),
      });
      const data = await response.json();
      if (data.success) {
        setMemberStatus("pending");
        setShowJoinModal(false);
        showToast({ type: "success", message: t("teams.applied") });
        await loadTeam();
      } else {
        const message = getApiErrorMessage(data, t("errors.joinFailed"));
        if (message.includes("微信") || message.toLowerCase().includes("wechat")) {
          setShowJoinModal(false);
          window.setTimeout(() => setShowWechatConfirm(true), 300);
        } else {
          showToast({ type: "error", message });
        }
      }
    } catch {
      showToast({ type: "error", message: t("errors.joinFailed") });
    } finally {
      setJoining(false);
    }
  }, [userId, teamId, joinMsg, showToast, loadTeam, t]);

  const handleSaveWechat = React.useCallback(async (wechat: string) => {
    if (!wechat.trim()) {
      showToast({ type: "error", message: t("teams.toast.wechatEmpty") });
      return;
    }
    try {
      const response = await fetchAPI("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ extra: { wechat: wechat.trim() } }),
      });
      const data = await response.json();
      if (data.success && data.user) {
        setShowWechatSheet(false);
        showToast({ type: "success", message: t("teams.toast.wechatSavedReapply") });
      } else {
        showToast({ type: "error", message: t("teams.toast.wechatSaveFailed") });
      }
    } catch {
      showToast({ type: "error", message: t("teams.toast.wechatSaveFailed") });
    }
  }, [showToast, t]);

  const handleLeave = React.useCallback(async () => {
    setShowLeave(false);
    try {
      const response = await fetchAPI(`/teams/${teamId}/leave`, { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setMemberStatus(null);
        showToast({ type: "success", message: t("teams.leftTeam") });
        await loadTeam();
      } else {
        showToast({ type: "error", message: getApiErrorMessage(data, t("errors.leaveFailed")) });
      }
    } catch {
      showToast({ type: "error", message: t("errors.leaveFailed") });
    }
  }, [teamId, showToast, loadTeam, t]);

  const handleApprove = React.useCallback(async (requestId: string) => {
    try {
      const response = await fetchAPI(`/teams/${teamId}/join-requests/${requestId}/approve`, { method: "POST" });
      const data = await response.json();
      if (data.success) {
        showToast({ type: "success", message: t("teams.approved") });
        setApplications((previous) => previous.filter((request) => request.id !== requestId));
        await loadTeam();
      } else {
        showToast({ type: "error", message: getApiErrorMessage(data, t("errors.reviewFailed")) });
      }
    } catch {
      showToast({ type: "error", message: t("errors.reviewFailed") });
    }
  }, [teamId, showToast, loadTeam, t]);

  const handleReject = React.useCallback(async (requestId: string) => {
    try {
      const response = await fetchAPI(`/teams/${teamId}/join-requests/${requestId}/reject`, { method: "POST" });
      const data = await response.json();
      if (data.success) {
        showToast({ type: "success", message: t("teams.rejected") });
        setApplications((previous) => previous.filter((request) => request.id !== requestId));
      } else {
        showToast({ type: "error", message: getApiErrorMessage(data, t("errors.reviewFailed")) });
      }
    } catch {
      showToast({ type: "error", message: t("errors.reviewFailed") });
    }
  }, [teamId, showToast, t]);

  const handleFormTeam = React.useCallback(async () => {
    setIsForming(true);
    try {
      const response = await fetchAPI(`/teams/${teamId}/form`, { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setTeam(data.team as Team);
        showToast({ type: "success", message: t("teams.formTeamSuccess") });
      } else {
        showToast({ type: "error", message: getApiErrorMessage(data, t("teams.formTeamFailed")) });
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
      const data = await response.json();
      if (data.success) {
        showToast({ type: "success", message: t("teams.deleteTeamSuccess") });
        window.setTimeout(() => { window.location.href = "/my-teams"; }, 1500);
      } else {
        showToast({ type: "error", message: getApiErrorMessage(data, t("teams.deleteTeamFailed")) });
      }
    } catch {
      showToast({ type: "error", message: t("teams.deleteTeamFailed") });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [teamId, showToast, t]);

  const allMembers = React.useMemo(() => team?.participants ?? [], [team?.participants]);
  const isLeader = memberStatus === "leader";
  const isMember = memberStatus === "member";
  const isPending = memberStatus === "pending";
  const isFull = team?.isFull ?? false;
  const canJoin = Boolean(team) && !isLeader && !isMember && !isPending && isTeamJoinable(team!);
  const remaining = team ? Math.max(0, team.maxParticipants - team.activeParticipantCount) : 0;
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
    joinMsg,
    setJoinMsg,
    showJoinModal,
    setShowJoinModal,
    showShare,
    setShowShare,
    showLeave,
    setShowLeave,
    showFormConfirm,
    setShowFormConfirm,
    isForming,
    showWechatConfirm,
    setShowWechatConfirm,
    showWechatSheet,
    setShowWechatSheet,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting,
    statusLoadFailed,
    applications,
    allMembers,
    isLeader,
    isMember,
    isPending,
    canJoin,
    isFull,
    remaining,
    location,
    handleJoin,
    handleSaveWechat,
    handleLeave,
    handleApprove,
    handleReject,
    handleFormTeam,
    handleDelete,
    loadTeam,
    show: showToast,
  };
}
