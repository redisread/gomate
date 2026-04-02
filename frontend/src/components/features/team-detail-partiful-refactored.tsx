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
  Crown,
  X,
  Pencil,
  Share2,
  Mountain,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { copy } from "@/lib/copy";
import type { Team, Application, Tag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SharePosterModal } from "./share-poster-modal";

// 导入新的 Hooks
import { useTeamDetail, useMyTeamStatus, useTeamApplications, useCurrentUser } from "@/hooks/useTeamDetail";
import { useTeamActions } from "@/hooks/useTeamActions";
import { useToast } from "@/hooks/useToast";

// 导入工具函数
import { getStatusInfo, formatRelativeTime, getRandomKaomoji, calculateTeamProgress, getClosedMessage } from "@/lib/team-utils";

// 导入埋点
import { teamAnalytics } from "@/lib/analytics";

// Toast 显示组件
function ToastDisplay({ 
  toast, 
  isExiting 
}: { 
  toast: { type: "success" | "error"; message: string } | null; 
  isExiting: boolean;
}) {
  if (!toast) return null;
  const isSuccess = toast.type === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-[60]",
        isExiting ? "animate-[fade-out_0.2s_ease-in_both]" : "animate-[fade-up_0.25s_ease_both]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium",
          isSuccess ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
        )}
      >
        {isSuccess ? <CheckCircle className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

// Avatar 组件
function Avatar({ 
  name, 
  avatar, 
  isLeader, 
  size = "md" 
}: { 
  name?: string; 
  avatar?: string | null; 
  isLeader?: boolean; 
  size?: "sm" | "md" | "lg" 
}) {
  const randomKaomoji = React.useMemo(() => getRandomKaomoji(), []);
  
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
        <img src={avatar} alt={name} className="w-full h-full object-cover rounded-full" loading="lazy" />
      ) : (
        <span className="text-sm" aria-hidden="true">{randomKaomoji}</span>
      )}
      {isLeader && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center" aria-label="队长">
          <Crown className="w-3 h-3 text-white" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

// MemberRow 组件（添加无障碍支持）
function MemberRow({ 
  members, 
  leaderId 
}: { 
  members: Array<{ id: string; userId: string; nickname?: string; name?: string; avatar?: string }>; 
  leaderId?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const displayMembers = expanded ? members : members.slice(0, 6);

  return (
    <ul role="list" aria-label={`队伍成员，共 ${members.length} 人`} className="flex flex-wrap gap-2">
      {displayMembers.map((m) => (
        <li key={m.id}>
          <a
            href={`/users/${m.userId}`}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-amber-50 transition-colors"
            aria-label={`${m.nickname || m.name || "成员"}的主页`}
          >
            <Avatar name={m.nickname || m.name} avatar={m.avatar} isLeader={m.userId === leaderId} size="sm" />
            <span className="text-xs text-stone-600">{m.nickname || m.name}</span>
          </a>
        </li>
      ))}
      {!expanded && members.length > 6 && (
        <li>
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-amber-600 transition-colors px-4 py-2"
            aria-label={`查看全部 ${members.length} 位成员`}
          >
            View all
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </button>
        </li>
      )}
    </ul>
  );
}

// ApplicationCard 组件
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
          onClick={() => teamAnalytics.viewMember(application.user.id, application.user.id)}
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
            aria-label={`批准 ${name} 的申请`}
          >
            {approving && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}
            {approving ? "处理中" : "批准"}
          </button>
          <button
            onClick={handleReject}
            disabled={approving || rejecting}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-stone-200 text-stone-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
            aria-label={`拒绝 ${name} 的申请`}
          >
            {rejecting && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}
            {rejecting ? "处理中" : "拒绝"}
          </button>
        </div>
      )}
    </div>
  );
}

// WechatEditModal 组件
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
      <div 
        className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wechat-modal-title"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 id="wechat-modal-title" className="text-lg font-bold text-stone-900">{copy.profile.wechat}</h3>
            <p className="text-xs text-stone-400 mt-0.5">{copy.profile.wechatHint}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-stone-400 hover:text-stone-600"
            aria-label="关闭"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <input
          type="text"
          value={wechatInput}
          onChange={(e) => setWechatInput(e.target.value)}
          placeholder={copy.profile.wechatPlaceholder}
          className="w-full px-4 py-3 bg-stone-50 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-amber-200 border border-stone-200"
          aria-label="微信号输入框"
        />
        <button
          onClick={() => onSave(wechatInput)}
          disabled={isSaving || !wechatInput.trim()}
          className="w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mb-2"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
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

// EditTeamModal 组件
function EditTeamModal({
  open,
  team,
  onClose,
  onSuccess,
}: {
  open: boolean;
  team: Team;
  onClose: () => void;
  onSuccess: (updated: Partial<Team>) => void;
}) {
  const [title, setTitle] = React.useState(team.title);
  const [desc, setDesc] = React.useState(team.description || "");
  const [max, setMax] = React.useState(String(team.maxMembers));
  const [time, setTime] = React.useState(team.time);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(team.title);
      setDesc(team.description || "");
      setMax(String(team.maxMembers));
      setTime(team.time);
    }
  }, [open, team]);

  const submit = async () => {
    if (!title.trim()) return;
    const maxNum = parseInt(max, 10);
    if (maxNum < 2 || maxNum > 50 || maxNum < team.currentMembers) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim() || null,
          maxMembers: maxNum,
          time,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess({ title: title.trim(), description: desc.trim() || undefined, maxMembers: maxNum, time });
        onClose();
      }
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-[fadeScaleIn_0.2s_ease_both]">
        <div className="flex items-center justify-between mb-4">
          <h2 id="edit-modal-title" className="text-lg font-bold text-stone-900">{copy.teams.editTitle}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600" aria-label="关闭">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="team-title" className="text-xs font-medium text-stone-600 mb-1 block">队伍名称</label>
            <input
              id="team-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label htmlFor="team-desc" className="text-xs font-medium text-stone-600 mb-1 block">队伍描述</label>
            <textarea
              id="team-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-stone-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="team-max" className="text-xs font-medium text-stone-600 mb-1 block">人数上限</label>
              <input
                id="team-max"
                type="number"
                min={2}
                max={50}
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label htmlFor="team-time" className="text-xs font-medium text-stone-600 mb-1 block">出发时间</label>
              <input
                id="team-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
          </div>
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="mt-5 w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : copy.common.save}
        </button>
      </div>
    </div>
  );
}

// 主组件
interface TeamDetailPartifulProps {
  teamId: string;
}

export function TeamDetailPartiful({ teamId }: TeamDetailPartifulProps) {
  // 使用新的 Hooks
  const { team, isLoading, error, refetch, setTeam } = useTeamDetail({ teamId });
  const { memberStatus, refetch: refetchStatus, setMemberStatus } = useMyTeamStatus(teamId);
  const { applications, isLoading: isLoadingApps, refetch: refetchApps, setApplications } = useTeamApplications(teamId);
  const { currentUser, isLoggedIn } = useCurrentUser();

  // Toast Hook
  const { toast, isExiting, show: showToast } = useToast();

  // 操作 Hook
  const {
    joinTeam,
    leaveTeam,
    approveMember,
    rejectMember,
    formTeam,
    updateTeam,
    saveWechat,
    isJoining,
    isLeaving,
    isApproving,
    isRejecting,
    isForming,
    isSavingWechat,
  } = useTeamActions({
    teamId,
    onSuccess: () => {
      refetch();
      refetchStatus();
      refetchApps();
    },
  });

  // UI 状态
  const [showJoinModal, setShowJoinModal] = React.useState(false);
  const [joinMsg, setJoinMsg] = React.useState("");
  const [showShare, setShowShare] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);
  const [showLeave, setShowLeave] = React.useState(false);
  const [showFormConfirm, setShowFormConfirm] = React.useState(false);
  const [showWechatConfirm, setShowWechatConfirm] = React.useState(false);
  const [showWechatSheet, setShowWechatSheet] = React.useState(false);

  // 页面浏览埋点
  React.useEffect(() => {
    if (team) {
      teamAnalytics.viewTeam(teamId, team.title);
    }
  }, [teamId, team]);

  // 处理加入队伍
  const handleJoin = async () => {
    if (!isLoggedIn) {
      window.location.href = `/login?redirect=/teams/${teamId}`;
      return;
    }

    teamAnalytics.clickJoinButton(teamId);
    teamAnalytics.openJoinModal(teamId);
    teamAnalytics.submitJoinForm(teamId, !!joinMsg);

    const result = await joinTeam(joinMsg);

    if (result.success) {
      teamAnalytics.joinSuccess(teamId);
      setShowJoinModal(false);
      setMemberStatus("pending");
      refetch();
    } else if (result.needsWechat) {
      setShowJoinModal(false);
      setTimeout(() => setShowWechatConfirm(true), 300);
    }
  };

  // 处理保存微信号
  const handleSaveWechat = async (wechat: string) => {
    if (!currentUser?.id) return;
    
    const success = await saveWechat(wechat, currentUser.id);
    if (success) {
      setShowWechatSheet(false);
      showToast({ type: "success", message: "微信号已保存，请重新申请加入" });
    }
  };

  // 处理退出队伍
  const handleLeave = async () => {
    setShowLeave(false);
    const success = await leaveTeam();
    if (success) {
      setMemberStatus(null);
    }
  };

  // 处理审批
  const handleApprove = async (userId: string) => {
    const success = await approveMember(userId);
    if (success) {
      setApplications((prev) => prev.filter((a) => a.userId !== userId));
      teamAnalytics.approveApplication(teamId, userId);
    }
  };

  const handleReject = async (userId: string) => {
    const success = await rejectMember(userId);
    if (success) {
      setApplications((prev) => prev.filter((a) => a.userId !== userId));
      teamAnalytics.rejectApplication(teamId, userId);
    }
  };

  // 处理编辑成功
  const handleEditSuccess = (updated: Partial<Team>) => {
    setTeam((prev) => (prev ? { ...prev, ...updated } : prev));
    showToast({ type: "success", message: copy.teams.editSuccess });
  };

  // 处理组建队伍
  const handleFormTeam = async () => {
    const success = await formTeam(!isFull);
    if (success) {
      setShowFormConfirm(false);
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            <div className="h-48 bg-stone-100 rounded-2xl animate-pulse" />
            <div className="space-y-4">
              <div className="h-10 w-3/4 bg-stone-100 rounded animate-pulse" />
              <div className="h-5 w-1/2 bg-stone-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // 错误状态
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

  // 计算状态
  const statusInfo = getStatusInfo(team.status, team.currentMembers, team.maxMembers);
  const isLeader = currentUser && team.leader?.id === currentUser.id;
  const isMember = memberStatus === "approved";
  const isPending = memberStatus === "pending";
  const { ratio: fillRatio, remaining, isFull } = calculateTeamProgress(team.currentMembers, team.maxMembers);
  const location = (team as any).location;
  const members = team.members || [];

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
                <Calendar className="w-4 h-4 text-amber-500" aria-hidden="true" />
                <span className="font-medium">{team.date}</span>
              </div>
              {team.time && (
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span>{team.time}</span>
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
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  <span className="font-medium text-sm">{location.name}</span>
                  <ArrowRight className="w-3 h-3 ml-auto" aria-hidden="true" />
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
              {!isFull && remaining > 0 && team.status === "recruiting" && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  {remaining === 1 ? "仅剩 1 个名额" : `还剩 ${remaining} 个名额`}
                </p>
              )}
            </div>

            {/* 创建人卡片 */}
            {team.leader && (
              <div className="border-t border-stone-100 pt-4">
                <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
                  <Crown className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="font-medium">创建人</span>
                </div>
                <a
                  href={`/users/${team.leader.id}`}
                  className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-amber-50 transition-colors"
                  onClick={() => teamAnalytics.viewMember(teamId, team.leader!.id)}
                >
                  <Avatar name={team.leader.nickname || team.leader.name} avatar={team.leader.avatar} isLeader size="md" />
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900 text-sm">{team.leader.nickname || team.leader.name}</p>
                  </div>
                </a>
              </div>
            )}

            {/* 队长操作 */}
            {isLeader && (
              <div className="bg-amber-50 rounded-xl p-3 space-y-1.5">
                <button
                  onClick={() => setShowEdit(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-white rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                  编辑队伍
                </button>
                <button
                  onClick={() => {
                    teamAnalytics.clickShare(teamId);
                    setShowShare(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-white rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  分享队伍
                </button>
                {(team.status === "recruiting" || team.status === "full") && (
                  <button
                    onClick={() => setShowFormConfirm(true)}
                    disabled={isForming}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    {isForming && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    <Users className="w-4 h-4" aria-hidden="true" />
                    {isFull ? copy.teams.formTeam : copy.teams.formTeamUnderfilled}
                  </button>
                )}
              </div>
            )}

            {/* 成员状态 */}
            {isMember && (
              <div className="bg-amber-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-700">
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
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
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span className="font-medium text-sm">申请待审核</span>
                </div>
                <a href="/my-teams" className="block text-center text-xs text-amber-600 hover:text-amber-700">
                  查看我的队伍 →
                </a>
              </div>
            )}

            {/* 待审核申请模块 */}
            {isLeader && applications.length > 0 && (
              <div className="border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
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
            {/* 地点封面图 */}
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
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
                      <Mountain className="h-16 w-16 text-amber-400/60" aria-hidden="true" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-500/90 text-white backdrop-blur-sm shadow-lg">
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  {location.cityName && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        {location.cityName}
                      </span>
                    </div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                      <MapPin className="w-4 h-4" aria-hidden="true" />
                      <span>活动地点</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{location.name}</h2>
                    
                    {(() => {
                      const route = location.routes?.[0];
                      if (!route) return null;
                      return (
                        <div className="flex items-center gap-4 text-white/70 text-sm mb-3">
                          {route.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" aria-hidden="true" />
                              {route.duration}
                            </span>
                          )}
                          {route.distance && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" aria-hidden="true" />
                              {route.distance}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 backdrop-blur-sm border border-amber-400/30 text-amber-200 hover:text-white text-sm font-medium transition-all duration-150">
                      <span>{copy.teams.viewLocationDetail}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </a>
            )}

            {/* 参与要求 */}
            {Array.isArray(team.requirements) && team.requirements.length > 0 && (
              <div className="bg-stone-50 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" aria-hidden="true" />
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
                <MemberRow members={members} leaderId={team.leader?.id} />
              </div>
            )}

            {/* 主操作按钮 */}
            {!isLeader && !isMember && !isPending && team.status === "recruiting" && !isFull && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-full py-4 bg-amber-600 text-white text-lg font-medium rounded-xl hover:bg-amber-700 transition-colors"
              >
                申请加入
              </button>
            )}

            {/* 名额满提示 */}
            {!isLeader && !isMember && !isPending && team.status === "recruiting" && isFull && (
              <div className="bg-stone-50 rounded-2xl p-6 text-center">
                <p className="text-base text-stone-400">名额已满，无法加入</p>
              </div>
            )}

            {/* 已结束/已取消提示 */}
            {!isLeader && !isMember && !isPending && team.status !== "recruiting" && (
              <div className="bg-stone-50 rounded-2xl p-6 text-center">
                <p className="text-base text-stone-400">{getClosedMessage(team)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 加入弹窗 */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-[fadeScaleIn_0.2s_ease_both]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-900">申请加入</h2>
              <button onClick={() => setShowJoinModal(false)} className="text-stone-400 hover:text-stone-600" aria-label="关闭">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <textarea
              value={joinMsg}
              onChange={(e) => setJoinMsg(e.target.value)}
              placeholder={copy.teams.joinPlaceholder}
              rows={3}
              className="w-full px-4 py-3 bg-stone-50 rounded-xl text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-amber-200"
              aria-label="申请留言"
            />
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {isJoining ? "提交中..." : "提交申请"}
            </button>
          </div>
        </div>
      )}

      {/* 退出确认 */}
      {showLeave && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 animate-[fadeScaleIn_0.2s_ease_both]">
            <h3 className="text-lg font-bold text-stone-900 mb-2">{copy.teams.leaveTeamConfirm}</h3>
            <p className="text-sm text-stone-500 mb-4">{copy.teams.leaveTeamWarning}</p>
            <button 
              onClick={handleLeave} 
              className="w-full py-3 bg-red-500 text-white rounded-xl mb-2 hover:bg-red-600 transition-colors"
            >
              {copy.teams.leaveTeam}
            </button>
            <button 
              onClick={() => setShowLeave(false)} 
              className="w-full py-3 text-stone-500 hover:bg-stone-50 rounded-xl transition-colors"
            >
              {copy.common.cancel}
            </button>
          </div>
        </div>
      )}

      {/* 组建队伍确认 */}
      {showFormConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
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
              {isForming && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
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

      {/* 编辑弹窗 */}
      {showEdit && team && (
        <EditTeamModal open={showEdit} team={team} onClose={() => setShowEdit(false)} onSuccess={handleEditSuccess} />
      )}

      {/* 分享弹窗 */}
      {showShare && (
        <SharePosterModal
          type="team"
          title={team.title}
          subtitle={team.date}
          url={typeof window !== "undefined" ? window.location.href : ""}
          meta={`${team.currentMembers}/${team.maxMembers} 人`}
          onClose={() => setShowShare(false)}
          onToast={showToast}
        />
      )}

      {/* 微信号确认对话框 */}
      {showWechatConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-[fadeScaleIn_0.2s_ease_both]">
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
      {toast && <ToastDisplay toast={toast} isExiting={isExiting} />}

      <Footer />
    </main>
  );
}