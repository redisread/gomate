"use client";

import * as React from "react";
import {
  ArrowLeft, Plus, Users, MapPin, Calendar, Crown, User,
  ChevronRight, ChevronDown, Clock, Hourglass, CheckCircle,
  XCircle, ClipboardCheck, Loader2,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { SessionUser } from "@/lib/types";

const c = copy.myTeams;
const com = copy.common;

// 状态标签
const statusLabels: Record<string, { label: string; color: string }> = {
  recruiting: { label: "招募中", color: "bg-emerald-100 text-emerald-700" },
  full: { label: "已满员", color: "bg-amber-100 text-amber-700" },
  ongoing: { label: "进行中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-stone-100 text-stone-600" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-700" },
};

// 申请状态标签
const applicationStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "bg-amber-100 text-amber-700" },
  approved: { label: "已通过", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-700" },
};

// 等级标签
const levelLabels: Record<string, string> = {
  beginner: "新手",
  intermediate: "进阶",
  advanced: "高级",
  expert: "专家",
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
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

/**
 * 我的队伍页客户端组件 - React Island
 */
export function MyTeamsClient() {
  const [currentUser, setCurrentUser] = React.useState<SessionUser | null>(null);
  const [activeTab, setActiveTab] = React.useState("created");

  // 我创建的队伍
  const [createdTeams, setCreatedTeams] = React.useState<TeamItem[]>([]);
  const [createdLoading, setCreatedLoading] = React.useState(true);

  // 我加入的队伍
  const [joinedTeams, setJoinedTeams] = React.useState<TeamItem[]>([]);
  const [joinedLoading, setJoinedLoading] = React.useState(true);

  // 我的申请记录
  const [applications, setApplications] = React.useState<ApplicationRecord[]>([]);
  const [applicationsLoading, setApplicationsLoading] = React.useState(true);

  // 待审批（队长视角）
  const [pendingApprovals, setPendingApprovals] = React.useState<PendingApproval[]>([]);
  const [pendingLoading, setPendingLoading] = React.useState(true);

  // 审批弹窗
  const [selectedApproval, setSelectedApproval] = React.useState<PendingApproval | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState("");

  // 从 URL 读取 tab
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") || "created";
    if (["created", "joined", "applications", "pending", "history"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // 认证检查
  React.useEffect(() => {
    fetchAPI("/auth/get-session")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.user) {
          window.location.href = `/login?redirect=/my-teams`;
        } else {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {
        window.location.href = `/login?redirect=/my-teams`;
      });
  }, []);

  // 加载创建的队伍
  React.useEffect(() => {
    if (!currentUser) return;
    setCreatedLoading(true);
    fetchAPI(`/api/teams?leaderId=${currentUser.id}&pageSize=50`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCreatedTeams(data.teams || []);
      })
      .finally(() => setCreatedLoading(false));
  }, [currentUser]);

  // 加载加入的队伍
  React.useEffect(() => {
    if (!currentUser) return;
    setJoinedLoading(true);
    fetchAPI("/api/user/teams/joined?pageSize=50")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setJoinedTeams(data.teams || []);
      })
      .finally(() => setJoinedLoading(false));
  }, [currentUser]);

  // 加载申请记录
  React.useEffect(() => {
    if (!currentUser) return;
    setApplicationsLoading(true);
    fetchAPI("/api/user/applications")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setApplications(data.applications || []);
      })
      .finally(() => setApplicationsLoading(false));
  }, [currentUser]);

  // 加载待审批
  React.useEffect(() => {
    if (!currentUser) return;
    setPendingLoading(true);
    fetchAPI("/api/user/pending-approvals")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPendingApprovals(data.approvals || []);
      })
      .finally(() => setPendingLoading(false));
  }, [currentUser]);

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

  // 通过申请
  const handleApprove = async () => {
    if (!selectedApproval) return;
    setIsProcessing(true);
    try {
      const r = await fetchAPI(`/api/teams/${selectedApproval.teamId}/members/${selectedApproval.userId}/approve`, {
        method: "POST",
      });
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

  // 拒绝申请
  const handleConfirmReject = async () => {
    if (!selectedApproval) return;
    setIsProcessing(true);
    try {
      const r = await fetchAPI(`/api/teams/${selectedApproval.teamId}/members/${selectedApproval.userId}/reject`, {
        method: "POST",
      });
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

  // 数据分组
  const activeCreated = createdTeams.filter((t) =>
    ["recruiting", "full", "ongoing"].includes(t.status)
  );
  const archivedCreated = createdTeams.filter((t) =>
    ["completed", "cancelled"].includes(t.status)
  );
  const activeJoined = joinedTeams.filter((t) =>
    ["recruiting", "full", "ongoing"].includes(t.status)
  );
  const archivedJoined = joinedTeams.filter((t) =>
    ["completed", "cancelled"].includes(t.status)
  );
  const allHistory = [...archivedCreated, ...archivedJoined].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  );

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a
              href="/profile"
              className="inline-flex items-center text-stone-600 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </a>
            <h1 className="text-2xl font-bold text-stone-900">我的队伍</h1>
          </div>
          <a href="/teams/create">
            <button className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
              <Plus className="h-4 w-4" />
              发起组队
            </button>
          </a>
        </div>

        {/* Toast message */}
        {actionMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center justify-between">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage("")} className="text-emerald-500 hover:text-emerald-700">
              ✕
            </button>
          </div>
        )}

        {/* Tab buttons */}
        <div className="flex gap-1 bg-stone-100 p-1 rounded-xl mb-6 overflow-x-auto">
          {[
            { id: "created", label: "我创建的", icon: Crown, count: activeCreated.length },
            { id: "joined", label: "已加入", icon: User, count: activeJoined.length },
            { id: "applications", label: "我的申请", icon: ClipboardCheck, count: applications.filter(a => a.status === "pending").length },
            { id: "pending", label: "待审批", icon: Hourglass, count: pendingApprovals.length },
            { id: "history", label: "历史", icon: Clock, count: 0 },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === id
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  activeTab === id ? "bg-stone-100 text-stone-700" : "bg-stone-200 text-stone-600"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content: 我创建的 */}
        {activeTab === "created" && (
          <div className="space-y-4">
            {createdLoading ? (
              <LoadingState />
            ) : activeCreated.length === 0 && archivedCreated.length === 0 ? (
              <EmptyState
                icon={Crown}
                title="还没有创建队伍"
                desc="发起一支队伍，寻找志同道合的伙伴"
                btnLabel="发起组队"
                href="/teams/create"
              />
            ) : (
              <>
                {activeCreated.length > 0 && (
                  <CollapsibleSection title="进行中的队伍" count={activeCreated.length}>
                    {activeCreated.map((team) => (
                      <TeamCard key={team.id} team={team} isLeader />
                    ))}
                  </CollapsibleSection>
                )}
                {archivedCreated.length > 0 && (
                  <CollapsibleSection title="已归档队伍" count={archivedCreated.length} defaultExpanded={false}>
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
          <div className="space-y-4">
            {joinedLoading ? (
              <LoadingState />
            ) : activeJoined.length === 0 ? (
              <EmptyState
                icon={User}
                title="还没有加入队伍"
                desc="去寻找感兴趣的队伍，申请加入吧"
                btnLabel="浏览队伍"
                href="/teams"
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

        {/* Tab Content: 我的申请 */}
        {activeTab === "applications" && (
          <div className="space-y-3">
            {applicationsLoading ? (
              <LoadingState />
            ) : applications.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="还没有申请记录"
                desc="去浏览队伍并申请加入吧"
                btnLabel="浏览队伍"
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
          <div className="space-y-3">
            {pendingLoading ? (
              <LoadingState />
            ) : pendingApprovals.length === 0 ? (
              <EmptyState
                icon={Hourglass}
                title="暂无待审批申请"
                desc="当有人申请加入你的队伍时会显示在这里"
                btnLabel="查看我创建的队伍"
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
          <div className="space-y-3">
            {createdLoading || joinedLoading ? (
              <LoadingState />
            ) : allHistory.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="暂无历史记录"
                desc="完成的队伍活动将显示在这里"
                btnLabel="浏览地点"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsDetailOpen(false); }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-stone-900 mb-1">申请人详情</h2>
            <p className="text-sm text-stone-500 mb-5">请审核以下申请信息</p>

            {selectedApproval.applicant && (
              <div className="space-y-4">
                {/* 申请人信息 */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedApproval.applicant.avatar ? (
                      <img src={selectedApproval.applicant.avatar} alt={selectedApproval.applicant.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-medium text-stone-500">
                        {selectedApproval.applicant.name?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900">{selectedApproval.applicant.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                      {levelLabels[selectedApproval.applicant.level] || selectedApproval.applicant.level}
                    </span>
                  </div>
                </div>

                {selectedApproval.applicant.bio && (
                  <div className="p-3 bg-stone-50 rounded-lg">
                    <p className="text-sm text-stone-600">{selectedApproval.applicant.bio}</p>
                  </div>
                )}

                {selectedApproval.applicant.wechat && (
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <span className="font-medium">微信：</span>
                    <span>{selectedApproval.applicant.wechat}</span>
                  </div>
                )}

                {/* 队伍信息 */}
                {selectedApproval.team && (
                  <div className="p-3 bg-stone-50 rounded-lg text-sm">
                    <p className="font-medium text-stone-700 mb-1">申请加入：{selectedApproval.team.title}</p>
                    <div className="flex flex-wrap gap-3 text-stone-500">
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
                    </div>
                  </div>
                )}

                <p className="text-xs text-stone-400">申请时间：{formatTimeAgo(selectedApproval.createdAt)}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsRejectConfirmOpen(true)}
                disabled={isProcessing}
                className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                <XCircle className="h-4 w-4 inline mr-1" />
                拒绝
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                通过
              </button>
            </div>

            <button
              onClick={() => setIsDetailOpen(false)}
              className="mt-3 w-full text-sm text-stone-500 hover:text-stone-700 py-2"
            >
              暂不处理
            </button>
          </div>
        </div>
      )}

      {/* 拒绝确认弹窗 */}
      {isRejectConfirmOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsRejectConfirmOpen(false); }}
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-stone-900 mb-2">确认拒绝申请？</h2>
            <p className="text-sm text-stone-500 mb-5">
              拒绝后申请人将收到通知，此操作不可撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsRejectConfirmOpen(false)}
                className="flex-1 border border-stone-200 text-stone-700 hover:bg-stone-50 py-2.5 rounded-xl font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "确认拒绝"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── 子组件 ───────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
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
    <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center">
      <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="h-8 w-8 text-stone-400" />
      </div>
      <h3 className="text-lg font-medium text-stone-900 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 mb-5">{desc}</p>
      <a href={href}>
        <button className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm">
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
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-stone-900">{title}</h3>
          <span className="text-sm text-stone-500">({count})</span>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 text-stone-400 transition-transform", isExpanded ? "" : "-rotate-90")}
        />
      </button>
      {isExpanded && (
        <div className="p-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, isLeader = false }: { team: TeamItem; isLeader?: boolean }) {
  const status = statusLabels[team.status] || { label: team.status, color: "bg-stone-100 text-stone-600" };

  return (
    <a href={`/teams/${team.id}`} className="block">
      <div className="bg-white rounded-xl border border-stone-200 hover:shadow-md transition-all p-4 group">
        <div className="flex items-start gap-4">
          {/* Location image */}
          {team.location?.coverImage ? (
            <div
              className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
              style={{ backgroundImage: `url(${team.location.coverImage})` }}
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-stone-100 flex-shrink-0 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-stone-300" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                    {team.title}
                  </h3>
                  {isLeader && (
                    <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      队长
                    </span>
                  )}
                </div>
                {team.location?.name && (
                  <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {team.location.name}
                  </p>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
                {status.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-500">
              {team.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {team.date}
                </span>
              )}
              {team.time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {team.time}
                </span>
              )}
              <span className={cn(
                "flex items-center gap-1",
                team.currentMembers >= team.maxMembers ? "text-amber-600" : "text-emerald-600"
              )}>
                <Users className="h-4 w-4" />
                {team.currentMembers}/{team.maxMembers}人
              </span>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all flex-shrink-0 self-center" />
        </div>
      </div>
    </a>
  );
}

function ApplicationCard({ application }: { application: ApplicationRecord }) {
  const team = application.team;
  const appStatus = applicationStatusLabels[application.status] || applicationStatusLabels.pending;

  if (!team) return null;

  return (
    <a href={`/teams/${team.id}`} className="block">
      <div className="bg-white rounded-xl border border-stone-200 hover:shadow-md transition-all p-4 group">
        <div className="flex items-start gap-4">
          {team.location?.coverImage ? (
            <div
              className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
              style={{ backgroundImage: `url(${team.location.coverImage})` }}
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-stone-100 flex-shrink-0 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-stone-300" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                  {team.title}
                </h3>
                {team.location?.name && (
                  <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {team.location.name}
                  </p>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${appStatus.color}`}>
                {appStatus.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-500">
              {team.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {team.date}
                </span>
              )}
              {team.time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {team.time}
                </span>
              )}
              <span className={cn(
                "flex items-center gap-1",
                team.currentMembers >= team.maxMembers ? "text-amber-600" : "text-emerald-600"
              )}>
                <Users className="h-4 w-4" />
                {team.currentMembers}/{team.maxMembers}人
              </span>
            </div>

            {team.leader && (
              <p className="text-sm text-stone-500 mt-2">
                队长：<span className="font-medium text-stone-700">{team.leader.name}</span>
              </p>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all flex-shrink-0 self-center" />
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

  return (
    <button
      className="w-full text-left bg-white rounded-xl border border-stone-200 hover:shadow-md transition-all p-4 group"
      onClick={() => onClick(approval)}
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden flex-shrink-0">
          {applicant.avatar ? (
            <img src={applicant.avatar} alt={applicant.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-medium text-stone-500">{applicant.name?.charAt(0) || "?"}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                  {applicant.name}
                </h3>
                <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                  {levelLabels[applicant.level] || applicant.level}
                </span>
              </div>
              {applicant.bio && (
                <p className="text-sm text-stone-500 mt-1 line-clamp-1">{applicant.bio}</p>
              )}
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex-shrink-0 flex items-center gap-1">
              <Hourglass className="h-3 w-3" />
              待审核
            </span>
          </div>

          <div className="mt-3 p-3 bg-stone-50 rounded-lg text-sm">
            <p className="font-medium text-stone-700 mb-1">申请加入：{team.title}</p>
            <div className="flex flex-wrap gap-3 text-stone-500">
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
            </div>
          </div>

          <p className="text-xs text-stone-400 mt-2">申请时间：{formatTimeAgo(approval.createdAt)}</p>
        </div>

        <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all flex-shrink-0 self-center" />
      </div>
    </button>
  );
}
