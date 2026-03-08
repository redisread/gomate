"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Users,
  MapPin,
  Calendar,
  Crown,
  User,
  ChevronRight,
  ChevronDown,
  Clock,
  Hourglass,
  CheckCircle,
  XCircle,
  ClipboardCheck,
  Loader2,
} from "lucide-react";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/hooks/use-auth-guard";
import { useTeams } from "@/lib/teams-context";
import { useLocations } from "@/lib/locations-context";
import { approveMember, rejectMember } from "@/app/actions/teams";
import { useToast } from "@/components/ui/toast";
import { copy } from "@/lib/copy";
import { getUserDisplayName } from "@/lib/user-utils";

const c = copy.myTeams;
const com = copy.common;
const e = copy.enums;

// Loading fallback
function MyTeamsLoading() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-stone-200 rounded mb-8" />
          <div className="h-10 w-full bg-stone-200 rounded mb-6" />
          <div className="space-y-4">
            <div className="h-24 bg-stone-200 rounded" />
            <div className="h-24 bg-stone-200 rounded" />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

// 状态映射（颜色样式，文案从 copy.ts 获取）
const statusLabels: Record<string, { label: string; color: string }> = {
  recruiting: { label: c.statusRecruiting, color: "bg-emerald-100 text-emerald-700" },
  full: { label: c.statusFull, color: "bg-amber-100 text-amber-700" },
  formed: { label: c.statusFormed, color: "bg-blue-100 text-blue-700" },
  completed: { label: c.statusCompleted, color: "bg-stone-100 text-stone-600" },
  cancelled: { label: c.statusCancelled, color: "bg-stone-100 text-stone-600" },
};

// 申请状态映射（颜色样式，文案从 copy.ts 获取）
const applicationStatusLabels: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: c.appStatusPending, color: "bg-amber-100 text-amber-700", icon: Hourglass },
  approved: { label: c.appStatusApproved, color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  rejected: { label: c.appStatusRejected, color: "bg-red-100 text-red-700", icon: XCircle },
};

// 申请记录类型
interface ApplicationRecord {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date | string;
  joinedAt: Date | string | null;
  team: {
    id: string;
    title: string;
    date: string | null;
    time: string | null;
    currentMembers: number;
    maxMembers: number;
    status: string;
    location: {
      id: string;
      name: string;
      coverImage: string;
    } | null;
    leader: {
      id: string;
      name: string;
      image: string | null;
    } | null;
  } | null;
}

// 待审批记录类型
interface PendingApproval {
  id: string;
  teamId: string;
  userId: string;
  createdAt: Date | string;
  team: {
    id: string;
    title: string;
    date: string | null;
    time: string | null;
    currentMembers: number;
    maxMembers: number;
    location: {
      id: string;
      name: string;
      coverImage: string;
    } | null;
  } | null;
  applicant: {
    id: string;
    name: string;
    image: string | null;
    bio: string | null;
    level: string;
  } | null;
}

function MyTeamsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const { teams, getUserJoinedTeams } = useTeams();
  const { locations } = useLocations();
  const { showToast } = useToast();

  // 从 URL 参数获取默认 Tab
  const defaultTab = searchParams.get("tab") || "created";
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  // 用户加入的队伍状态 - 必须在条件返回之前声明
  const [joinedTeams, setJoinedTeams] = React.useState<Team[]>([]);
  const [joinedTeamsLoading, setJoinedTeamsLoading] = React.useState(true);

  // 用户申请记录状态
  const [applications, setApplications] = React.useState<ApplicationRecord[]>([]);
  const [applicationsLoading, setApplicationsLoading] = React.useState(true);
  const [applicationStats, setApplicationStats] = React.useState({ pending: 0, approved: 0, rejected: 0 });

  // 待审批申请状态（队长视角）
  const [pendingApprovals, setPendingApprovals] = React.useState<PendingApproval[]>([]);
  const [pendingApprovalsLoading, setPendingApprovalsLoading] = React.useState(true);
  const [pendingApprovalsTotal, setPendingApprovalsTotal] = React.useState(0);

  // 待审批详情弹窗状态
  const [selectedApproval, setSelectedApproval] = React.useState<PendingApproval | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // 未登录重定向
  useAuthGuard();

  // 当 URL 参数变化时更新 Tab
  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["created", "joined", "applications", "pending", "history"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // 加载用户申请记录
  React.useEffect(() => {
    const fetchApplications = async () => {
      if (user?.id) {
        try {
          setApplicationsLoading(true);
          const response = await fetch("/api/user/applications");
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setApplications(result.applications || []);
              setApplicationStats(result.stats || { pending: 0, approved: 0, rejected: 0 });
            }
          }
        } catch (error) {
          console.error("获取申请记录失败:", error);
          setApplications([]);
        } finally {
          setApplicationsLoading(false);
        }
      } else {
        setApplications([]);
        setApplicationsLoading(false);
      }
    };

    fetchApplications();
  }, [user?.id]);

  // 加载用户加入的队伍
  React.useEffect(() => {
    const fetchJoinedTeams = async () => {
      if (user?.id) {
        try {
          setJoinedTeamsLoading(true);
          const userJoinedTeams = await getUserJoinedTeams();
          setJoinedTeams(userJoinedTeams);
        } catch (error) {
          console.error("获取用户加入的队伍失败:", error);
          setJoinedTeams([]);
        } finally {
          setJoinedTeamsLoading(false);
        }
      } else {
        setJoinedTeams([]);
        setJoinedTeamsLoading(false);
      }
    };

    fetchJoinedTeams();
  }, [user?.id, getUserJoinedTeams]);

  // 加载待审批申请（队长视角）
  React.useEffect(() => {
    const fetchPendingApprovals = async () => {
      if (user?.id) {
        try {
          setPendingApprovalsLoading(true);
          const response = await fetch("/api/user/pending-approvals");
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setPendingApprovals(result.approvals || []);
              setPendingApprovalsTotal(result.total || 0);
            }
          }
        } catch (error) {
          console.error("获取待审批申请失败:", error);
          setPendingApprovals([]);
        } finally {
          setPendingApprovalsLoading(false);
        }
      } else {
        setPendingApprovals([]);
        setPendingApprovalsLoading(false);
      }
    };

    fetchPendingApprovals();
  }, [user?.id]);

  // 刷新待审批申请列表
  const refreshPendingApprovals = async () => {
    if (user?.id) {
      try {
        const response = await fetch("/api/user/pending-approvals");
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setPendingApprovals(result.approvals || []);
            setPendingApprovalsTotal(result.total || 0);
          }
        }
      } catch (error) {
        console.error("刷新待审批申请失败:", error);
      }
    }
  };

  // 打开申请人详情弹窗
  const handleCardClick = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setIsDetailOpen(true);
  };

  // 处理通过申请
  const handleApprove = async () => {
    if (!selectedApproval) return;

    setIsProcessing(true);
    try {
      const result = await approveMember(selectedApproval.teamId, selectedApproval.userId);
      if (result.success) {
        showToast(result.message);
        setIsDetailOpen(false);
        await refreshPendingApprovals();
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : copy.errors.reviewFailed);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理拒绝申请（打开确认弹窗）
  const handleReject = () => {
    setIsRejectConfirmOpen(true);
  };

  // 确认拒绝申请
  const handleConfirmReject = async () => {
    if (!selectedApproval) return;

    setIsProcessing(true);
    try {
      const result = await rejectMember(selectedApproval.teamId, selectedApproval.userId);
      if (result.success) {
        showToast(result.message);
        setIsRejectConfirmOpen(false);
        setIsDetailOpen(false);
        await refreshPendingApprovals();
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : copy.api.failed);
    } finally {
      setIsProcessing(false);
    }
  };

  // 当 Tab 切换时更新 URL（不刷新页面）
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.replace(`/my-teams?${params.toString()}`, { scroll: false });
  };

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400">{com.loading}</div>
      </main>
    );
  }

  // 获取用户创建的队伍
  const createdTeams = teams.filter((t) => t.leader.id === user.id);

  // 按状态分组队伍
  const activeTeams = createdTeams.filter(
    (t) => t.status === "recruiting" || t.status === "full" || t.status === "formed"
  );
  const completedTeams = createdTeams.filter((t) => t.status === "completed");
  const cancelledTeams = createdTeams.filter((t) => t.status === "cancelled");
  const archivedTeams = [...completedTeams, ...cancelledTeams];

  // 按时间排序（最新的在前）
  const sortedActiveTeams = [...activeTeams].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const sortedArchivedTeams = [...archivedTeams].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // 获取我加入的活跃队伍（ recruiting、ongoing、full、formed）
  const activeJoinedTeams = joinedTeams.filter(
    (t) => t.status === "recruiting" || t.status === "ongoing" || t.status === "full" || t.status === "formed"
  );

  // 获取我加入的历史队伍（作为队员加入的已完成/已取消队伍）
  const joinedHistoryTeams = joinedTeams.filter(
    (t) => t.status === "completed" || t.status === "cancelled"
  );

  // 历史tab展示：我创建的历史队伍 + 我加入的历史队伍
  const allHistoryTeams = [...archivedTeams, ...joinedHistoryTeams].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // 分组标题组件
  interface TeamSectionProps {
    title: string;
    count: number;
    children: React.ReactNode;
    defaultExpanded?: boolean;
  }

  const TeamSection = ({ title, count, children, defaultExpanded = true }: TeamSectionProps) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

    return (
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-stone-900">{title}</h3>
            <span className="text-sm text-stone-500">({count})</span>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-stone-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
          />
        </button>
        {isExpanded && (
          <div className="p-4 space-y-3">
            {children}
          </div>
        )}
      </div>
    );
  };

  const TeamCard = ({ team, isLeader = false }: { team: typeof teams[0]; isLeader?: boolean }) => {
    const location = locations.find((l) => l.id === team.locationId);
    const status = statusLabels[team.status] || statusLabels.recruiting;

    return (
      <Link href={`/teams/${team.id}`}>
        <Card className="border-stone-200 hover:shadow-lg transition-all cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Location Image */}
              <div
                className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${location?.coverImage})` }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                        {team.title}
                      </h3>
                      {isLeader && (
                        <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          <Crown className="h-3 w-3 mr-1" />
                          {c.roleLeader}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {location?.name}
                    </p>
                  </div>
                  <Badge className={status.color}>
                    {status.label}
                  </Badge>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {team.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {team.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className={team.currentMembers >= team.maxMembers ? "text-amber-600" : "text-emerald-600"}>
                      {team.currentMembers}/{team.maxMembers}{com.person}
                    </span>
                  </span>
                </div>

                {/* Requirements */}
                {team.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {team.requirements.slice(0, 3).map((req) => (
                      <span
                        key={req}
                        className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-full"
                      >
                        {req}
                      </span>
                    ))}
                    {team.requirements.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-stone-100 text-stone-500 rounded-full">
                        {c.requirementsMore.replace("{count}", String(team.requirements.length - 3))}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  // 申请卡片组件
  const ApplicationCard = ({ application }: { application: ApplicationRecord }) => {
    const team = application.team;
    const appStatus = applicationStatusLabels[application.status] || applicationStatusLabels.pending;
    const StatusIcon = appStatus.icon;

    if (!team) return null;

    return (
      <Link href={`/teams/${team.id}`}>
        <Card className="border-stone-200 hover:shadow-lg transition-all cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Location Image */}
              <div
                className="w-20 h-20 rounded-xl bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${team.location?.coverImage})` }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                        {team.title}
                      </h3>
                    </div>
                    <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {team.location?.name}
                    </p>
                  </div>
                  <Badge className={appStatus.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {appStatus.label}
                  </Badge>
                </div>

                {/* Meta Info */}
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
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className={team.currentMembers >= team.maxMembers ? "text-amber-600" : "text-emerald-600"}>
                      {team.currentMembers}/{team.maxMembers}{com.person}
                    </span>
                  </span>
                </div>

                {/* 队长信息 */}
                {team.leader && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-stone-500">
                    <span>{c.teamLeader}：</span>
                    <span className="font-medium text-stone-700">{getUserDisplayName(team.leader)}</span>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  // 等级显示映射（文案从 copy.ts 获取）
  const levelLabels: Record<string, string> = {
    beginner: c.levelBeginner,
    intermediate: c.levelIntermediate,
    advanced: c.levelAdvanced,
    expert: c.levelExpert,
  };

  // 格式化时间
  const formatTimeAgo = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}${c.minutesAgo}`;
    } else if (hours < 24) {
      return `${hours}${c.hoursAgo}`;
    } else {
      return `${days}${c.daysAgo}`;
    }
  };

  // 待审批卡片组件
  const PendingApprovalCard = ({ approval, onClick }: { approval: PendingApproval; onClick: (approval: PendingApproval) => void }) => {
    const team = approval.team;
    const applicant = approval.applicant;

    if (!team || !applicant) return null;

    return (
      <Card
        className="border-stone-200 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
        onClick={() => onClick(approval)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Applicant Avatar */}
            <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {applicant.image ? (
                <img src={applicant.image} alt={applicant.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-medium text-stone-500">{applicant.name?.charAt(0) || "?"}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">{applicant.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {levelLabels[applicant.level] || e.level.beginner}
                    </Badge>
                  </div>
                  <p className="text-sm text-stone-500 mt-1 line-clamp-1">
                    {applicant.bio || c.noBio}
                  </p>
                </div>
                <Badge className="bg-amber-100 text-amber-700">
                  <Hourglass className="h-3 w-3 mr-1" />
                  {c.pendingReview}
                </Badge>
              </div>

              {/* Team Info */}
              <div className="mt-3 p-3 bg-stone-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-stone-700">{c.applyToJoin}：</span>
                  <span className="text-sm text-stone-900">{team.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500">
                  {team.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {team.date}
                    </span>
                  )}
                  {team.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {team.time}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {team.currentMembers}/{team.maxMembers}{com.person}
                  </span>
                </div>
              </div>

              {/* Apply Time */}
              <p className="text-xs text-stone-400 mt-2">
                {c.applyTime}：{formatTimeAgo(approval.createdAt)}
              </p>
            </div>

            {/* Chevron */}
            <div className="flex-shrink-0 self-center">
              <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ type }: { type: "created" | "joined" | "applications" | "pending" | "history" }) => {
    const configs = {
      created: {
        icon: Crown,
        title: c.emptyCreated,
        description: c.emptyCreatedDesc,
        action: c.emptyCreatedBtn,
        href: "/teams/create",
      },
      joined: {
        icon: User,
        title: c.emptyJoined,
        description: c.emptyJoinedDesc,
        action: c.emptyJoinedBtn,
        href: "/locations",
      },
      applications: {
        icon: Hourglass,
        title: c.emptyApplications,
        description: c.emptyApplicationsDesc,
        action: c.emptyApplicationsBtn,
        href: "/teams",
      },
      pending: {
        icon: ClipboardCheck,
        title: c.emptyPending,
        description: c.emptyPendingDesc,
        action: c.emptyPendingBtn,
        href: "/my-teams?tab=created",
      },
      history: {
        icon: Clock,
        title: c.emptyHistory,
        description: c.emptyHistoryDesc,
        action: c.emptyHistoryBtn,
        href: "/locations",
      },
    };

    const config = configs[type];
    const Icon = config.icon;

    return (
      <Card className="border-dashed border-stone-300 bg-stone-50/50">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="h-8 w-8 text-stone-400" />
          </div>
          <h3 className="text-lg font-medium text-stone-900 mb-2">{config.title}</h3>
          <p className="text-sm text-stone-500 mb-4">{config.description}</p>
          <Button className="bg-stone-900 hover:bg-stone-800" asChild>
            <Link href={config.href}>{config.action}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-stone-600 hover:text-stone-900"
              asChild
            >
              <Link href="/profile">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {c.backBtn}
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-stone-900">{c.pageTitle}</h1>
          </div>
          <Button className="bg-stone-900 hover:bg-stone-800" asChild>
            <Link href="/teams/create">
              <Plus className="h-4 w-4 mr-2" />
              {c.createBtn}
            </Link>
          </Button>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full sm:w-auto grid grid-cols-5 sm:inline-flex bg-stone-100">
              <TabsTrigger value="created" className="data-[state=active]:bg-white">
                <Crown className="h-4 w-4 mr-2 sm:mr-1" />
                <span className="hidden sm:inline">{c.tabCreated}</span>
                <span className="sm:hidden">{c.tabCreatedShort}</span>
                {activeTeams.length > 0 && (
                  <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                    {activeTeams.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="joined" className="data-[state=active]:bg-white">
                <User className="h-4 w-4 mr-2 sm:mr-1" />
                <span className="hidden sm:inline">{c.tabJoined}</span>
                <span className="sm:hidden">{c.tabJoinedShort}</span>
                {activeJoinedTeams.length > 0 && (
                  <span className="ml-1.5 text-xs bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded-full">
                    {activeJoinedTeams.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="applications" className="data-[state=active]:bg-white">
                <Hourglass className="h-4 w-4 mr-2 sm:mr-1" />
                <span className="hidden sm:inline">{c.tabApplications}</span>
                <span className="sm:hidden">{c.tabApplicationsShort}</span>
                {applicationStats.pending > 0 && (
                  <span className="ml-1.5 text-xs bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full">
                    {applicationStats.pending}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-white">
                <ClipboardCheck className="h-4 w-4 mr-2 sm:mr-1" />
                <span className="hidden sm:inline">{c.tabPending}</span>
                <span className="sm:hidden">{c.tabPendingShort}</span>
                {pendingApprovalsTotal > 0 && (
                  <span className="ml-1.5 text-xs bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full">
                    {pendingApprovalsTotal}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-white">
                <Clock className="h-4 w-4 mr-2 sm:mr-1" />
                <span className="hidden sm:inline">{c.tabHistory}</span>
                <span className="sm:hidden">{c.tabHistory}</span>
                {allHistoryTeams.length > 0 && (
                  <span className="ml-1.5 text-xs bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded-full">
                    {allHistoryTeams.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Created Teams - 分组展示 */}
            <TabsContent value="created" className="mt-6 space-y-6">
              {createdTeams.length === 0 ? (
                <EmptyState type="created" />
              ) : (
                <>
                  {/* 活跃队伍区域 */}
                  <TeamSection
                    title={c.activeTeams}
                    count={activeTeams.length}
                    defaultExpanded={true}
                  >
                    {activeTeams.length === 0 ? (
                      <p className="text-sm text-stone-500 text-center py-4">
                        {c.noActiveTeams}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {sortedActiveTeams.map((team) => (
                          <TeamCard key={team.id} team={team} isLeader />
                        ))}
                      </div>
                    )}
                  </TeamSection>

                  {/* 已归档队伍区域 */}
                  {archivedTeams.length > 0 && (
                    <TeamSection
                      title={c.archivedTeams}
                      count={archivedTeams.length}
                      defaultExpanded={false}
                    >
                      <div className="space-y-3">
                        {sortedArchivedTeams.map((team) => (
                          <TeamCard key={team.id} team={team} isLeader />
                        ))}
                      </div>
                      <div className="pt-2 text-xs text-stone-400 text-center">
                        {c.completedCount} {completedTeams.length} · {c.cancelledCount} {cancelledTeams.length}
                      </div>
                    </TeamSection>
                  )}
                </>
              )}
            </TabsContent>

            {/* Joined Teams - 只展示活跃队伍 */}
            <TabsContent value="joined" className="mt-6">
              {joinedTeamsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-stone-200 rounded" />
                  <div className="h-24 bg-stone-200 rounded" />
                </div>
              ) : activeJoinedTeams.length === 0 ? (
                <EmptyState type="joined" />
              ) : (
                <div className="space-y-4">
                  {activeJoinedTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Applications */}
            <TabsContent value="applications" className="mt-6">
              {applicationsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-stone-200 rounded" />
                  <div className="h-24 bg-stone-200 rounded" />
                </div>
              ) : applications.length === 0 ? (
                <EmptyState type="applications" />
              ) : (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <ApplicationCard key={application.id} application={application} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Pending Approvals */}
            <TabsContent value="pending" className="mt-6">
              {pendingApprovalsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-stone-200 rounded" />
                  <div className="h-24 bg-stone-200 rounded" />
                </div>
              ) : pendingApprovals.length === 0 ? (
                <EmptyState type="pending" />
              ) : (
                <div className="space-y-4">
                  {pendingApprovals.map((approval) => (
                    <PendingApprovalCard key={approval.id} approval={approval} onClick={handleCardClick} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* History - 展示我创建的历史队伍 + 我加入的历史队伍 */}
            <TabsContent value="history" className="mt-6">
              {allHistoryTeams.length === 0 ? (
                <EmptyState type="history" />
              ) : (
                <div className="space-y-4">
                  {allHistoryTeams.map((team) => (
                    <TeamCard key={team.id} team={team} isLeader={team.leader.id === user.id} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <Footer />

      {/* 申请人详情弹窗 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{c.applicantDetailTitle}</DialogTitle>
            <DialogDescription>
              {c.applicantDetailDesc}
            </DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-6">
              {/* 申请人信息 */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {selectedApproval.applicant?.image ? (
                    <img
                      src={selectedApproval.applicant.image}
                      alt={selectedApproval.applicant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-medium text-stone-500">
                      {selectedApproval.applicant?.name?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-stone-900">
                      {selectedApproval.applicant?.name}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {levelLabels[selectedApproval.applicant?.level || "beginner"] || e.level.beginner}
                    </Badge>
                  </div>
                  <p className="text-sm text-stone-500 mt-1">
                    {c.applyTime}：{formatTimeAgo(selectedApproval.createdAt)}
                  </p>
                </div>
              </div>

              {/* 简介 */}
              <div className="bg-stone-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-stone-700 mb-2">{c.personalBio}</h4>
                <p className="text-sm text-stone-600">
                  {selectedApproval.applicant?.bio || c.noBio}
                </p>
              </div>

              {/* 队伍信息 */}
              <div className="border-t border-stone-200 pt-4">
                <h4 className="text-sm font-medium text-stone-700 mb-3">{c.applyTeamTitle}</h4>
                <div className="bg-stone-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-500">{c.teamName}：</span>
                    <Link
                      href={`/teams/${selectedApproval.team?.id}`}
                      className="text-sm font-medium text-stone-900 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selectedApproval.team?.title}
                    </Link>
                  </div>
                  {selectedApproval.team?.date && (
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{selectedApproval.team.date}</span>
                    </div>
                  )}
                  {selectedApproval.team?.time && (
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{selectedApproval.team.time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      <span className={selectedApproval.team && selectedApproval.team.currentMembers >= selectedApproval.team.maxMembers ? "text-amber-600" : "text-emerald-600"}>
                        {selectedApproval.team?.currentMembers}
                      </span>
                      /{selectedApproval.team?.maxMembers}{com.person}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {c.rejectBtn}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 bg-stone-900 hover:bg-stone-800"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {c.approveBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拒绝确认弹窗 */}
      <AlertDialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{c.rejectConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {c.rejectConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{com.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {c.confirmRejectBtn}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

// Main page component with Suspense
export default function MyTeamsPage() {
  return (
    <Suspense fallback={<MyTeamsLoading />}>
      <MyTeamsContent />
    </Suspense>
  );
}
