"use client";

import * as React from "react";
import {
  MapPin,
  ArrowRight,
  Users,
  Calendar,
  Clock,
  Timer,
  AlertCircle,
  Loader2,
  CheckCircle,
  Crown,
  X,
  Pencil,
  Share2,
  Mountain,
  TrendingUp,
  UserCheck,
  ChevronDown,
  LogOut,
  Trash2,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Team, TeamMember, Application, Tag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SharePosterModal } from "./share-poster-modal";

function formatDuration(minutes: number): string {
  const hours = minutes / 60;
  if (hours === Math.floor(hours)) {
    return `${hours} 小时`;
  }
  return `${hours.toFixed(1).replace(".0", "")} 小时`;
}

interface ToastOptions {
  type: "success" | "error";
  message: string;
}

function useToast() {
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

function ToastDisplay({ toast, exiting }: { toast: ToastOptions | null; exiting: boolean }) {
  if (!toast) return null;
  const isSuccess = toast.type === "success";
  return (
    <div
      className={cn(
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-[60]",
        exiting ? "animate-[fade-out_0.2s_ease-in_both]" : "animate-[fade-up_0.25s_ease_both]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium",
          isSuccess ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
        )}
      >
        {isSuccess ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

function Avatar({ name, avatar, isLeader, size = "md" }: { name?: string; avatar?: string | null; isLeader?: boolean; size?: "sm" | "md" | "lg" }) {
  const displayChar = name?.[0] || "?";
  const kaomoji = ["◡‿◡", "˘◡˘", "◠‿◠", "◕‿◕", "◉‿◉"];
  const randomKaomoji = kaomoji[Math.floor(Math.random() * kaomoji.length)];
  
  const sizeClasses = {
    sm: "w-10 h-10 text-base",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-xl",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-medium relative",
        sizeClasses[size],
        isLeader ? "bg-amber-200 text-amber-800 ring-2 ring-amber-400 ring-offset-2" : "bg-stone-100 text-stone-600"
      )}
    >
      {avatar ? (
        <img src={avatar} alt={name} className="w-full h-full object-cover rounded-full" />
      ) : (
        <span className="text-sm">{randomKaomoji}</span>
      )}
      {isLeader && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
          <Crown className="w-3 h-3 text-white" />
        </span>
      )}
    </div>
  );
}

function AnimatedProgress({ ratio, isFull }: { ratio: number; isFull: boolean }) {
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setWidth(ratio), 100);
    return () => clearTimeout(t);
  }, [ratio]);
  return (
    <div
      role="progressbar"
      aria-valuenow={ratio}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`队伍招募进度 ${ratio}%`}
      className="h-1.5 rounded-full bg-stone-100 overflow-hidden"
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          isFull ? "bg-amber-600" : "bg-gradient-to-r from-amber-600 to-amber-400"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function MemberAvatarGrid({
  members,
  leaderId,
}: {
  members: TeamMember[];
  leaderId?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const GRID_THRESHOLD = 8;
  const visible = expanded ? members : members.slice(0, GRID_THRESHOLD);
  const hidden = members.length - GRID_THRESHOLD;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {visible.map((m) => {
          const name = m.nickname || m.name;
          const isLeader = m.userId === leaderId;
          
          return (
            <a
              key={m.id}
              href={`/users/${m.userId}`}
              className="relative group flex flex-col items-center gap-1.5 cursor-pointer"
            >
              <div
                className={cn(
                  "w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-150",
                  isLeader
                    ? "ring-2 ring-amber-400 ring-offset-1 bg-gradient-to-br from-amber-500 to-amber-300 group-hover:ring-amber-300"
                    : "bg-stone-100 ring-1 ring-stone-200 group-hover:scale-105 group-hover:ring-amber-300"
                )}
              >
                {m.avatar ? (
                  <img src={m.avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span
                    className={cn(
                      "font-semibold text-sm",
                      isLeader ? "text-white" : "text-stone-500"
                    )}
                  >
                    {name?.[0] || "?"}
                  </span>
                )}
              </div>
              {isLeader && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                  <Crown className="w-2.5 h-2.5 text-white" />
                </span>
              )}
              {m.wechat && (
                <p className="text-xs text-stone-500 max-w-[60px] truncate text-center leading-tight">
                  {m.wechat}
                </p>
              )}
            </a>
          );
        })}

        {!expanded && hidden > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-11 h-11 rounded-full bg-stone-100 ring-1 ring-stone-200 flex items-center justify-center transition-colors group-hover:bg-amber-50 group-hover:ring-amber-200">
              <span className="text-xs font-semibold text-stone-400 group-hover:text-amber-600">
                +{hidden}
              </span>
            </div>
            <p className="text-[10px] text-stone-300">查看全部</p>
          </button>
        )}
      </div>

      {expanded && members.length > GRID_THRESHOLD && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 flex items-center gap-1 text-xs text-stone-400 hover:text-amber-600 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
          收起
        </button>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function ApplicationCard({
  application,
  onApprove,
  onReject,
  isTeamFull,
}: {
  application: Application;
  onApprove: () => void;
  onReject: () => void;
  isTeamFull: boolean;
}) {
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);

  const handleApprove = async () => {
    setApproving(true);
    await onApprove();
    setApproving(false);
  };

  const handleReject = async () => {
    setRejecting(true);
    await onReject();
    setRejecting(false);
  };

  const name = application.user.nickname || application.user.name || "用户";
  const timeAgo = application.createdAt ? formatRelativeTime(new Date(application.createdAt)) : "";

  return (
    <div className="p-3 bg-white rounded-xl hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2.5 mb-2">
        <a
          href={`/users/${application.user.id}`}
          className="flex items-center gap-2.5 flex-1 min-w-0 hover:text-amber-700 transition-colors"
        >
          <Avatar name={name} avatar={application.user.avatar} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800 truncate">{name}</p>
            {timeAgo && <p className="text-xs text-stone-400">{timeAgo} 申请</p>}
          </div>
        </a>
      </div>
      {isTeamFull ? (
        <div className="text-center text-xs text-stone-400 bg-stone-50 py-2 rounded-lg">
          名额已满
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={approving || rejecting}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
          >
            {approving && <Loader2 className="w-3 h-3 animate-spin" />}
            {approving ? "处理中" : "批准"}
          </button>
          <button
            onClick={handleReject}
            disabled={approving || rejecting}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-stone-200 text-stone-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
          >
            {rejecting && <Loader2 className="w-3 h-3 animate-spin" />}
            {rejecting ? "处理中" : "拒绝"}
          </button>
        </div>
      )}
    </div>
  );
}

function getStatusInfo(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    recruiting: { label: copy.enums.teamStatus.recruiting, color: "bg-amber-50 text-amber-700" },
    full: { label: copy.enums.teamStatus.full, color: "bg-stone-100 text-stone-600" },
    formed: { label: copy.enums.teamStatus.formed, color: "bg-sky-50 text-sky-700" },
    completed: { label: copy.enums.teamStatus.completed, color: "bg-stone-100 text-stone-500" },
    cancelled: { label: copy.enums.teamStatus.cancelled, color: "bg-red-50 text-red-600" },
  };
  return map[status] || map.recruiting;
}

interface TeamDetailPartifulProps {
  teamId: string;
}

export function TeamDetailPartiful({ teamId }: TeamDetailPartifulProps) {
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
  const [isSavingWechat, setIsSavingWechat] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast, exiting, show: showToast } = useToast();

  React.useEffect(() => {
    loadTeam();
    checkUser();
  }, [teamId]);

  React.useEffect(() => {
    if (team && userId && team.leader?.id === userId) fetchApplications();
  }, [team?.id, userId]);

  const fetchApplications = async () => {
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/applications?status=pending`);
      const data = await res.json();
      if (data.success) setApplications(data.applications || []);
    } catch {}
  };

  const checkUser = async () => {
    try {
      const res = await fetchAPI("/auth/get-session");
      const data = await res.json();
      if (data?.user?.id) {
        setUserId(data.user.id);
        const statusRes = await fetchAPI(`/api/teams/${teamId}/my-status`);
        const statusData = await statusRes.json();
        if (statusData.success) setMemberStatus(statusData.status);
      }
    } catch {}
  };

  const loadTeam = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}`);
      if (res.status === 404) {
        setError(copy.teams.notFound);
        return;
      }
      const data = await res.json();
      if (data.success && data.team) setTeam(data.team);
      else setError(copy.teams.notFound);
    } catch {
      setError(copy.teams.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!userId) {
      window.location.href = `/login?redirect=/teams/${teamId}`;
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
        showToast({ type: "success", message: copy.success.applied });
        loadTeam();
      } else {
        const errorMsg = data.error || copy.errors.joinFailed;
        if (errorMsg.includes("微信") || errorMsg.includes("wechat")) {
          setShowJoinModal(false);
          setTimeout(() => setShowWechatConfirm(true), 300);
        } else {
          showToast({ type: "error", message: errorMsg });
        }
      }
    } catch {
      showToast({ type: "error", message: copy.errors.joinFailed });
    } finally {
      setJoining(false);
    }
  };

  const handleSaveWechat = async (wechat: string) => {
    if (!wechat.trim()) {
      showToast({ type: "error", message: "微信号不能为空" });
      return;
    }
    setIsSavingWechat(true);
    try {
      const res = await fetchAPI("/api/user/update", {
        method: "PATCH",
        body: JSON.stringify({ userId, wechat: wechat.trim() }),
      });
      const data = await res.json();
      if (data.success || data.user) {
        setShowWechatSheet(false);
        showToast({ type: "success", message: "微信号已保存，请重新申请加入" });
      } else {
        showToast({ type: "error", message: "保存微信号失败" });
      }
    } catch {
      showToast({ type: "error", message: "保存微信号失败" });
    } finally {
      setIsSavingWechat(false);
    }
  };

  const handleLeave = async () => {
    setShowLeave(false);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/leave`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMemberStatus(null);
        showToast({ type: "success", message: copy.success.leftTeam });
        loadTeam();
      } else {
        showToast({ type: "error", message: data.error || copy.errors.leaveFailed });
      }
    } catch {
      showToast({ type: "error", message: copy.errors.leaveFailed });
    }
  };

  const handleApprove = async (uid: string) => {
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/members/${uid}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast({ type: "success", message: copy.success.approved });
        setApplications((prev) => prev.filter((a) => a.userId !== uid));
        loadTeam();
      } else {
        showToast({ type: "error", message: data.error || copy.errors.reviewFailed });
      }
    } catch {
      showToast({ type: "error", message: copy.errors.reviewFailed });
    }
  };

  const handleReject = async (uid: string) => {
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/members/${uid}/reject`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast({ type: "success", message: copy.success.rejected });
        setApplications((prev) => prev.filter((a) => a.userId !== uid));
      } else {
        showToast({ type: "error", message: data.error || copy.errors.reviewFailed });
      }
    } catch {
      showToast({ type: "error", message: copy.errors.reviewFailed });
    }
  };

  const handleFormTeam = async () => {
    setIsForming(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUnderfilled: !isFull }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ type: "success", message: copy.teams.formTeamSuccess });
        loadTeam();
      } else {
        showToast({ type: "error", message: data.error || copy.teams.formTeamFailed });
      }
    } catch {
      showToast({ type: "error", message: copy.teams.formTeamFailed });
    } finally {
      setIsForming(false);
      setShowFormConfirm(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast({ type: "success", message: copy.teams.deleteTeamSuccess });
        setTimeout(() => window.location.href = "/my-teams", 1500);
      } else {
        showToast({ type: "error", message: data.error || copy.teams.deleteTeamFailed });
      }
    } catch {
      showToast({ type: "error", message: copy.teams.deleteTeamFailed });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return <TeamDetailSkeleton />;
  }

  if (error || !team) {
    return (
      <main className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-stone-400">{error || copy.teams.notFound}</p>
            <a href="/teams" className="text-amber-600 hover:text-amber-700 underline underline-offset-2">
              返回队伍列表
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const statusInfo = getStatusInfo(team.status);
  const isLeader = userId && team.leader?.id === userId;
  const isMember = memberStatus === "approved";
  const isPending = memberStatus === "pending";
  const canJoin = !isLeader && !isMember && !isPending && team.status === "recruiting" && team.currentMembers < team.maxMembers;
  const isFull = team.currentMembers >= team.maxMembers;
  const location = (team as any).location;
  const members = team.members || [];
  const remaining = team.maxMembers - team.currentMembers;

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* 主内容区 - 左右分栏 */}
      <div className="flex-1 max-w-7xl mx-auto px-6 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 lg:gap-12">
          
          {/* 左侧栏 - 核心信息 */}
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-6">
            {/* 队伍标题 */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 leading-tight">{team.title}</h1>
            </div>

            {/* 时间 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-base text-stone-700">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="font-medium">{team.date}</span>
              </div>
              {team.time && (
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Clock className="w-4 h-4" />
                  <span>{team.time}</span>
                </div>
              )}
              {team.durationMin && team.durationMin > 0 && (
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Timer className="w-4 h-4" />
                  <span>约 {formatDuration(team.durationMin)}</span>
                </div>
              )}
            </div>

            {/* 地点（移动端显示） */}
            {location && (
              <div className="lg:hidden">
                <a
                  href={`/locations/${location.id}`}
                  className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg text-stone-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium text-sm">{location.name}</span>
                  <ArrowRight className="w-3 h-3 ml-auto" />
                </a>
              </div>
            )}

            {/* 简介 */}
            {team.description && (
              <div className="border-t border-stone-100 pt-4">
                <p className="text-sm text-stone-600 leading-relaxed">{team.description}</p>
              </div>
            )}

{/* 名额信息 */}
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600 mb-1">
                {team.currentMembers}<span className="text-stone-400 text-lg">/{team.maxMembers}</span>
              </p>
              <p className="text-xs text-stone-500">人已加入</p>
              {canJoin && remaining > 0 && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  {remaining === 1 ? "仅剩 1 个名额" : `还剩 ${remaining} 个名额`}
                </p>
              )}
            </div>

            {/* 创建人卡片 */}
            {team.leader && (
              <div className="border-t border-stone-100 pt-4">
                <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
                  <Crown className="w-3.5 h-3.5" />
                  <span className="font-medium">创建人</span>
                </div>
                <a
                  href={`/users/${team.leader.id}`}
                  className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-amber-50 transition-colors"
                >
                  <Avatar name={team.leader.nickname || team.leader.name || undefined} avatar={team.leader.avatar} isLeader size="md" />
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900 text-sm">{team.leader.nickname || team.leader.name}</p>
                  </div>
                </a>
              </div>
            )}

            {/* 队长操作（队长可见） */}
            {isLeader && (
              <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
                <a
                  href={`/teams/${teamId}/edit`}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-white rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  编辑队伍
                </a>
                <button
                  onClick={() => setShowShare(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-white rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  分享队伍
                </button>
                {(team.status === "recruiting" || team.status === "full") && (
                  <button
                    onClick={() => setShowFormConfirm(true)}
                    disabled={isForming}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    {isForming && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Users className="w-4 h-4" />
                    {isFull ? copy.teams.formTeam : copy.teams.formTeamUnderfilled}
                  </button>
                )}
                {(team.status === "recruiting" || team.status === "cancelled") && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Trash2 className="w-4 h-4" />
                    {copy.teams.deleteTeam}
                  </button>
                )}
              </div>
            )}

            {/* 成员状态（已加入/待审核） */}
            {isMember && (
              <div className="bg-amber-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium text-sm">已加入队伍</span>
                </div>
                <button
                  onClick={() => setShowLeave(true)}
                  className="w-full text-xs text-stone-400 hover:text-red-600 py-1 transition-colors"
                >
                  退出队伍
                </button>
              </div>
            )}

            {isPending && (
              <div className="bg-stone-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-stone-500">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium text-sm">申请待审核</span>
                </div>
                <a href="/my-teams" className="block text-center text-xs text-amber-600 hover:text-amber-700">
                  查看我的队伍 →
                </a>
              </div>
            )}

            {/* 待审核申请模块（仅队长可见） */}
            {isLeader && applications.length > 0 && (
              <div className="border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="font-medium">待审核申请</span>
                  </div>
                  <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                    {applications.length} 人
                  </span>
                </div>
                <div className="space-y-2">
                  {applications.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      onApprove={() => handleApprove(app.userId)}
                      onReject={() => handleReject(app.userId)}
                      isTeamFull={isFull}
                    />
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* 右侧主内容 */}
          <div className="space-y-6">
            {/* ── 地点封面图（大尺寸，可点击）── */}
            {location && (
              <a
                href={`/locations/${location.id}`}
                className="group block"
              >
                <div className="relative h-[300px] lg:h-[400px] rounded-2xl overflow-hidden bg-stone-100 hover:shadow-xl hover:shadow-amber-100/30 transition-all duration-300">
                  {location.coverImage ? (
                    <img
                      src={location.coverImage}
                      alt={location.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
                      <Mountain className="h-16 w-16 text-amber-400/60" />
                    </div>
                  )}
                  
                  {/* 渐变遮罩 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* 状态徽章（左上角） */}
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-500/90 text-white backdrop-blur-sm shadow-lg">
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  {/* 城市标签（右上角） */}
                  {location.cityName && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
                        <MapPin className="w-3.5 h-3.5" />
                        {location.cityName}
                      </span>
                    </div>
                  )}
                  
                  {/* 底部信息 */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>活动地点</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{location.name}</h2>
                    
                    {/* 路线信息（可选） */}
                    {(() => {
                      const route = location.routes?.[0];
                      if (!route) return null;
                      return (
                        <div className="flex items-center gap-4 text-white/70 text-sm mb-3">
                          {route.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {route.duration}
                            </span>
                          )}
                          {route.distance && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              {route.distance}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* 点击提示 */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 backdrop-blur-sm border border-amber-400/30 text-amber-200 hover:text-white text-sm font-medium transition-all duration-150">
                      <span>{copy.teams.viewLocationDetail}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </div>
                </div>
              </a>
            )}

            {/* 参与要求 */}
            {Array.isArray(team.requirements) && team.requirements.length > 0 && (
              <div className="bg-stone-50 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  参与要求
                </h3>
                <ul className="space-y-3">
                  {team.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 text-base text-stone-600">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-medium flex items-center justify-center mt-0.5 flex-shrink-0">
                        {i + 1}
                      </span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Guest List */}
            {members.length > 0 && (
              <div className="bg-stone-50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-stone-900">Guest List</h3>
                  <span className="text-sm text-stone-500 bg-white px-3 py-1 rounded-full">
                    {members.length} Going
                  </span>
                </div>
                <MemberAvatarGrid members={members} leaderId={team.leader?.id} />
              </div>
            )}

            {/* 主操作按钮 */}
            {canJoin && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-full py-4 bg-amber-600 text-white text-lg font-medium rounded-xl hover:bg-amber-700 transition-colors"
              >
                申请加入
              </button>
            )}

            {/* 名额满提示 */}
            {!canJoin && !isLeader && !isMember && !isPending && team.status === "recruiting" && isFull && (
              <div className="bg-stone-50 rounded-2xl p-6 text-center">
                <p className="text-base text-stone-400">名额已满，无法加入</p>
              </div>
            )}

            {/* 已结束/已取消提示 */}
            {!canJoin && !isLeader && !isMember && !isPending && team.status !== "recruiting" && (
              <div className="bg-stone-50 rounded-2xl p-6 text-center">
                <p className="text-base text-stone-400">
                  {team.status === "completed" ? copy.teams.statusEnded : copy.teams.statusCancelled}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 加入弹窗 - 移动端 Bottom Sheet */}
      <JoinBottomSheet
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoin}
        isJoining={joining}
        joinMessage={joinMsg}
        setJoinMessage={setJoinMsg}
        remaining={remaining}
        fillRatio={Math.round((team.currentMembers / team.maxMembers) * 100)}
        currentMembers={team.currentMembers}
        maxMembers={team.maxMembers}
      />

      {/* 退出确认 */}
      {showLeave && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 animate-[fadeScaleIn_0.2s_ease_both]">
            <h3 className="text-lg font-bold text-stone-900 mb-2">{copy.teams.leaveTeamConfirm}</h3>
            <p className="text-sm text-stone-500 mb-4">{copy.teams.leaveTeamWarning}</p>
            <button onClick={handleLeave} className="w-full py-3 bg-red-500 text-white rounded-xl mb-2 hover:bg-red-600 transition-colors">
              {copy.teams.leaveTeam}
            </button>
            <button onClick={() => setShowLeave(false)} className="w-full py-3 text-stone-500 hover:bg-stone-50 rounded-xl transition-colors">
              {copy.common.cancel}
            </button>
          </div>
        </div>
      )}

      {/* 组建队伍确认 */}
      {showFormConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 animate-[fadeScaleIn_0.2s_ease_both]">
            <h3 className="text-lg font-bold text-stone-900 mb-2">
              {isFull ? copy.teams.formTeamConfirm : copy.teams.formTeamUnderfilledConfirm}
            </h3>
            <p className="text-sm text-stone-500 mb-4">{copy.teams.formTeamWarning}</p>
            <button
              onClick={handleFormTeam}
              disabled={isForming}
              className="w-full py-3 bg-amber-600 text-white rounded-xl mb-2 hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isForming && <Loader2 className="w-4 h-4 animate-spin" />}
              {isFull ? copy.teams.formTeam : copy.teams.formTeamUnderfilled}
            </button>
            <button
              onClick={() => setShowFormConfirm(false)}
              disabled={isForming}
              className="w-full py-3 text-stone-500 hover:bg-stone-50 rounded-xl transition-colors"
            >
              {copy.common.cancel}
            </button>
          </div>
        </div>
      )}

      {/* 删除队伍确认 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 animate-[fadeScaleIn_0.2s_ease_both]">
            <h3 className="text-lg font-bold text-stone-900 mb-2">
              {copy.teams.deleteTeamConfirm}
            </h3>
            <p className="text-sm text-stone-500 mb-4">{copy.teams.deleteTeamWarning}</p>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full py-3 bg-red-600 text-white rounded-xl mb-2 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {copy.teams.deleteTeam}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="w-full py-3 text-stone-500 hover:bg-stone-50 rounded-xl transition-colors"
            >
              {copy.common.cancel}
            </button>
          </div>
        </div>
      )}

      {/* 分享弹窗 */}
      {showShare && (
        <SharePosterModal
          type="team"
          title={team.title}
          subtitle={team.date}
          url={window.location.href}
          meta={`${team.currentMembers}/${team.maxMembers} 人`}
          onClose={() => setShowShare(false)}
          onToast={showToast}
        />
      )}

      {/* 微信号确认对话框 */}
      {showWechatConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]"
          >
            <h3 className="text-lg font-bold text-stone-900 mb-2">
              {copy.teams.wechatRequiredJoinTitle}
            </h3>
            <p className="text-sm text-stone-500 leading-relaxed mb-6">
              {copy.teams.wechatRequiredJoinDesc}
            </p>
            <button
              onClick={() => { setShowWechatConfirm(false); setShowWechatSheet(true); }}
              className="w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors mb-2"
            >
              {copy.teams.fillWechatBtn || "去填写"}
            </button>
            <button
              onClick={() => setShowWechatConfirm(false)}
              className="w-full py-3 text-stone-500 text-sm font-medium hover:bg-stone-50 rounded-xl transition-colors"
            >
              {copy.common.cancel}
            </button>
          </div>
        </div>
      )}

      {/* 微信号编辑弹窗 */}
      {showWechatSheet && (
        <WechatEditModal
          onClose={() => setShowWechatSheet(false)}
          onSave={handleSaveWechat}
          isSaving={isSavingWechat}
        />
      )}

      {/* Toast */}
      <ToastDisplay toast={toast} exiting={exiting} />

      {/* 移动端底部固定操作栏 */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-100 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          {isLeader ? (
            <div className="flex items-center justify-between min-h-[44px]">
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <Crown className="h-4 w-4" />
                <span className="font-medium">{copy.teams.youAreLeader}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowShare(true)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                  <Share2 className="h-4 w-4" />
                </button>
                {(team.status === "recruiting" || team.status === "cancelled") && (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                    title={copy.teams.deleteTeam}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <a href={`/teams/${teamId}/edit`} className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <Pencil className="h-3 w-3" />
                  {copy.teams.editBtn}
                </a>
              </div>
            </div>
          ) : isMember ? (
            <div className="flex items-center justify-between min-h-[44px]">
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{copy.teams.statusApproved}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowShare(true)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                  <Share2 className="h-4 w-4" />
                </button>
                <button onClick={() => setShowLeave(true)} className="flex items-center gap-1 text-xs text-stone-500 border border-stone-200 rounded-full px-3 py-1.5 hover:border-red-300 hover:text-red-500 transition-colors">
                  <LogOut className="h-3 w-3" />
                  {copy.teams.leaveTeam}
                </button>
              </div>
            </div>
          ) : isPending ? (
            <div className="flex items-center justify-between min-h-[44px]">
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{copy.teams.statusPending}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowShare(true)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                  <Share2 className="h-4 w-4" />
                </button>
                <a href="/my-teams" className="text-xs text-amber-600 flex items-center gap-1">
                  查看 <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : canJoin ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowShare(true)} className="w-11 h-11 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-amber-50 hover:text-amber-600 border border-stone-200 hover:border-amber-200 transition-all flex-shrink-0">
                <Share2 className="h-4 w-4" />
              </button>
              <button onClick={() => setShowJoinModal(true)} className="flex-1 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 transition-all min-h-[44px]">
                {copy.teams.joinTeam}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between min-h-[44px]">
              <div className="text-stone-400 text-sm">
                {team.status === "completed" ? copy.teams.statusEnded : team.status === "cancelled" ? copy.teams.statusCancelled : copy.teams.teamFull}
              </div>
              <button onClick={() => setShowShare(true)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

function TeamDetailSkeleton() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto px-6 py-8 lg:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 lg:gap-12">
          <aside className="space-y-6">
            <div className="h-8 w-3/4 bg-stone-100 rounded-lg animate-pulse" />
            <div className="h-20 bg-stone-100 rounded-xl animate-pulse" />
            <div className="h-32 bg-stone-100 rounded-xl animate-pulse" />
          </aside>
          <div className="space-y-6">
            <div className="h-48 bg-stone-100 rounded-2xl animate-pulse" />
            <div className="h-64 bg-stone-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function JoinBottomSheet({
  open,
  onClose,
  onJoin,
  isJoining,
  joinMessage,
  setJoinMessage,
  remaining,
  fillRatio,
  currentMembers,
  maxMembers,
}: {
  open: boolean;
  onClose: () => void;
  onJoin: () => void;
  isJoining: boolean;
  joinMessage: string;
  setJoinMessage: (v: string) => void;
  remaining: number;
  fillRatio: number;
  currentMembers: number;
  maxMembers: number;
}) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl animate-[slide-up_0.3s_ease_both]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
        </div>
        <div className="px-5 pb-5 pt-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-lg">申请加入</h3>
              <p className="text-sm text-stone-400 mt-0.5">
                {remaining === 1 ? "就差你一个了！" : `还差 ${remaining} 位伙伴`}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-stone-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mb-4 bg-amber-50/60 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-stone-500">已有 {currentMembers} / {maxMembers} 人</span>
              <span className="text-xs font-semibold text-amber-600">{fillRatio}%</span>
            </div>
            <AnimatedProgress ratio={fillRatio} isFull={false} />
          </div>
          <textarea
            placeholder={copy.teams.joinPlaceholder}
            value={joinMessage}
            onChange={(e) => setJoinMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl text-stone-800 text-sm placeholder:text-stone-400 focus:outline-none resize-none mb-4 bg-stone-50 border border-stone-200 focus:border-amber-400 transition-all"
          />
          <button
            onClick={onJoin}
            disabled={isJoining}
            className="w-full py-3.5 font-semibold text-white rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
            {copy.teams.joinTeam}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaveConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
        <h3 className="text-lg font-bold text-stone-900 mb-2">{copy.teams.leaveTeamConfirm}</h3>
        <p className="text-sm text-stone-500 leading-relaxed mb-6">{copy.teams.leaveTeamWarning}</p>
        <button onClick={onConfirm} className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors mb-2">
          {copy.teams.leaveTeam}
        </button>
        <button onClick={onCancel} className="w-full py-3 rounded-2xl text-stone-500 text-sm font-medium hover:bg-stone-50 transition-colors">
          {copy.common.cancel}
        </button>
      </div>
    </div>
  );
}

function ApprovalConfirmDialog({
  open,
  type,
  userName,
  isLoading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  type: "approve" | "reject";
  userName: string;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const isApprove = type === "approve";
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
        <h3 className="text-lg font-bold text-stone-900 mb-2">
          {isApprove ? copy.teams.approveConfirm : copy.teams.rejectConfirm}
        </h3>
        <p className="text-sm text-stone-500 leading-relaxed mb-6">
          {isApprove ? `${userName} 将正式加入队伍` : `拒绝后，${userName} 将不能加入此队伍。`}
        </p>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            "w-full py-3 rounded-2xl text-white text-sm font-semibold transition-colors mb-2 flex items-center justify-center gap-2",
            isApprove ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600" : "bg-red-500 hover:bg-red-600"
          )}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isApprove ? copy.teams.approveBtn : copy.teams.rejectBtn}
        </button>
        <button onClick={onCancel} disabled={isLoading} className="w-full py-3 rounded-2xl text-stone-500 text-sm font-medium hover:bg-stone-50 transition-colors">
          {copy.common.cancel}
        </button>
      </div>
    </div>
  );
}

function FormTeamConfirmDialog({
  open,
  isFull,
  isLoading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  isFull: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
        <h3 className="text-lg font-bold text-stone-900 mb-2">
          {isFull ? copy.teams.formTeamConfirm : copy.teams.formTeamUnderfilledConfirm}
        </h3>
        <p className="text-sm text-stone-500 leading-relaxed mb-6">{copy.teams.formTeamWarning}</p>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-sm font-semibold transition-colors mb-2 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          确认组建
        </button>
        <button onClick={onCancel} disabled={isLoading} className="w-full py-3 rounded-2xl text-stone-500 text-sm font-medium hover:bg-stone-50 transition-colors">
          {copy.common.cancel}
        </button>
      </div>
    </div>
  );
}

function WechatEditModal({
  onClose,
  onSave,
  isSaving,
}: {
  onClose: () => void;
  onSave: (wechat: string) => void;
  isSaving: boolean;
}) {
  const [wechatInput, setWechatInput] = React.useState("");

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">{copy.profile.wechat}</h3>
            <p className="text-xs text-stone-400 mt-0.5">{copy.profile.wechatHint}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-stone-400 hover:text-stone-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <input
          type="text"
          value={wechatInput}
          onChange={(e) => setWechatInput(e.target.value)}
          placeholder={copy.profile.wechatPlaceholder}
          className="w-full px-4 py-3 bg-stone-50 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-amber-200 border border-stone-200"
        />
        <button
          onClick={() => onSave(wechatInput)}
          disabled={isSaving || !wechatInput.trim()}
          className="w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mb-2"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          保存
        </button>
        <button
          onClick={onClose}
          disabled={isSaving}
          className="w-full py-3 text-stone-500 text-sm hover:bg-stone-50 rounded-xl transition-colors"
        >
          {copy.common.cancel}
        </button>
      </div>
    </div>
  );
}