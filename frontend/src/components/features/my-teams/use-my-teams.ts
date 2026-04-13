"use client";

import * as React from "react";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { useI18n } from "@/hooks/useI18n";
import type { SessionUser } from "@/lib/types";
import type { TeamItem, ApplicationRecord, PendingApproval } from "./my-teams-types";

export function useMyTeams() {
  const { t } = useI18n(["teams"]);
  const [currentUser, setCurrentUser] = React.useState<SessionUser | null>(null);
  const [activeTab, setActiveTab] = React.useState("participated");
  const [applicationSubTab, setApplicationSubTab] = React.useState<"my" | "pending">("my");
  const [roleFilter, setRoleFilter] = React.useState<"all" | "leader" | "member">("all");

  // Pagination
  const [createdPage, setCreatedPage] = React.useState(1);
  const [createdHasMore, setCreatedHasMore] = React.useState(false);
  const [createdLoadingMore, setCreatedLoadingMore] = React.useState(false);
  const [joinedPage, setJoinedPage] = React.useState(1);
  const [joinedHasMore, setJoinedHasMore] = React.useState(false);
  const [joinedLoadingMore, setJoinedLoadingMore] = React.useState(false);
  const [applicationsPage, setApplicationsPage] = React.useState(1);
  const [applicationsHasMore, setApplicationsHasMore] = React.useState(false);
  const [applicationsLoadingMore, setApplicationsLoadingMore] = React.useState(false);
  const [pendingPage, setPendingPage] = React.useState(1);
  const [pendingHasMore, setPendingHasMore] = React.useState(false);
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
      .then((user) => { if (user) setCurrentUser(user as unknown as SessionUser); });
  }, []);

  // Data loaders
  const loadCreatedTeams = React.useCallback(async (page: number, append = false) => {
    if (!currentUser?.id) return;
    if (append) setCreatedLoadingMore(true); else setCreatedLoading(true);
    try {
      const r = await fetchAPI(`/api/user/created-teams?page=${page}&pageSize=10`);
      const data = await r.json();
      if (data.success) {
        if (append) setCreatedTeams((prev) => [...prev, ...data.teams]);
        else setCreatedTeams(data.teams || []);
        setCreatedHasMore(data.pagination?.hasMore || false);
      }
    } finally { setCreatedLoading(false); setCreatedLoadingMore(false); }
  }, [currentUser?.id]);

  const loadJoinedTeams = React.useCallback(async (page: number, append = false) => {
    if (!currentUser?.id) return;
    if (append) setJoinedLoadingMore(true); else setJoinedLoading(true);
    try {
      const r = await fetchAPI(`/api/user/teams/joined?page=${page}&pageSize=10`);
      const data = await r.json();
      if (data.success) {
        if (append) setJoinedTeams((prev) => [...prev, ...data.teams]);
        else setJoinedTeams(data.teams || []);
        setJoinedHasMore(data.pagination?.hasMore || false);
      }
    } finally { setJoinedLoading(false); setJoinedLoadingMore(false); }
  }, [currentUser?.id]);

  const loadApplications = React.useCallback(async (page: number, append = false) => {
    if (!currentUser?.id) return;
    if (append) setApplicationsLoadingMore(true); else setApplicationsLoading(true);
    try {
      const r = await fetchAPI(`/api/user/applications?page=${page}&pageSize=10`);
      const data = await r.json();
      if (data.success) {
        if (append) setApplications((prev) => [...prev, ...data.applications]);
        else setApplications(data.applications || []);
        setApplicationsHasMore(data.pagination?.hasMore || false);
      }
    } finally { setApplicationsLoading(false); setApplicationsLoadingMore(false); }
  }, [currentUser?.id]);

  const loadPendingApprovals = React.useCallback(async (page: number, append = false) => {
    if (!currentUser?.id) return;
    if (append) setPendingLoadingMore(true); else setPendingLoading(true);
    try {
      const r = await fetchAPI(`/api/user/pending-approvals?page=${page}&pageSize=10`);
      const data = await r.json();
      if (data.success) {
        if (append) setPendingApprovals((prev) => [...prev, ...data.approvals]);
        else setPendingApprovals(data.approvals || []);
        setPendingHasMore(data.pagination?.hasMore || false);
      }
    } finally { setPendingLoading(false); setPendingLoadingMore(false); }
  }, [currentUser?.id]);

  // Initial loads
  React.useEffect(() => { if (currentUser?.id && createdPage === 1) loadCreatedTeams(1); }, [currentUser?.id, loadCreatedTeams]);
  React.useEffect(() => { if (createdPage > 1) loadCreatedTeams(createdPage, true); }, [createdPage, loadCreatedTeams]);
  React.useEffect(() => { if (currentUser?.id && joinedPage === 1) loadJoinedTeams(1); }, [currentUser?.id, loadJoinedTeams]);
  React.useEffect(() => { if (joinedPage > 1) loadJoinedTeams(joinedPage, true); }, [joinedPage, loadJoinedTeams]);
  React.useEffect(() => { if (currentUser?.id && applicationsPage === 1) loadApplications(1); }, [currentUser?.id, loadApplications]);
  React.useEffect(() => { if (applicationsPage > 1) loadApplications(applicationsPage, true); }, [applicationsPage, loadApplications]);
  React.useEffect(() => { if (currentUser?.id && pendingPage === 1) loadPendingApprovals(1); }, [currentUser?.id, loadPendingApprovals]);
  React.useEffect(() => { if (pendingPage > 1) loadPendingApprovals(pendingPage, true); }, [pendingPage, loadPendingApprovals]);

  const refreshPendingApprovals = async () => {
    setPendingPage(1);
    loadPendingApprovals(1);
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
      const r = await fetchAPI(`/api/teams/${selectedApproval.teamId}/members/${selectedApproval.userId}/approve`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setActionMessage("已通过申请"); setIsDetailOpen(false);
        await refreshPendingApprovals();
      } else { setActionMessage(data.error || "操作失败"); }
    } catch { setActionMessage("操作失败，请重试"); }
    finally { setIsProcessing(false); }
  };

  const handleConfirmReject = async () => {
    if (!selectedApproval) return;
    setIsProcessing(true);
    try {
      const r = await fetchAPI(`/api/teams/${selectedApproval.teamId}/members/${selectedApproval.userId}/reject`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setActionMessage("已拒绝申请"); setIsRejectConfirmOpen(false); setIsDetailOpen(false);
        await refreshPendingApprovals();
      } else { setActionMessage(data.error || "操作失败"); }
    } catch { setActionMessage("操作失败，请重试"); }
    finally { setIsProcessing(false); }
  };

  const handleCancelTeam = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const r = await fetchAPI(`/api/teams/${cancelTarget}/cancel`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setCreatedTeams((prev) => prev.map((t) => (t.id === cancelTarget ? { ...t, status: "cancelled" } : t)));
        setActionMessage(t('teams.cancelTeamSuccess')); setCancelTarget(null);
      } else { setActionMessage(data.error || t('teams.cancelTeamFailed')); }
    } catch { setActionMessage(t('teams.cancelTeamFailed')); }
    finally { setIsCancelling(false); setTimeout(() => setActionMessage(""), 3000); }
  };

  const handleFormTeam = async () => {
    if (!formTarget) return;
    const targetTeam = createdTeams.find((t) => t.id === formTarget);
    if (!targetTeam) return;
    const isFull = targetTeam.currentMembers >= targetTeam.maxMembers;
    setIsForming(true);
    try {
      const r = await fetchAPI(`/api/teams/${formTarget}/form`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUnderfilled: !isFull }),
      });
      const data = await r.json();
      if (data.success) {
        setCreatedTeams((prev) => prev.map((t) => (t.id === formTarget ? { ...t, status: "formed" } : t)));
        setActionMessage(t('teams.formTeamSuccess')); setFormTarget(null);
      } else { setActionMessage(data.error || t('teams.formTeamFailed')); }
    } catch { setActionMessage(t('teams.formTeamFailed')); }
    finally { setIsForming(false); setTimeout(() => setActionMessage(""), 3000); }
  };

  const activeCreated = createdTeams.filter((t) => ["recruiting", "full", "formed", "ongoing"].includes(t.status));
  const archivedCreated = createdTeams.filter((t) => ["completed", "cancelled"].includes(t.status));
  const activeJoined = joinedTeams.filter((t) => ["recruiting", "full", "formed", "ongoing"].includes(t.status));
  const archivedJoined = joinedTeams.filter((t) => ["completed", "cancelled"].includes(t.status));
  const pendingApplicationsCount = applications.filter((a) => a.status === "pending").length;

  return {
    currentUser, activeTab, applicationSubTab, roleFilter,
    createdPage, createdHasMore, createdLoadingMore,
    joinedPage, joinedHasMore, joinedLoadingMore,
    applicationsPage, applicationsHasMore, applicationsLoadingMore,
    pendingPage, pendingHasMore, pendingLoadingMore,
    createdTeams, createdLoading, joinedTeams, joinedLoading,
    applications, applicationsLoading, pendingApprovals, pendingLoading,
    selectedApproval, isDetailOpen, isRejectConfirmOpen,
    isProcessing, actionMessage, cancelTarget, isCancelling, formTarget, isForming,
    activeCreated, archivedCreated, activeJoined, archivedJoined,
    pendingApplicationsCount,
    setCreatedPage, setJoinedPage, setApplicationsPage, setPendingPage,
    handleTabChange, handleSubTabChange, handleRoleFilterChange,
    handleApprove, handleConfirmReject, handleCancelTeam, handleFormTeam,
    setSelectedApproval, setIsDetailOpen, setIsRejectConfirmOpen,
    setActionMessage, setCancelTarget, setFormTarget,
  };
}
