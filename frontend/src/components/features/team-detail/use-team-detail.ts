"use client";

import * as React from "react";
import { fetchAPI } from "@/lib/api";
import type { Team, TeamMember, Application, Location } from "@/lib/types";
import { useI18n } from "@/hooks/useI18n";

interface ToastOptions {
  type: "success" | "error";
  message: string;
}

export function useToast() {
  const [toast, setToast] = React.useState<ToastOptions | null>(null);
  const [exiting, setExiting] = React.useState(false);
  const show = (opts: ToastOptions) => {
    setExiting(false);
    setToast(opts);
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => setToast(null), 200);
    }, 2500);
  };
  return { toast, exiting, show };
}

interface UseTeamDetailReturn {
  toast: ToastOptions | null;
  exiting: boolean;
  team: Team | null;
  loading: boolean;
  error: string | null;
  userId: string | null;
  memberStatus: string | null;
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
  applications: Application[];
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
  handleApprove: (uid: string) => Promise<void>;
  handleReject: (uid: string) => Promise<void>;
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
  const [memberStatus, setMemberStatus] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(false);
  const [joinMsg, setJoinMsg] = React.useState("");
  const [showJoinModal, setShowJoinModal] = React.useState(false);
  const [showShare, setShowShare] = React.useState(false);
  const [showLeave, setShowLeave] = React.useState(false);
  const [showFormConfirm, setShowFormConfirm] = React.useState(false);
  const [isForming, setIsForming] = React.useState(false);
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [showWechatConfirm, setShowWechatConfirm] = React.useState(false);
  const [showWechatSheet, setShowWechatSheet] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [statusLoadFailed, setStatusLoadFailed] = React.useState(false);
  const { toast, exiting, show: showToast } = useToast();

  const loadAllData = React.useCallback(async () => {
    setLoading(true);
    try {
      // 并行获取队伍数据和用户 session
      const [teamRes, sessionRes] = await Promise.all([
        fetchAPI(`/api/teams/${teamId}`),
        fetchAPI("/auth/get-session"),
      ]);

      // 处理队伍数据
      if (teamRes.status === 404) {
        setError(t('teams.notFound'));
        setLoading(false);
        return;
      }
      const teamData = await teamRes.json();
      if (teamData.success && teamData.team) {
        setTeam(teamData.team);
      } else {
        setError(t('teams.notFound'));
        setLoading(false);
        return;
      }

      // 处理用户 session
      const sessionData = await sessionRes.json();
      if (sessionData?.user?.id) {
        setUserId(sessionData.user.id);

        // 获取用户状态
        try {
          const statusRes = await fetchAPI(`/api/teams/${teamId}/my-status`);
          const statusData = await statusRes.json();
          if (statusData.success) setMemberStatus(statusData.status);
          setStatusLoadFailed(false);
        } catch (e) {
          console.error("Failed to fetch member status:", e);
          setStatusLoadFailed(true);
        }
      } else {
        setStatusLoadFailed(false);
      }
    } catch {
      setError(t('teams.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [teamId, t]);

  // 保留单独的刷新方法供其他操作使用
  const loadTeam = React.useCallback(async () => {
    try {
      const res = await fetchAPI(`/api/teams/${teamId}`);
      if (res.status === 404) {
        setError(t('teams.notFound'));
        return;
      }
      const data = await res.json();
      if (data.success && data.team) setTeam(data.team);
      else setError(t('teams.notFound'));
    } catch {
      setError(t('teams.loadFailed'));
    }
  }, [teamId, t]);

  const _checkUser = React.useCallback(async () => {
    try {
      const sessionRes = await fetchAPI("/auth/get-session");
      const sessionData = await sessionRes.json();

      if (sessionData?.user?.id) {
        setUserId(sessionData.user.id);
        const statusRes = await fetchAPI(`/api/teams/${teamId}/my-status`);
        const statusData = await statusRes.json();
        if (statusData.success) setMemberStatus(statusData.status);
        setStatusLoadFailed(false);
      } else {
        setStatusLoadFailed(false);
      }
    } catch (e) {
      console.error("Failed to check user status:", e);
      setStatusLoadFailed(true);
    }
  }, [teamId]);

  const fetchApplications = React.useCallback(async () => {
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/applications?status=pending`);
      const data = await res.json();
      if (data.success) setApplications(data.applications || []);
    } catch {
      console.warn('Failed to fetch applications');
    }
  }, [teamId]);

  React.useEffect(() => {
    loadAllData();
  }, [teamId, loadAllData]);

  React.useEffect(() => {
    if (team && userId && team.leader?.id === userId) fetchApplications();
  }, [team?.id, userId, fetchApplications]);

  const handleJoin = React.useCallback(async () => {
    if (!userId) {
      showToast({ type: "error", message: t("teams.toast.loginFirst") });
      setTimeout(() => {
        window.location.href = `/login?redirect=/teams/${teamId}`;
      }, 1000);
      return;
    }
    setJoining(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/join`, {
        method: "POST",
        body: JSON.stringify({ message: joinMsg }),
      });
      const data = await res.json();
      if (data.success) {
        setMemberStatus("pending");
        setShowJoinModal(false);
        showToast({ type: "success", message: t('teams.applied') });
        loadTeam();
      } else {
        const errorMsg = data.error || t('errors.joinFailed');
        if (errorMsg.includes("微信") || errorMsg.includes("wechat")) {
          setShowJoinModal(false);
          setTimeout(() => setShowWechatConfirm(true), 300);
        } else {
          showToast({ type: "error", message: errorMsg });
        }
      }
    } catch {
      showToast({ type: "error", message: t('errors.joinFailed') });
    } finally {
      setJoining(false);
    }
  }, [userId, teamId, joinMsg, showToast, loadTeam]);

  const handleSaveWechat = React.useCallback(async (wechat: string) => {
    if (!wechat.trim()) {
      showToast({ type: "error", message: t("teams.toast.wechatEmpty") });
      return;
    }
    try {
      const res = await fetchAPI("/api/user/update", {
        method: "PATCH",
        body: JSON.stringify({ userId, wechat: wechat.trim() }),
      });
      const data = await res.json();
      if (data.success || data.user) {
        setShowWechatSheet(false);
        showToast({ type: "success", message: t("teams.toast.wechatSavedReapply") });
      } else {
        showToast({ type: "error", message: t("teams.toast.wechatSaveFailed") });
      }
    } catch {
      showToast({ type: "error", message: t("teams.toast.wechatSaveFailed") });
    }
  }, [userId, showToast]);

  const handleLeave = React.useCallback(async () => {
    setShowLeave(false);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/leave`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMemberStatus(null);
        showToast({ type: "success", message: t('teams.leftTeam') });
        loadTeam();
      } else {
        showToast({ type: "error", message: data.error || t('errors.leaveFailed') });
      }
    } catch {
      showToast({ type: "error", message: t('errors.leaveFailed') });
    }
  }, [teamId, showToast, loadTeam]);

  const handleApprove = React.useCallback(async (uid: string) => {
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/members/${uid}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast({ type: "success", message: t('teams.approved') });
        setApplications((prev) => prev.filter((a) => a.userId !== uid));
        loadTeam();
      } else {
        showToast({ type: "error", message: data.error || t('errors.reviewFailed') });
      }
    } catch {
      showToast({ type: "error", message: t('errors.reviewFailed') });
    }
  }, [teamId, showToast, loadTeam]);

  const handleReject = React.useCallback(async (uid: string) => {
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/members/${uid}/reject`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast({ type: "success", message: t('teams.rejected') });
        setApplications((prev) => prev.filter((a) => a.userId !== uid));
      } else {
        showToast({ type: "error", message: data.error || t('errors.reviewFailed') });
      }
    } catch {
      showToast({ type: "error", message: t('errors.reviewFailed') });
    }
  }, [teamId, showToast]);

  const handleFormTeam = React.useCallback(async () => {
    setIsForming(true);
    const isFull = team ? team.currentMembers >= team.maxMembers : false;
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUnderfilled: !isFull }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ type: "success", message: t('teams.formTeamSuccess') });
        loadTeam();
      } else {
        showToast({ type: "error", message: data.error || t('teams.formTeamFailed') });
      }
    } catch {
      showToast({ type: "error", message: t('teams.formTeamFailed') });
    } finally {
      setIsForming(false);
      setShowFormConfirm(false);
    }
  }, [teamId, team, showToast, loadTeam]);

  const handleDelete = React.useCallback(async () => {
    setIsDeleting(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast({ type: "success", message: t('teams.deleteTeamSuccess') });
        setTimeout(() => window.location.href = "/my-teams", 1500);
      } else {
        showToast({ type: "error", message: data.error || t('teams.deleteTeamFailed') });
      }
    } catch {
      showToast({ type: "error", message: t('teams.deleteTeamFailed') });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [teamId, showToast]);

  const members = team?.members || [];
  const allMembers = React.useMemo(() => {
    if (!team?.leader) return members;
    const leaderInMembers = members.find(m => m.userId === team.leader?.id);
    if (leaderInMembers) return members;
    const leaderAsMember: TeamMember = {
      id: `leader-${team.leader.id}`,
      userId: team.leader.id,
      name: String(team.leader.name),
      nickname: team.leader.nickname ?? null,
      avatar: team.leader.avatar ?? null,
      bio: team.leader.bio ?? null,
      level: String(team.leader.level || "beginner"),
      joinedAt: team.createdAt,
      wechat: team.leader.wechat ?? undefined,
      gender: team.leader.gender ?? null,
      birthday: team.leader.birthday ?? null,
      extra: team.leader.extra ?? null,
    };
    return [leaderAsMember, ...members];
  }, [members, team?.leader, team?.createdAt]);

  const isLeader = !!(userId && team?.leader?.id === userId);
  const isMember = memberStatus === "approved";
  const isPending = memberStatus === "pending";
  const isFull = team ? team.currentMembers >= team.maxMembers : false;
  const canJoin = !isLeader && !isMember && !isPending && team?.status === "recruiting" && !isFull;
  const remaining = team ? team.maxMembers - team.currentMembers : 0;
  const location = team?.location ?? null;

  return {
    toast, exiting,
    team, loading, error, userId, memberStatus,
    joining, joinMsg, setJoinMsg,
    showJoinModal, setShowJoinModal,
    showShare, setShowShare,
    showLeave, setShowLeave,
    showFormConfirm, setShowFormConfirm,
    isForming,
    showWechatConfirm, setShowWechatConfirm,
    showWechatSheet, setShowWechatSheet,
    showDeleteConfirm, setShowDeleteConfirm,
    isDeleting, statusLoadFailed,
    applications, allMembers,
    isLeader, isMember, isPending, canJoin, isFull, remaining, location,
    handleJoin, handleSaveWechat, handleLeave, handleApprove, handleReject,
    handleFormTeam, handleDelete, loadTeam,
    show: showToast,
  };
}
