"use client";

import * as React from "react";
import { fetchAPI, fetchCurrentUser, getApiErrorMessage } from "@/lib/api";
import { useI18n } from "@/hooks/useI18n";
import type { SessionUser } from "@/lib/types";
import type { TeamItem, ApplicationRecord, PendingApproval } from "./my-teams-types";

export function buildTimelinePath(path: string, cursor: string | null, limit = 10): string {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return `${path}?${query}`;
}

export function mergeUniqueById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const seen = new Set(current.map((item) => item.id));
  const merged = [...current];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

export function useMyTeams() {
  const { t } = useI18n(["teams"]);
  const [currentUser, setCurrentUser] = React.useState<SessionUser | null>(null);
  const [activeTab, setActiveTab] = React.useState("participated");
  const [applicationSubTab, setApplicationSubTab] = React.useState<"my" | "pending">("my");
  const [roleFilter, setRoleFilter] = React.useState<"all" | "leader" | "member">("all");

  // Stable timeline cursors
  const [createdCursor, setCreatedCursor] = React.useState<string | null>(null);
  const [createdLoadingMore, setCreatedLoadingMore] = React.useState(false);
  const [joinedCursor, setJoinedCursor] = React.useState<string | null>(null);
  const [joinedLoadingMore, setJoinedLoadingMore] = React.useState(false);
  const [applicationsCursor, setApplicationsCursor] = React.useState<string | null>(null);
  const [applicationsLoadingMore, setApplicationsLoadingMore] = React.useState(false);
  const [pendingCursor, setPendingCursor] = React.useState<string | null>(null);
  const [pendingLoadingMore, setPendingLoadingMore] = React.useState(false);

  // Data
  const [createdTeams, setCreatedTeams] = React.useState<TeamItem[]>([]);
  const [createdLoading, setCreatedLoading] = React.useState(true);
  const [joinedTeams, setJoinedTeams] = React.useState<TeamItem[]>([]);
  const [joinedLoading, setJoinedLoading] = React.useState(true);
  const [applications, setApplications] = React.useState<ApplicationRecord[]>([]);
  const [applicationsLoading, setApplicationsLoading] = React.useState(true);
  const [pendingApprovals, setPendingApprovals] = React.useState<PendingApproval[]>([]);
  const [pendingLoading, setPendingLoading] = React.useState(true);

  // Modals / actions
  const [selectedApproval, setSelectedApproval] = React.useState<PendingApproval | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState("");
  const [cancelTarget, setCancelTarget] = React.useState<string | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [formTarget, setFormTarget] = React.useState<string | null>(null);
  const [isForming, setIsForming] = React.useState(false);

  // URL params init
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") || "participated";
    const tabMap: Record<string, string> = {
      created: "participated", joined: "participated", formed: "participated",
      history: "participated", initiated: "participated", pending: "applications",
    };
    const mappedTab = tabMap[tab] || tab;
    if (["participated", "applications"].includes(mappedTab)) {
      setActiveTab(mappedTab);
      if (mappedTab === "participated") {
        const role = params.get("role");
        if (role === "leader") setRoleFilter("leader");
        else if (role === "member") setRoleFilter("member");
        else setRoleFilter("all");
      }
      if (mappedTab === "applications") {
        const sub = params.get("sub");
        if (sub === "pending") setApplicationSubTab("pending");
        else setApplicationSubTab("my");
      }
    }
  }, []);

  // Fetch current user
  React.useEffect(() => {
    fetchCurrentUser(`/login?redirect=/my-teams`)
      .then((user) => { if (user) setCurrentUser(user); });
  }, []);

  // Data loaders
  const loadCreatedTeams = React.useCallback(async (cursor: string | null, append = false) => {
    if (!currentUser?.id) return;
    if (append) setCreatedLoadingMore(true); else setCreatedLoading(true);
    try {
      const r = await fetchAPI(buildTimelinePath("/users/me/created-teams", cursor));
      const data = await r.json();
      if (data.success) {
        if (append) setCreatedTeams((prev) => mergeUniqueById(prev, data.teams || []));
        else setCreatedTeams(data.teams || []);
        setCreatedCursor(data.nextCursor ?? null);
      }
    } finally { setCreatedLoading(false); setCreatedLoadingMore(false); }
  }, [currentUser?.id]);

  const loadJoinedTeams = React.useCallback(async (cursor: string | null, append = false) => {
    if (!currentUser?.id) return;
    if (append) setJoinedLoadingMore(true); else setJoinedLoading(true);
    try {
      const r = await fetchAPI(buildTimelinePath("/users/me/joined-teams", cursor));
      const data = await r.json();
      if (data.success) {
        if (append) setJoinedTeams((prev) => mergeUniqueById(prev, data.teams || []));
        else setJoinedTeams(data.teams || []);
        setJoinedCursor(data.nextCursor ?? null);
      }
    } finally { setJoinedLoading(false); setJoinedLoadingMore(false); }
  }, [currentUser?.id]);

  const loadApplications = React.useCallback(async (cursor: string | null, append = false) => {
    if (!currentUser?.id) return;
    if (append) setApplicationsLoadingMore(true); else setApplicationsLoading(true);
    try {
      const r = await fetchAPI(buildTimelinePath("/users/me/join-requests", cursor));
      const data = await r.json();
      if (data.success) {
        if (append) setApplications((prev) => mergeUniqueById(prev, data.requests || []));
        else setApplications(data.requests || []);
        setApplicationsCursor(data.nextCursor ?? null);
      }
    } finally { setApplicationsLoading(false); setApplicationsLoadingMore(false); }
  }, [currentUser?.id]);

  const loadPendingApprovals = React.useCallback(async (cursor: string | null, append = false) => {
    if (!currentUser?.id) return;
    if (append) setPendingLoadingMore(true); else setPendingLoading(true);
    try {
      const r = await fetchAPI(buildTimelinePath("/users/me/pending-join-requests", cursor));
      const data = await r.json();
      if (data.success) {
        if (append) setPendingApprovals((prev) => mergeUniqueById(prev, data.requests || []));
        else setPendingApprovals(data.requests || []);
        setPendingCursor(data.nextCursor ?? null);
      }
    } finally { setPendingLoading(false); setPendingLoadingMore(false); }
  }, [currentUser?.id]);

  // Initial loads
  React.useEffect(() => {
    if (!currentUser?.id) return;
    void Promise.all([
      loadCreatedTeams(null),
      loadJoinedTeams(null),
      loadApplications(null),
      loadPendingApprovals(null),
    ]);
  }, [currentUser?.id, loadCreatedTeams, loadJoinedTeams, loadApplications, loadPendingApprovals]);

  const loadMoreCreated = React.useCallback(() => {
    if (!createdCursor || createdLoadingMore) return;
    void loadCreatedTeams(createdCursor, true);
  }, [createdCursor, createdLoadingMore, loadCreatedTeams]);
  const loadMoreJoined = React.useCallback(() => {
    if (!joinedCursor || joinedLoadingMore) return;
    void loadJoinedTeams(joinedCursor, true);
  }, [joinedCursor, joinedLoadingMore, loadJoinedTeams]);
  const loadMoreApplications = React.useCallback(() => {
    if (!applicationsCursor || applicationsLoadingMore) return;
    void loadApplications(applicationsCursor, true);
  }, [applicationsCursor, applicationsLoadingMore, loadApplications]);
  const loadMorePending = React.useCallback(() => {
    if (!pendingCursor || pendingLoadingMore) return;
    void loadPendingApprovals(pendingCursor, true);
  }, [pendingCursor, pendingLoadingMore, loadPendingApprovals]);

  const refreshPendingApprovals = async () => {
    setPendingCursor(null);
    await loadPendingApprovals(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab); setApplicationSubTab("my"); setRoleFilter("all");
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab); params.delete("sub"); params.delete("role");
    window.history.replaceState(null, "", `/my-teams?${params.toString()}`);
  };

  const handleSubTabChange = (subTab: "my" | "pending") => {
    setApplicationSubTab(subTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "applications"); params.set("sub", subTab);
    window.history.replaceState(null, "", `/my-teams?${params.toString()}`);
  };

  const handleRoleFilterChange = (filter: "all" | "leader" | "member") => {
    setRoleFilter(filter);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "participated");
    if (filter === "all") params.delete("role"); else params.set("role", filter);
    window.history.replaceState(null, "", `/my-teams?${params.toString()}`);
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setIsProcessing(true);
    try {
      const r = await fetchAPI(`/teams/${selectedApproval.teamId}/join-requests/${selectedApproval.id}/approve`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setActionMessage(t("teams.approved")); setIsDetailOpen(false);
        await refreshPendingApprovals();
      } else { setActionMessage(data.error?.message || t("teams.toasts.approveFailed")); }
    } catch { setActionMessage(t("teams.toasts.approveFailed")); }
    finally { setIsProcessing(false); }
  };

  const handleConfirmReject = async () => {
    if (!selectedApproval) return;
    setIsProcessing(true);
    try {
      const r = await fetchAPI(`/teams/${selectedApproval.teamId}/join-requests/${selectedApproval.id}/reject`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setActionMessage(t("teams.rejected")); setIsRejectConfirmOpen(false); setIsDetailOpen(false);
        await refreshPendingApprovals();
      } else { setActionMessage(data.error?.message || t("teams.toasts.rejectFailed")); }
    } catch { setActionMessage(t("teams.toasts.rejectFailed")); }
    finally { setIsProcessing(false); }
  };

  const handleCancelTeam = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const r = await fetchAPI(`/teams/${cancelTarget}/cancel`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setCreatedTeams((prev) => prev.map((team) => (team.id === cancelTarget ? data.team : team)));
        setActionMessage(t('teams.cancelTeamSuccess')); setCancelTarget(null);
      } else { setActionMessage(getApiErrorMessage(data, t('teams.cancelTeamFailed'))); }
    } catch { setActionMessage(t('teams.cancelTeamFailed')); }
    finally { setIsCancelling(false); setTimeout(() => setActionMessage(""), 3000); }
  };

  const handleFormTeam = async () => {
    if (!formTarget) return;
    const targetTeam = createdTeams.find((t) => t.id === formTarget);
    if (!targetTeam) return;
    setIsForming(true);
    try {
      const r = await fetchAPI(`/teams/${formTarget}/form`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setCreatedTeams((prev) => prev.map((team) => (team.id === formTarget ? data.team : team)));
        setActionMessage(t('teams.formTeamSuccess')); setFormTarget(null);
      } else { setActionMessage(getApiErrorMessage(data, t('teams.formTeamFailed'))); }
    } catch { setActionMessage(t('teams.formTeamFailed')); }
    finally { setIsForming(false); setTimeout(() => setActionMessage(""), 3000); }
  };

  const activeCreated = createdTeams.filter((team) => ["pending", "formed", "in_progress"].includes(team.lifecycle));
  const archivedCreated = createdTeams.filter((team) => ["completed", "cancelled", "expired_unformed"].includes(team.lifecycle));
  const activeJoined = joinedTeams.filter((team) => ["pending", "formed", "in_progress"].includes(team.lifecycle));
  const archivedJoined = joinedTeams.filter((team) => ["completed", "cancelled", "expired_unformed"].includes(team.lifecycle));
  const pendingApplicationsCount = applications.filter((a) => a.status === "pending").length;

  return {
    currentUser, activeTab, applicationSubTab, roleFilter,
    createdHasMore: Boolean(createdCursor), createdLoadingMore,
    joinedHasMore: Boolean(joinedCursor), joinedLoadingMore,
    applicationsHasMore: Boolean(applicationsCursor), applicationsLoadingMore,
    pendingHasMore: Boolean(pendingCursor), pendingLoadingMore,
    createdTeams, createdLoading, joinedTeams, joinedLoading,
    applications, applicationsLoading, pendingApprovals, pendingLoading,
    selectedApproval, isDetailOpen, isRejectConfirmOpen,
    isProcessing, actionMessage, cancelTarget, isCancelling, formTarget, isForming,
    activeCreated, archivedCreated, activeJoined, archivedJoined,
    pendingApplicationsCount,
    loadMoreCreated, loadMoreJoined, loadMoreApplications, loadMorePending,
    handleTabChange, handleSubTabChange, handleRoleFilterChange,
    handleApprove, handleConfirmReject, handleCancelTeam, handleFormTeam,
    setSelectedApproval, setIsDetailOpen, setIsRejectConfirmOpen,
    setActionMessage, setCancelTarget, setFormTarget,
  };
}
