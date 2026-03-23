"use client";

import * as React from "react";
import {
  MapPin,
  ArrowRight,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle,
  Mountain,
  ChevronDown,
  Share2,
  XCircle,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Team, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// ─── Toast Hook（替代 alert()）────────────────────────────────────────────────
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

// ─── Toast 渲染组件 ────────────────────────────────────────────────────────────
function ToastDisplay({ toast, exiting }: { toast: { type: string; message: string } | null; exiting: boolean }) {
  if (!toast) return null;
  const isSuccess = toast.type === "success";

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 lg:left-auto lg:right-6",
        exiting
          ? "animate-[slide-down-toast_0.2s_ease-in_both] lg:animate-[fade-out_0.2s_ease-in_both] motion-reduce:animate-none"
          : "animate-[slide-up-toast_0.25s_cubic-bezier(0.16,1,0.3,1)_both] lg:animate-[fade-up_0.25s_ease_both] motion-reduce:animate-none"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-4 rounded-2xl shadow-lg text-sm font-medium text-stone-800",
          isSuccess
            ? "bg-white border border-amber-200 shadow-amber-900/10"
            : "bg-white border border-red-200 shadow-red-900/10"
        )}
      >
        {isSuccess ? (
          <CheckCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
        )}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

// ─── 进度条动画组件（可复用）────────────────────────────────────────────────
function AnimatedProgress({ ratio, isFull }: { ratio: number; isFull: boolean }) {
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const t = setTimeout(() => setWidth(ratio), 100);
    return () => clearTimeout(t);
  }, [ratio]);

  return (
    <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
          isFull ? "bg-warm" : "bg-gradient-to-r from-amber-600 to-amber-500"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// ─── 成员行组件 ────────────────────────────────────────────────────────────────
function MemberRow({
  member,
  isTeamLeader,
}: {
  member: TeamMember;
  isTeamLeader: boolean;
}) {
  const displayName = member.nickname || member.name;
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
        isTeamLeader
          ? "bg-amber-50/60 border border-amber-100"
          : "hover:bg-stone-50"
      )}
    >
      {/* 头像 */}
      <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {member.avatar ? (
          <img
            src={member.avatar}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-stone-500 font-medium text-sm">
            {displayName?.[0] || "?"}
          </span>
        )}
      </div>
      {/* 名字 + 徽章 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <p className="font-medium text-stone-900 text-sm truncate">{displayName}</p>
        {isTeamLeader && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium flex-shrink-0">
            {copy.teams.leader}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 队伍状态信息 ────────────────────────────────────────────────────────────
function getStatusInfo(status: string, current: number, max: number) {
  if (status === "recruiting" && current < max) {
    return {
      label: copy.enums.teamStatus.recruiting,
      className: "bg-amber-50 text-amber-700 border border-amber-200",
    };
  }
  if (status === "full" || (status === "recruiting" && current >= max)) {
    return {
      label: copy.enums.teamStatus.full,
      className: "bg-warm/10 text-warm border border-warm/20",
    };
  }
  if (status === "formed") {
    return {
      label: copy.enums.teamStatus.formed,
      className: "bg-sky-50 text-sky-700 border border-sky-200",
    };
  }
  if (status === "completed") {
    return {
      label: copy.enums.teamStatus.completed,
      className: "bg-stone-100 text-stone-500 border border-stone-200",
    };
  }
  if (status === "cancelled") {
    return {
      label: copy.enums.teamStatus.cancelled,
      className: "bg-red-50 text-red-600 border border-red-200",
    };
  }
  return {
    label: copy.enums.teamStatus.recruiting,
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  };
}

// ─── 关闭状态文案 ─────────────────────────────────────────────────────────────
function getClosedMessage(team: Team): string {
  if (team.status === "completed") return copy.teams.statusEnded;
  if (team.status === "cancelled") return copy.teams.statusCancelled;
  if (team.currentMembers >= team.maxMembers) return copy.teams.teamFull;
  return copy.teams.statusEnded;
}

interface TeamDetailClientProps {
  teamId: string;
}

/** 成员列表折叠阈值 */
const COLLAPSE_THRESHOLD = 6;

/**
 * 队伍详情页客户端组件 - React Island
 * 视觉规范：GoMate Design Spec v1.0（Section F + D.2）
 *  - 消除所有 alert()/confirm()，使用 Toast + AlertDialog
 *  - 消除内联 style，使用 Tailwind token
 *  - 进度条首次挂载动画
 *  - 成员列表超 6 人折叠
 *  - 移动端底部栏最小 44px 点击目标
 */
export function TeamDetailClient({ teamId }: TeamDetailClientProps) {
  const [team, setTeam] = React.useState<Team | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [userMemberStatus, setUserMemberStatus] = React.useState<string | null>(null);
  const [isJoining, setIsJoining] = React.useState(false);
  const [joinMessage, setJoinMessage] = React.useState("");
  const [joinSuccess, setJoinSuccess] = React.useState(false);
  const [otherTeams, setOtherTeams] = React.useState<Team[]>([]);
  const [membersExpanded, setMembersExpanded] = React.useState(false);
  // 退出确认对话框
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);

  const { toast, exiting, show: showToast } = useToast();

  React.useEffect(() => {
    loadTeam();
    checkCurrentUser();
  }, [teamId]);

  const checkCurrentUser = async () => {
    try {
      const res = await fetchAPI("/auth/get-session");
      const data = await res.json();
      if (data?.user?.id) {
        setCurrentUserId(data.user.id);
        fetchUserMemberStatus();
      }
    } catch (error) {
      console.error("[TeamDetail] 获取当前用户会话失败:", error);
    }
  };

  const fetchUserMemberStatus = async () => {
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/my-status`);
      const data = await res.json();
      if (data.success) setUserMemberStatus(data.status);
    } catch (error) {
      console.error("[TeamDetail] 获取用户成员状态失败:", error);
    }
  };

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}`);
      if (res.status === 404) {
        setError(copy.teams.notFound);
        return;
      }
      const data = await res.json();
      if (data.success && data.team) {
        setTeam(data.team);
        fetchOtherTeams(data.team.locationId, teamId);
      } else {
        setError(copy.teams.notFound);
      }
    } catch {
      setError(copy.teams.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOtherTeams = async (locationId: string, currentId: string) => {
    try {
      const res = await fetchAPI(
        `/api/teams?locationId=${locationId}&status=recruiting&pageSize=3`
      );
      const data = await res.json();
      if (data.success) {
        setOtherTeams(
          (data.teams || [])
            .filter((t: Team) => t.id !== currentId)
            .slice(0, 2)
        );
      }
    } catch (error) {
      console.error("[TeamDetail] 获取同地点其他队伍失败:", error);
    }
  };

  const handleJoin = async () => {
    if (!currentUserId) {
      window.location.href = `/login?redirect=/teams/${teamId}`;
      return;
    }
    setIsJoining(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/join`, {
        method: "POST",
        body: JSON.stringify({ message: joinMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setJoinSuccess(true);
        setUserMemberStatus("pending");
        showToast({ type: "success", message: copy.success.applied });
        loadTeam();
      } else {
        showToast({ type: "error", message: data.error || copy.errors.joinFailed });
      }
    } catch {
      showToast({ type: "error", message: copy.errors.joinFailed });
    } finally {
      setIsJoining(false);
    }
  };

  /** 退出队伍（触发 ConfirmDialog 而非 confirm()）*/
  const handleLeaveClick = () => {
    setShowLeaveConfirm(true);
  };

  const handleLeave = async () => {
    setShowLeaveConfirm(false);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/leave`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setUserMemberStatus(null);
        showToast({ type: "success", message: copy.success.leftTeam });
        loadTeam();
      } else {
        showToast({ type: "error", message: data.error || copy.errors.leaveFailed });
      }
    } catch {
      showToast({ type: "error", message: copy.errors.leaveFailed });
    }
  };

  /* ---- Loading 态 ---- */
  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      </main>
    );
  }

  /* ---- Error 态 ---- */
  if (error || !team) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900 mb-3">
              {error || copy.teams.notFound}
            </h1>
            <a
              href="/teams"
              className="text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors"
            >
              {copy.nav.teams}
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const statusInfo = getStatusInfo(team.status, team.currentMembers, team.maxMembers);
  const isLeader = !!(currentUserId && team.leader?.id === currentUserId);
  const isMember = userMemberStatus === "approved";
  const isPending = userMemberStatus === "pending";
  const canJoin =
    !isLeader &&
    !isMember &&
    !isPending &&
    team.status === "recruiting" &&
    team.currentMembers < team.maxMembers;
  const isClosed = !canJoin && !isLeader && !isMember && !isPending;

  const fillRatio =
    team.maxMembers > 0
      ? Math.round((team.currentMembers / team.maxMembers) * 100)
      : 0;
  const isFull = team.currentMembers >= team.maxMembers;
  const remaining = team.maxMembers - team.currentMembers;

  // 名额说明文案
  const spotsText =
    remaining <= 0
      ? copy.teams.teamFull
      : remaining === 1
      ? copy.teams.spotsOneLeft
      : copy.teams.spotsDesc.replace("{remaining}", String(remaining));

  // 成员折叠控制
  const members = team.members || [];
  const shouldCollapse = members.length > COLLAPSE_THRESHOLD;

  // 当前加入状态标识符（用于 key 触发 fadeScaleIn）
  const currentState = isLeader
    ? "leader"
    : isMember
    ? "member"
    : isPending
    ? "pending"
    : canJoin
    ? "canJoin"
    : "closed";

  return (
    <main className="min-h-screen bg-stone-50 pb-24 lg:pb-0">
      <Navbar />

      {/* ================================================================
          封面图区域 — h-[400px] sm:h-[520px]（Design Spec C.2.1）
          ================================================================ */}
      <div className="relative h-[400px] sm:h-[520px] overflow-hidden bg-stone-900">
        {(team as any).location?.coverImage ? (
          <img
            src={(team as any).location.coverImage}
            alt={(team as any).location.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
            <Mountain className="h-24 w-24 text-stone-600" />
          </div>
        )}

        {/* 顶部渐变：保护导航栏可读性 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent" />
        {/* 底部渐变：衬托标题文字（Design Spec F.6）*/}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

        {/* 封面右上角：分享按钮 */}
        <div className="absolute top-5 right-5">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: team.title, url: window.location.href }).catch(() => { /* intentionally ignored: 用户取消分享 */ });
              } else {
                navigator.clipboard.writeText(window.location.href);
                showToast({ type: "success", message: copy.share.linkCopied });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white text-xs font-medium transition-all duration-150 active:scale-95"
          >
            <Share2 className="h-3.5 w-3.5" />
            {copy.teams.shareLabel}
          </button>
        </div>

        {/* 封面 bottom-20：地点链接（Design Spec C.2.1）*/}
        {(team as any).location && (
          <div className="absolute bottom-20 left-0 right-0 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">
              <a
                href={`/locations/${(team as any).location.id}`}
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors duration-150"
              >
                <MapPin className="h-4 w-4" />
                {(team as any).location.name}
              </a>
            </div>
          </div>
        )}

        {/* 封面 bottom-6：队伍标题（text-3xl sm:text-4xl）*/}
        <div className="absolute bottom-6 left-0 right-0 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {team.title}
            </h1>
          </div>
        </div>
      </div>

      {/* ================================================================
          主内容区：-mt-12 信息卡片 breakout
          ================================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ---- 左/中栏：主信息 ---- */}
          <div className="lg:col-span-2 space-y-6">

            {/* 信息卡片（-mt-12 breakout，shadow-warm-md）*/}
            <div className="bg-white rounded-2xl p-6 -mt-12 relative z-10 shadow-warm-md border border-stone-100">
              {/* 状态徽章 */}
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full",
                    statusInfo.className
                  )}
                >
                  {statusInfo.label}
                </span>
              </div>

              {/* 4 列数据网格 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-stone-50 pt-5">
                <div className="text-center">
                  <p className="text-xs text-stone-400 mb-1 flex items-center justify-center gap-1">
                    <Calendar className="h-3 w-3" /> {copy.teams.dateLabel}
                  </p>
                  <p className="font-semibold text-stone-800 text-sm">{team.date}</p>
                </div>
                {team.time && (
                  <div className="text-center">
                    <p className="text-xs text-stone-400 mb-1 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" /> {copy.teams.meetTimeLabel}
                    </p>
                    <p className="font-semibold text-stone-800 text-sm">{team.time}</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs text-stone-400 mb-1 flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" /> {copy.teams.membersCountLabel}
                  </p>
                  <p
                    className={cn(
                      "font-semibold text-sm",
                      isFull ? "text-warm" : "text-amber-600"
                    )}
                  >
                    {team.currentMembers}/{team.maxMembers}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-stone-400 mb-2">{copy.teams.progressLabel}</p>
                  <div className="px-2">
                    <AnimatedProgress ratio={fillRatio} isFull={isFull} />
                    <p className={cn("text-xs font-medium mt-1", isFull ? "text-warm" : "text-amber-600")}>
                      {fillRatio}%
                    </p>
                  </div>
                </div>
              </div>

              {/* 名额情感化描述 */}
              {!isClosed && (
                <p className="mt-3 text-xs text-stone-400 text-center">{spotsText}</p>
              )}
            </div>

            {/* 队伍描述 */}
            {team.description && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-6">
                <h2 className="text-lg font-semibold text-stone-900 mb-3">{copy.teams.introTitle}</h2>
                <p className="text-sm text-stone-500 leading-relaxed">{team.description}</p>
              </div>
            )}

            {/* 路线未定提示（Tailwind token 替代内联样式）*/}
            {!(team as any).routeId && (
              <div className="bg-warm/6 border border-warm/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warm flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-stone-900 mb-1">
                      {copy.teams.freeRouteTitle}
                    </h3>
                    <p className="text-sm text-stone-500 leading-relaxed">
                      {copy.teams.freeRouteDesc}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 成员列表（移除重复头像叠加；超 6 人折叠）*/}
            {members.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-6">
                <h2 className="text-lg font-semibold text-stone-900 mb-4">
                  {copy.teams.membersSectionTitle}
                  <span className="ml-2 text-sm font-normal text-stone-400">
                    {members.length} 人
                  </span>
                </h2>

                <div className="relative">
                  <div
                    className={cn(
                      "overflow-hidden transition-[max-height] duration-300 ease-in-out motion-reduce:transition-none",
                      shouldCollapse && !membersExpanded
                        ? "max-h-[300px]"
                        : "max-h-[2000px]"
                    )}
                  >
                    <div className="space-y-1.5">
                      {members.map((member: TeamMember) => {
                        const isTeamLeader = member.userId === team.leader?.id;
                        return (
                          <MemberRow
                            key={member.id}
                            member={member}
                            isTeamLeader={isTeamLeader}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* 折叠底部渐变遮罩 */}
                  {shouldCollapse && !membersExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  )}
                </div>

                {/* 展开/收起按钮 */}
                {shouldCollapse && (
                  <button
                    onClick={() => setMembersExpanded(!membersExpanded)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm text-amber-600 font-medium py-2 hover:text-amber-700 transition-colors duration-150"
                  >
                    <span>
                      {membersExpanded
                        ? "收起"
                        : `查看全部 ${members.length} 位伙伴`}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
                        membersExpanded ? "rotate-180" : "rotate-0"
                      )}
                    />
                  </button>
                )}
              </div>
            )}

            {/* 地点简介卡 */}
            {(team as any).location && (
              <a href={`/locations/${(team as any).location.id}`}>
                <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-5 group hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
                  {(team as any).location.coverImage && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={(team as any).location.coverImage}
                        alt={(team as any).location.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-400 mb-1">活动地点</p>
                    <h3 className="font-semibold text-stone-900 group-hover:text-amber-700 transition-colors text-sm mb-2">
                      {(team as any).location.name}
                    </h3>
                    <span className="inline-flex items-center text-sm font-medium text-amber-600">
                      {copy.teams.viewLocationDetail}
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-150" />
                    </span>
                  </div>
                </div>
              </a>
            )}

            {/* 同地点其他队伍 */}
            {otherTeams.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-stone-900 mb-3">
                  {copy.teams.otherTeamsAtLocation}
                </h3>
                <div className="space-y-3">
                  {otherTeams.map((t) => {
                    const s = getStatusInfo(t.status, t.currentMembers, t.maxMembers);
                    return (
                      <a key={t.id} href={`/teams/${t.id}`}>
                        <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-4 group hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-200">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-stone-900 text-sm group-hover:text-amber-700 transition-colors">
                              {t.title}
                            </h4>
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0",
                                s.className
                              )}
                            >
                              {s.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-stone-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" /> {t.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />{" "}
                              {t.currentMembers}/{t.maxMembers} 人
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ================================================================
              右栏：桌面端 sticky 侧边栏
              ================================================================ */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-5">

              {/* 队长信息卡 */}
              {team.leader && (
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "#fff", border: "1px solid #f0ebe3", boxShadow: "0 2px 12px rgba(30,24,18,0.06)" }}
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "#c4b5a8" }}>
                    {copy.teams.leaderSectionTitle}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #D97706, #FCD34D)", boxShadow: "0 0 0 3px rgba(217,119,6,0.15)" }}
                    >
                      {team.leader.avatar ? (
                        <img
                          src={team.leader.avatar}
                          alt={team.leader.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {(team.leader.nickname || team.leader.name || "?")[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: "#1e1812" }}>
                        {team.leader.nickname || team.leader.name}
                      </p>
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#D97706" }}>
                        <span>👑</span>
                        {copy.teams.leaderInfoTitle}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 桌面端加入操作卡（5 状态对应不同 UI）*/}
              <div
                key={currentState}
                className="animate-[fadeScaleIn_0.2s_ease_both] motion-reduce:animate-none"
              >
                {canJoin && (
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "linear-gradient(160deg, #FFFBEB 0%, #faf8f5 100%)",
                      border: "1px solid rgba(217,119,6,0.18)",
                    }}
                  >
                    {/* 邀请文案 */}
                    <p className="text-sm font-medium mb-3" style={{ color: "#92400E" }}>
                      👋 {remaining === 1 ? "就差你一个了，快来！" : `还差 ${remaining} 位伙伴，一起出发`}
                    </p>

                    {/* 进度条 */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-stone-400">
                          已有 {team.currentMembers} / {team.maxMembers} 人
                        </span>
                        <span className="text-xs font-medium" style={{ color: "#D97706" }}>
                          {fillRatio}%
                        </span>
                      </div>
                      <AnimatedProgress ratio={fillRatio} isFull={isFull} />
                    </div>

                    {/* 留言框（桌面端 textarea）*/}
                    <textarea
                      placeholder={copy.teams.joinPlaceholderDesktop}
                      value={joinMessage}
                      onChange={(e) => setJoinMessage(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl text-stone-800 text-sm placeholder:text-stone-400 focus:outline-none resize-none mb-3 bg-white transition-all duration-200"
                      style={{ border: "1px solid #e8e0d7" }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#D97706";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,119,6,0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e8e0d7";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />

                    {/* 申请按钮 */}
                    <button
                      onClick={handleJoin}
                      disabled={isJoining}
                      className="w-full py-3 font-semibold text-white rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.97]"
                      style={{
                        background: isJoining ? "#D97706" : "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                        boxShadow: isJoining ? "none" : "0 4px 18px rgba(217,119,6,0.35)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isJoining) {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.transform = "translateY(-1px)";
                          el.style.boxShadow = "0 6px 24px rgba(217,119,6,0.45)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.transform = "translateY(0)";
                        el.style.boxShadow = "0 4px 18px rgba(217,119,6,0.35)";
                      }}
                    >
                      {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
                      {copy.teams.joinTeam}
                    </button>
                  </div>
                )}

                {isPending && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                    <Loader2 className="h-5 w-5 text-amber-500 animate-spin flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-900 text-sm">
                        {copy.teams.statusPending}
                      </p>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        {copy.teams.pendingDesc}
                      </p>
                    </div>
                  </div>
                )}

                {isMember && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-900 text-sm">
                        {copy.teams.statusApproved}
                      </p>
                      <button
                        onClick={handleLeaveClick}
                        className="text-xs text-stone-400 hover:text-red-500 transition-colors mt-1 underline underline-offset-2"
                      >
                        {copy.teams.leaveTeam}
                      </button>
                    </div>
                  </div>
                )}

                {isLeader && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-stone-900 text-sm">
                        {copy.teams.youAreLeader}
                      </p>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        {copy.teams.youAreLeaderDesc}
                      </p>
                      <a
                        href={`/my-teams`}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
                      >
                        {copy.teams.manageTeam}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* 出行提示卡 — 温暖友好风格 */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,122,101,0.05)", border: "1px solid rgba(255,122,101,0.15)" }}
              >
                <h4 className="font-medium mb-3 text-sm flex items-center gap-1.5" style={{ color: "#c0392b" }}>
                  <span>💛</span>
                  {copy.teams.safetyTips}
                </h4>
                <ul className="text-sm space-y-2.5 leading-relaxed" style={{ color: "#8f7f6e" }}>
                  {[
                    { icon: "⏰", text: copy.teams.safetyTip1 },
                    { icon: "💬", text: copy.teams.safetyTip2 },
                    { icon: "🤝", text: copy.teams.safetyTip3 },
                    { icon: "🌤", text: copy.teams.safetyTip4 },
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex-shrink-0 text-base leading-5">{tip.icon}</span>
                      <span>{tip.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          移动端底部固定加入栏（最小 44px，safe-area-inset-bottom）
          ================================================================ */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div
            key={`mobile-${currentState}`}
            className="animate-[fadeScaleIn_0.2s_ease_both] motion-reduce:animate-none"
          >
            {isLeader ? (
              <div className="flex items-center justify-center gap-2 text-stone-500 text-sm py-1 min-h-[44px]">
                <CheckCircle className="h-5 w-5 text-amber-600" />
                {copy.teams.youAreLeader}
              </div>
            ) : isMember ? (
              <div className="flex items-center justify-between min-h-[44px]">
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <CheckCircle className="h-5 w-5" />
                  {copy.teams.statusApproved}
                </div>
                <button
                  onClick={handleLeaveClick}
                  className="text-sm text-stone-400 hover:text-red-500 transition-colors underline underline-offset-2"
                >
                  {copy.teams.leaveTeam}
                </button>
              </div>
            ) : isPending ? (
              <div className="flex items-center gap-2 text-amber-600 text-sm justify-center py-1 min-h-[44px]">
                <Loader2 className="h-5 w-5 animate-spin" />
                {copy.teams.pendingDesc}
              </div>
            ) : joinSuccess ? (
              <div
                className="flex items-center justify-center gap-2 py-3 rounded-full bg-amber-50 border border-amber-200 text-amber-700 min-h-[44px] animate-[joinBounce_0.4s_ease_both] motion-reduce:animate-none"
              >
                <CheckCircle
                  className="h-5 w-5 text-amber-600 animate-[checkFadeIn_0.3s_0.1s_ease_both] motion-reduce:animate-none"
                />
                <span className="text-sm font-medium">{copy.success.applied}</span>
              </div>
            ) : canJoin ? (
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder={copy.teams.joinPlaceholder}
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-stone-200 rounded-full focus:outline-none focus:border-amber-400 text-stone-800 text-sm bg-stone-50 min-h-[44px]"
                />
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="px-6 py-2.5 rounded-full font-medium text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-brand-glow transition-all duration-150 disabled:opacity-60 flex items-center gap-2 min-h-[44px] active:scale-[0.97]"
                >
                  {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
                  {copy.teams.joinTeam}
                </button>
              </div>
            ) : (
              <div className="text-center text-stone-400 text-sm py-1 min-h-[44px] flex items-center justify-center">
                {getClosedMessage(team)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 退出队伍确认对话框（自定义，替代 confirm()）*/}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-warm-xl animate-[fadeScaleIn_0.2s_ease_both] motion-reduce:animate-none">
            <h3 className="text-lg font-bold text-stone-900 mb-2">
              {copy.teams.leaveTeamConfirm}
            </h3>
            <p className="text-sm text-stone-500 leading-relaxed mb-5">
              {copy.teams.leaveTeamWarning}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                {copy.common.cancel}
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                {copy.teams.leaveTeam}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 消息提示 */}
      <ToastDisplay toast={toast} exiting={exiting} />

      <Footer />
    </main>
  );
}
