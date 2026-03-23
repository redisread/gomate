"use client";

import * as React from "react";
import {
  Plus, Users, MapPin, Calendar, Crown, User,
  ChevronRight, ChevronDown, Clock, Hourglass, CheckCircle,
  XCircle, ClipboardCheck, Loader2, Mountain,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI, fetchCurrentUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { SessionUser } from "@/lib/types";

const c = copy.myTeams;

// 状态标签
const statusLabels: Record<string, { label: string; color: string; dot: string }> = {
  recruiting: { label: c.statusRecruiting, color: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
  full: { label: c.statusFull, color: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
  formed: { label: c.statusFormed, color: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
  ongoing: { label: "进行中", color: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
  completed: { label: c.statusCompleted, color: "bg-stone-100 text-stone-500 border border-stone-200", dot: "bg-stone-400" },
  cancelled: { label: c.statusCancelled, color: "bg-red-50 text-red-600 border border-red-200", dot: "bg-red-400" },
};

// 申请状态标签
const applicationStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: c.appStatusPending, color: "bg-amber-50 text-amber-700 border border-amber-200", icon: Hourglass },
  approved: { label: c.appStatusApproved, color: "bg-amber-50 text-amber-700 border border-amber-200", icon: CheckCircle },
  rejected: { label: c.appStatusRejected, color: "bg-stone-100 text-stone-500 border border-stone-200", icon: XCircle },
};

// 等级标签
const levelConfig: Record<string, { label: string; emoji: string; color: string }> = {
  beginner: { label: c.levelBeginner, emoji: "🌱", color: "bg-green-50 text-green-700 border border-green-200" },
  intermediate: { label: c.levelIntermediate, emoji: "🥾", color: "bg-blue-50 text-blue-700 border border-blue-200" },
  advanced: { label: c.levelAdvanced, emoji: "⛰️", color: "bg-purple-50 text-purple-700 border border-purple-200" },
  expert: { label: c.levelExpert, emoji: "🏔️", color: "bg-amber-50 text-amber-700 border border-amber-200" },
};

interface ApplicationRecord {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  team: {
    id: string;
    title: string;
    date: string | null;
    time: string | null;
    currentMembers: number;
    maxMembers: number;
    status: string;
    location: { id: string; name: string; coverImage: string } | null;
    leader: { id: string; name: string; avatar: string | null } | null;
  } | null;
}

interface PendingApproval {
  id: string;
  teamId: string;
  userId: string;
  createdAt: string;
  team: {
    id: string;
    title: string;
    date: string | null;
    time: string | null;
    currentMembers: number;
    maxMembers: number;
    location: { id: string; name: string; coverImage: string } | null;
  } | null;
  applicant: {
    id: string;
    name: string;
    avatar: string | null;
    bio: string | null;
    level: string;
    wechat?: string | null;
  } | null;
}

interface TeamItem {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  currentMembers: number;
  maxMembers: number;
  status: string;
  location: { id: string; name: string; coverImage: string } | null;
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `${minutes}${c.minutesAgo}`;
  if (hours < 24) return `${hours}${c.hoursAgo}`;
  return `${days}${c.daysAgo}`;
}

/**
 * 我的队伍页客户端组件 - React Island
 */
export function MyTeamsClient() {
  const [currentUser, setCurrentUser] = React.useState<SessionUser | null>(null);
  const [activeTab, setActiveTab] = React.useState("created");

  const [createdTeams, setCreatedTeams] = React.useState<TeamItem[]>([]);
  const [createdLoading, setCreatedLoading] = React.useState(true);

  const [joinedTeams, setJoinedTeams] = React.useState<TeamItem[]>([]);
  const [joinedLoading, setJoinedLoading] = React.useState(true);

  const [applications, setApplications] = React.useState<ApplicationRecord[]>([]);
  const [applicationsLoading, setApplicationsLoading] = React.useState(true);

  const [pendingApprovals, setPendingApprovals] = React.useState<PendingApproval[]>([]);
  const [pendingLoading, setPendingLoading] = React.useState(true);

  const [selectedApproval, setSelectedApproval] = React.useState<PendingApproval | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState("");

  const [cancelTarget, setCancelTarget] = React.useState<string | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") || "created";
    if (["created", "joined", "applications", "pending", "history"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  React.useEffect(() => {
    fetchCurrentUser(`/login?redirect=/my-teams`)
      .then((user) => {
        if (user) setCurrentUser(user as SessionUser);
      });
  }, []);

  React.useEffect(() => {
    if (!currentUser?.id) return;
    setCreatedLoading(true);
    fetchAPI(`/api/teams?leaderId=${currentUser.id}&pageSize=50`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setCreatedTeams(data.teams || []); })
      .finally(() => setCreatedLoading(false));
  }, [currentUser?.id]);

  React.useEffect(() => {
    if (!currentUser?.id) return;
    setJoinedLoading(true);
    fetchAPI("/api/user/teams/joined?pageSize=50")
      .then((r) => r.json())
      .then((data) => { if (data.success) setJoinedTeams(data.teams || []); })
      .finally(() => setJoinedLoading(false));
  }, [currentUser?.id]);

  React.useEffect(() => {
    if (!currentUser?.id) return;
    setApplicationsLoading(true);
    fetchAPI("/api/user/applications")
      .then((r) => r.json())
      .then((data) => { if (data.success) setApplications(data.applications || []); })
      .finally(() => setApplicationsLoading(false));
  }, [currentUser?.id]);

  React.useEffect(() => {
    if (!currentUser?.id) return;
    setPendingLoading(true);
    fetchAPI("/api/user/pending-approvals")
      .then((r) => r.json())
      .then((data) => { if (data.success) setPendingApprovals(data.approvals || []); })
      .finally(() => setPendingLoading(false));
  }, [currentUser?.id]);

  const refreshPendingApprovals = async () => {
    const r = await fetchAPI("/api/user/pending-approvals");
    const data = await r.json();
    if (data.success) setPendingApprovals(data.approvals || []);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    window.history.replaceState(null, "", `/my-teams?${params.toString()}`);
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setIsProcessing(true);
    try {
      const r = await fetchAPI(`/api/teams/${selectedApproval.teamId}/members/${selectedApproval.userId}/approve`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setActionMessage("已通过申请");
        setIsDetailOpen(false);
        await refreshPendingApprovals();
      } else {
        setActionMessage(data.error || "操作失败");
      }
    } catch {
      setActionMessage("操作失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedApproval) return;
    setIsProcessing(true);
    try {
      const r = await fetchAPI(`/api/teams/${selectedApproval.teamId}/members/${selectedApproval.userId}/reject`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setActionMessage("已拒绝申请");
        setIsRejectConfirmOpen(false);
        setIsDetailOpen(false);
        await refreshPendingApprovals();
      } else {
        setActionMessage(data.error || "操作失败");
      }
    } catch {
      setActionMessage("操作失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelTeam = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const r = await fetchAPI(`/api/teams/${cancelTarget}/cancel`, { method: "POST" });
      const data = await r.json();
      if (data.success) {
        setCreatedTeams((prev) =>
          prev.map((t) => (t.id === cancelTarget ? { ...t, status: "cancelled" } : t))
        );
        setActionMessage(copy.teams.cancelTeamSuccess);
        setCancelTarget(null);
      } else {
        setActionMessage(data.error || copy.teams.cancelTeamFailed);
      }
    } catch {
      setActionMessage(copy.teams.cancelTeamFailed);
    } finally {
      setIsCancelling(false);
      setTimeout(() => setActionMessage(""), 3000);
    }
  };

  const activeCreated = createdTeams.filter((t) => ["recruiting", "full", "formed", "ongoing"].includes(t.status));
  const archivedCreated = createdTeams.filter((t) => ["completed", "cancelled"].includes(t.status));
  const activeJoined = joinedTeams.filter((t) => ["recruiting", "full", "formed", "ongoing"].includes(t.status));
  const archivedJoined = joinedTeams.filter((t) => ["completed", "cancelled"].includes(t.status));
  const allHistory = [...archivedCreated, ...archivedJoined].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  );

  const pendingApplicationsCount = applications.filter((a) => a.status === "pending").length;

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-white border-b border-stone-100 pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-stone-400 mb-1">欢迎回来</p>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight">
              {currentUser.nickname || currentUser.name}
            </h1>
            <div className="flex items-center gap-4 mt-3">
              <StatBadge label="已创建" count={activeCreated.length} />
              <StatBadge label="已加入" count={activeJoined.length} />
              {pendingApprovals.length > 0 && (
                <StatBadge label="待审批" count={pendingApprovals.length} highlight />
              )}
            </div>
          </div>

          <a href="/teams/create" className="flex-shrink-0">
            <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm active:scale-95">
              <Plus className="h-4 w-4" />
              发起组队
            </button>
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Toast message */}
        {actionMessage && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-amber-500" />
              {actionMessage}
            </span>
            <button onClick={() => setActionMessage("")} className="text-amber-400 hover:text-amber-600 transition-colors ml-4">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab 导航 */}
        <div className="border-b border-stone-100 mt-2 overflow-x-auto">
          <div className="flex min-w-max">
            {[
              { id: "created", label: c.tabCreated, icon: Crown, count: activeCreated.length },
              { id: "joined", label: c.tabJoined, icon: User, count: activeJoined.length },
              { id: "applications", label: c.tabApplications, icon: ClipboardCheck, count: pendingApplicationsCount },
              { id: "pending", label: c.tabPending, icon: Hourglass, count: pendingApprovals.length },
              { id: "history", label: c.tabHistory, icon: Clock, count: 0 },
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap relative",
                  activeTab === id
                    ? "text-amber-700 border-b-2 border-amber-500"
                    : "text-stone-500 hover:text-stone-700 border-b-2 border-transparent"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {count > 0 && (
                  <span className={cn(
                    "w-2 h-2 rounded-full absolute top-2 right-1.5",
                    id === "pending" ? "bg-amber-500" : "bg-amber-500"
                  )} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content: 我创建的 */}
        {activeTab === "created" && (
          <div className="mt-6 space-y-4">
            {createdLoading ? (
              <LoadingState />
            ) : activeCreated.length === 0 && archivedCreated.length === 0 ? (
              <EmptyState
                icon={Crown}
                title="还没有创建队伍，要不要带队出发？"
                desc={c.emptyCreatedDesc}
                btnLabel={c.emptyCreatedBtn}
                href="/teams/create"
              />
            ) : (
              <>
                {activeCreated.length > 0 && (
                  <CollapsibleSection title={c.activeTeams} count={activeCreated.length}>
                    {activeCreated.map((team) => (
                      <TeamCard key={team.id} team={team} isLeader onCancel={(id) => setCancelTarget(id)} />
                    ))}
                  </CollapsibleSection>
                )}
                {archivedCreated.length > 0 && (
                  <CollapsibleSection title={c.archivedTeams} count={archivedCreated.length} defaultExpanded={false}>
                    {archivedCreated.map((team) => (
                      <TeamCard key={team.id} team={team} isLeader />
                    ))}
                  </CollapsibleSection>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab Content: 已加入 */}
        {activeTab === "joined" && (
          <div className="mt-6 space-y-4">
            {joinedLoading ? (
              <LoadingState />
            ) : activeJoined.length === 0 ? (
              <EmptyState
                icon={Mountain}
                title="还没有加入队伍，去找找伙伴吧"
                desc={c.emptyJoinedDesc}
                btnLabel={c.emptyJoinedBtn}
                href="/locations"
              />
            ) : (
              <div className="space-y-3">
                {activeJoined.map((team) => (
                  <TeamCard key={team.id} team={team} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: 申请记录 */}
        {activeTab === "applications" && (
          <div className="mt-6 space-y-3">
            {applicationsLoading ? (
              <LoadingState />
            ) : applications.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="还没有申请记录"
                desc={c.emptyApplicationsDesc}
                btnLabel={c.emptyApplicationsBtn}
                href="/teams"
              />
            ) : (
              applications.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))
            )}
          </div>
        )}

        {/* Tab Content: 待审批 */}
        {activeTab === "pending" && (
          <div className="mt-6 space-y-3">
            {pendingLoading ? (
              <LoadingState />
            ) : pendingApprovals.length === 0 ? (
              <EmptyState
                icon={Hourglass}
                title="暂无待审批申请"
                desc={c.emptyPendingDesc}
                btnLabel={c.emptyPendingBtn}
                href="/my-teams?tab=created"
              />
            ) : (
              pendingApprovals.map((approval) => (
                <PendingApprovalCard
                  key={approval.id}
                  approval={approval}
                  onClick={(a) => { setSelectedApproval(a); setIsDetailOpen(true); }}
                />
              ))
            )}
          </div>
        )}

        {/* Tab Content: 历史 */}
        {activeTab === "history" && (
          <div className="mt-6 space-y-3">
            {createdLoading || joinedLoading ? (
              <LoadingState />
            ) : allHistory.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="还没有历史记录"
                desc={c.emptyHistoryDesc}
                btnLabel={c.emptyHistoryBtn}
                href="/locations"
              />
            ) : (
              allHistory.map((team) => (
                <TeamCard key={team.id + "-hist"} team={team} />
              ))
            )}
          </div>
        )}
      </div>

      <Footer />

      {/* 审批详情弹窗 */}
      {isDetailOpen && selectedApproval && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsDetailOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* 弹窗顶部装饰 */}
            <div className="h-2 bg-gradient-to-r from-amber-400 to-amber-600" />

            <div className="p-6">
              {selectedApproval.applicant && (
                <>
                  {/* 申请人头像居中 */}
                  <div className="flex flex-col items-center mb-5">
                    <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden mb-3 ring-4 ring-amber-50">
                      {selectedApproval.applicant.avatar ? (
                        <img
                          src={selectedApproval.applicant.avatar}
                          alt={selectedApproval.applicant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-semibold text-stone-500">
                          {selectedApproval.applicant.name?.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-stone-900">{selectedApproval.applicant.name}</h3>
                    {(() => {
                      const lv = levelConfig[selectedApproval.applicant.level];
                      return lv ? (
                        <span className={`mt-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${lv.color}`}>
                          {lv.emoji} {lv.label}
                        </span>
                      ) : (
                        <span className="mt-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-stone-100 text-stone-600">
                          {selectedApproval.applicant.level}
                        </span>
                      );
                    })()}
                  </div>

                  {/* 个人简介 */}
                  {selectedApproval.applicant.bio ? (
                    <div className="mb-4 pl-4 border-l-4 border-amber-300 py-1">
                      <p className="text-sm text-stone-600 italic leading-relaxed">{selectedApproval.applicant.bio}</p>
                    </div>
                  ) : (
                    <p className="mb-4 text-sm text-stone-400 text-center">{c.noBio}</p>
                  )}

                  {/* 微信号 */}
                  {selectedApproval.applicant.wechat && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-stone-600 bg-stone-50 rounded-xl px-4 py-2.5">
                      <span className="font-medium text-stone-700">微信：</span>
                      <span className="text-stone-600">{selectedApproval.applicant.wechat}</span>
                    </div>
                  )}

                  {/* 队伍信息小卡片 */}
                  {selectedApproval.team && (
                    <div className="mb-4 bg-stone-50 rounded-2xl p-4">
                      <p className="text-xs text-stone-400 mb-2 font-medium uppercase tracking-wide">申请加入的队伍</p>
                      <p className="font-semibold text-stone-800 mb-2">{selectedApproval.team.title}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                        {selectedApproval.team.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {selectedApproval.team.date}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {selectedApproval.team.currentMembers}/{selectedApproval.team.maxMembers}人
                        </span>
                        {selectedApproval.team.location?.name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {selectedApproval.team.location.name}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-stone-400 text-center mb-5">
                    {c.applyTime}：{formatTimeAgo(selectedApproval.createdAt)}
                  </p>
                </>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsRejectConfirmOpen(true)}
                  disabled={isProcessing}
                  className="flex-1 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 py-3 rounded-2xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  {c.rejectBtn}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-2xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {c.approveBtn}
                </button>
              </div>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="mt-3 w-full text-sm text-stone-400 hover:text-stone-600 py-2 transition-colors"
              >
                暂不处理
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 拒绝确认弹窗 */}
      {isRejectConfirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsRejectConfirmOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-stone-900 mb-2 text-center">{c.rejectConfirmTitle}</h2>
            <p className="text-sm text-stone-500 mb-6 text-center">{c.rejectConfirmDesc}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsRejectConfirmOpen(false)}
                className="flex-1 border border-stone-200 text-stone-700 hover:bg-stone-50 py-3 rounded-2xl font-semibold transition-colors"
              >
                {c.cancelBtn}
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : c.confirmRejectBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 取消队伍确认 Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both] motion-reduce:animate-none">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-stone-900">{copy.teams.cancelTeam}</h3>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed mb-5">
              {copy.teams.cancelTeamConfirm}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={isCancelling}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                {copy.common.cancel}
              </button>
              <button
                onClick={handleCancelTeam}
                disabled={isCancelling}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                {copy.teams.cancelTeam}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── 子组件 ───────────────────────────────────────────────────────────────────

function StatBadge({ label, count, highlight = false }: { label: string; count: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        "text-lg font-bold leading-none",
        highlight ? "text-amber-500" : "text-stone-900"
      )}>
        {count}
      </span>
      <span className="text-xs text-stone-400">{label}</span>
      {highlight && count > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 mt-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl bg-stone-100 flex-shrink-0" />
            <div className="flex-1 space-y-2.5 py-1">
              <div className={cn("h-4 bg-stone-100 rounded-full", i === 1 ? "w-3/4" : i === 2 ? "w-2/3" : "w-1/2")} />
              <div className="h-3 bg-stone-100 rounded-full w-1/3" />
              <div className="flex gap-3 pt-1">
                <div className="h-3 bg-stone-100 rounded-full w-20" />
                <div className="h-3 bg-stone-100 rounded-full w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  btnLabel,
  href,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  btnLabel: string;
  href: string;
}) {
  return (
    <div className="py-14 flex flex-col items-center text-center">
      {/* 多层圆形装饰 */}
      <div className="relative mb-6">
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-amber-50 scale-150 opacity-60" />
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-amber-50 scale-125 opacity-80" />
        <div className="relative w-24 h-24 bg-white border-2 border-stone-100 rounded-full flex items-center justify-center shadow-sm">
          <Icon className="h-10 w-10 text-amber-500" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-stone-800 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 mb-6 max-w-xs leading-relaxed">{desc}</p>
      <a href={href}>
        <button className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors text-sm shadow-md shadow-amber-100">
          {btnLabel}
        </button>
      </a>
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  children,
  defaultExpanded = true,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50/80 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">{count}</span>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-stone-400 transition-transform duration-200", isExpanded ? "" : "-rotate-90")}
        />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, isLeader = false, onCancel }: {
  team: TeamItem;
  isLeader?: boolean;
  onCancel?: (id: string) => void;
}) {
  const status = statusLabels[team.status] || { label: team.status, color: "bg-stone-100 text-stone-600 border border-stone-200", dot: "bg-stone-400" };
  const isFull = team.currentMembers >= team.maxMembers;
  const canCancel = isLeader && onCancel && (team.status === "recruiting" || team.status === "full");

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-stone-100 p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-100/40 hover:border-amber-200/50 transition-all duration-200">
        <div className="flex items-start gap-4">
          {/* 封面图 */}
          <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden bg-stone-100 flex items-center justify-center">
            {team.location?.coverImage ? (
              <img
                src={team.location.coverImage}
                alt={team.location.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <MapPin className="h-8 w-8 text-stone-300" />
            )}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                    {team.title}
                  </h3>
                  {isLeader && (
                    <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1 flex-shrink-0">
                      <Crown className="h-3 w-3" />
                      {c.roleLeader}
                    </span>
                  )}
                </div>
                {team.location?.name && (
                  <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{team.location.name}</span>
                  </p>
                )}
              </div>
              {/* 状态徽章 */}
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 flex items-center gap-1.5 ${status.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
              {team.date && (
                <span className="flex items-center gap-1 text-stone-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {team.date}
                </span>
              )}
              {team.time && (
                <span className="flex items-center gap-1 text-stone-500">
                  <Clock className="h-3.5 w-3.5" />
                  {team.time}
                </span>
              )}
              <span className={cn(
                "flex items-center gap-1 font-medium",
                isFull ? "text-amber-600" : "text-amber-600"
              )}>
                <Users className="h-3.5 w-3.5" />
                {team.currentMembers}/{team.maxMembers}人
              </span>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 self-center" />
        </div>
        {canCancel && (
          <div className="mt-3 pt-3 border-t border-stone-100 flex justify-end">
            <button
              onClick={(e) => { e.preventDefault(); onCancel!(team.id); }}
              className="text-xs text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              {copy.teams.cancelTeam}
            </button>
          </div>
        )}
      </div>
    </a>
  );
}

function ApplicationCard({ application }: { application: ApplicationRecord }) {
  const team = application.team;
  const appStatus = applicationStatusConfig[application.status] || applicationStatusConfig.pending;
  const StatusIcon = appStatus.icon;

  if (!team) return null;

  const isFull = team.currentMembers >= team.maxMembers;

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-stone-100 p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-100/40 hover:border-amber-200/50 transition-all duration-200">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden bg-stone-100 flex items-center justify-center">
            {team.location?.coverImage ? (
              <img
                src={team.location.coverImage}
                alt={team.location.name || ""}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <MapPin className="h-8 w-8 text-stone-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-stone-900 group-hover:text-amber-700 transition-colors truncate">
                  {team.title}
                </h3>
                {team.location?.name && (
                  <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{team.location.name}</span>
                  </p>
                )}
              </div>
              {/* 申请状态徽章 */}
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 flex items-center gap-1.5 ${appStatus.color}`}>
                <StatusIcon className="h-3 w-3" />
                {appStatus.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
              {team.date && (
                <span className="flex items-center gap-1 text-stone-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {team.date}
                </span>
              )}
              {team.time && (
                <span className="flex items-center gap-1 text-stone-500">
                  <Clock className="h-3.5 w-3.5" />
                  {team.time}
                </span>
              )}
              <span className={cn(
                "flex items-center gap-1 font-medium",
                isFull ? "text-amber-600" : "text-amber-600"
              )}>
                <Users className="h-3.5 w-3.5" />
                {team.currentMembers}/{team.maxMembers}人
              </span>
            </div>

            <div className="flex items-center justify-between mt-2">
              {team.leader && (
                <p className="text-xs text-stone-400">
                  队长：<span className="text-stone-600">{team.leader.name}</span>
                </p>
              )}
              <p className="text-xs text-stone-400 ml-auto">{formatTimeAgo(application.createdAt)}</p>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 self-center" />
        </div>
      </div>
    </a>
  );
}

function PendingApprovalCard({
  approval,
  onClick,
}: {
  approval: PendingApproval;
  onClick: (a: PendingApproval) => void;
}) {
  const applicant = approval.applicant;
  const team = approval.team;

  if (!applicant || !team) return null;

  const lv = levelConfig[applicant.level];

  return (
    <button
      className="w-full text-left bg-white rounded-2xl border-l-4 border-l-amber-400 border-y border-r border-stone-100 p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-50 transition-all duration-200 group"
      onClick={() => onClick(approval)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
          <Hourglass className="h-3 w-3" />
          {c.pendingReview}
        </span>
        <span className="text-xs text-stone-400">{formatTimeAgo(approval.createdAt)}</span>
      </div>

      <div className="flex items-start gap-3">
        {/* 大头像 */}
        <div className="w-14 h-14 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-amber-100">
          {applicant.avatar ? (
            <img src={applicant.avatar} alt={applicant.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-semibold text-stone-500">{applicant.name?.charAt(0) || "?"}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-stone-900">{applicant.name}</h3>
            {lv ? (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lv.color}`}>
                {lv.emoji} {lv.label}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-600">
                {applicant.level}
              </span>
            )}
          </div>
          {applicant.bio ? (
            <p className="text-sm text-stone-500 mt-1 line-clamp-1 leading-relaxed">{applicant.bio}</p>
          ) : (
            <p className="text-sm text-stone-400 mt-1 italic">{c.noBio}</p>
          )}
        </div>
      </div>

      {/* 队伍信息简卡 */}
      <div className="mt-3 bg-stone-50 rounded-xl px-4 py-3 text-sm">
        <p className="font-medium text-stone-700 mb-1.5 truncate">{c.applyToJoin}：{team.title}</p>
        <div className="flex flex-wrap gap-3 text-stone-500 text-xs">
          {team.date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {team.date}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {team.currentMembers}/{team.maxMembers}人
          </span>
          {team.location?.name && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {team.location.name}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <span className="text-sm text-amber-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
          查看详情
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}
