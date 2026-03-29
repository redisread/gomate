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
  Crown,
  X,
  Pencil,
  LogOut,
  MessageCircle,
  Handshake,
  Cloud,
  Sparkles,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Team, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SharePosterModal } from "./share-poster-modal";
import {
  AnimatedProgress,
  MemberAvatarGrid,
  useToast,
  ToastDisplay,
  useScrollLock,
  getStatusInfo,
  getClosedMessage,
  getProgressStory,
  getTeamStory,
  getActionState,
} from "./team-detail-shared";

// ─── 骨架屏 ────────────────────────────────────────────────────────────────────
function TeamDetailSkeleton() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />
      {/* 封面骨架 */}
      <div className="h-[400px] sm:h-[520px] bg-stone-200 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {/* 信息卡骨架 */}
            <div className="bg-white rounded-2xl p-6 -mt-12 relative z-10 shadow-warm-md border border-stone-100">
              <div className="h-5 w-20 bg-stone-100 rounded-full animate-pulse mb-5" />
              <div className="grid grid-cols-3 gap-4 border-t border-stone-50 pt-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="h-3 w-12 bg-stone-100 rounded animate-pulse mx-auto" />
                    <div className="h-4 w-16 bg-stone-100 rounded animate-pulse mx-auto" />
                  </div>
                ))}
              </div>
            </div>
            {/* 描述卡骨架 */}
            <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-3 animate-pulse">
              <div className="h-5 w-24 bg-stone-100 rounded" />
              <div className="space-y-2">
                <div className="h-3 bg-stone-100 rounded w-full" />
                <div className="h-3 bg-stone-100 rounded w-5/6" />
                <div className="h-3 bg-stone-100 rounded w-4/6" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-stone-100 p-5 -mt-12 relative z-10 shadow-warm-md animate-pulse">
              <div className="h-24 bg-stone-100 rounded-xl" />
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 p-5 animate-pulse">
              <div className="h-32 bg-stone-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Bottom Sheet 加入面板（移动端）────────────────────────────────────────────
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
  useScrollLock(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-sheet-title"
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-warm-xl animate-[slide-up-toast_0.3s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-stone-300 rounded-full transition-colors" />
        </div>

        <div className="px-5 pb-5 pt-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 id="join-sheet-title" className="font-bold text-stone-900 text-lg">申请加入</h3>
              <p className="text-sm text-stone-500 mt-0.5">
                {remaining === 1 ? copy.teams.storyNarrative.ready.replace("{current}", String(currentMembers)) : getTeamStory(currentMembers, maxMembers)}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="关闭申请面板"
              className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-stone-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-3.5 border border-amber-200/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-stone-600">已有 {currentMembers} / {maxMembers} 人</span>
              <span className="text-xs font-bold text-amber-700">{fillRatio}%</span>
            </div>
            <AnimatedProgress ratio={fillRatio} isFull={false} showMilestones />
            {fillRatio > 0 && (
              <p className="mt-2 text-xs text-amber-700 font-medium">
                {getProgressStory(fillRatio)}
              </p>
            )}
          </div>

          <textarea
            placeholder={copy.teams.joinPlaceholder}
            aria-label="申请留言"
            aria-describedby="join-message-hint"
            value={joinMessage}
            onChange={(e) => setJoinMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl text-stone-800 text-sm placeholder:text-stone-400 focus:outline-none resize-none mb-1 bg-stone-50 border border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"
          />
          <p id="join-message-hint" className="text-xs text-stone-400 mb-4 px-1">
            {copy.teams.guidanceTooltips.messageInput}
          </p>

          <button
            onClick={onJoin}
            disabled={isJoining}
            className="w-full py-3.5 font-semibold text-white rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-brand-glow hover:shadow-[0_8px_24px_rgba(217,119,6,0.4)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.97] text-base"
          >
            {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
            {copy.teams.joinTeam}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 退出确认对话框 ────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-dialog-title"
        aria-describedby="leave-dialog-desc"
        className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-warm-xl animate-[fadeScaleIn_0.2s_ease_both]"
      >
        <h3 id="leave-dialog-title" className="text-lg font-bold text-stone-900 mb-2">{copy.teams.leaveTeamConfirm}</h3>
        <p id="leave-dialog-desc" className="text-sm text-stone-500 leading-relaxed mb-6">{copy.teams.leaveTeamWarning}</p>
        <button
          onClick={onConfirm}
          className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors mb-2"
        >
          {copy.teams.leaveTeam}
        </button>
        <button
          onClick={onCancel}
          className="w-full py-3 rounded-2xl text-stone-500 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          {copy.common.cancel}
        </button>
      </div>
    </div>
  );
}

// ─── 编辑队伍 Modal ────────────────────────────────────────────────────────────
interface EditTeamModalProps {
  open: boolean;
  team: Team;
  onClose: () => void;
  onSuccess: (updated: Partial<Team>) => void;
}

function EditTeamModal({ open, team, onClose, onSuccess }: EditTeamModalProps) {
  const [title, setTitle] = React.useState(team.title);
  const [description, setDescription] = React.useState(team.description || "");
  const [maxMembers, setMaxMembers] = React.useState(String(team.maxMembers));
  const [time, setTime] = React.useState(team.time);
  const [durationMin, setDurationMin] = React.useState(String(team.durationMin || 240));
  const [requirements, setRequirements] = React.useState(
    Array.isArray(team.requirements) ? team.requirements.join("\n") : ""
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  // 重置表单（每次打开时同步最新数据）
  React.useEffect(() => {
    if (open) {
      setTitle(team.title);
      setDescription(team.description || "");
      setMaxMembers(String(team.maxMembers));
      setTime(team.time);
      setDurationMin(String(team.durationMin || 240));
      setRequirements(Array.isArray(team.requirements) ? team.requirements.join("\n") : "");
      setFieldError(null);
    }
  }, [open, team]);

  const handleSubmit = async () => {
    if (!title.trim()) { setFieldError("队伍名称不能为空"); return; }
    const maxMembersNum = parseInt(maxMembers, 10);
    if (isNaN(maxMembersNum) || maxMembersNum < 2 || maxMembersNum > 50) {
      setFieldError("人数限制需在 2-50 之间");
      return;
    }
    if (maxMembersNum < team.currentMembers) {
      setFieldError(`人数上限不能低于当前成员数（${team.currentMembers} 人）`);
      return;
    }
    setFieldError(null);
    setIsSaving(true);
    try {
      const reqList = requirements.split("\n").map((s) => s.trim()).filter(Boolean);
      const res = await fetchAPI(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          maxMembers: maxMembersNum,
          time,
          durationMin: parseInt(durationMin, 10) || 240,
          requirements: reqList,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess({
          title: title.trim(),
          description: description.trim() || null,
          maxMembers: maxMembersNum,
          time,
          durationMin: parseInt(durationMin, 10) || 240,
          requirements: reqList,
        });
        onClose();
      } else {
        setFieldError(data.error || copy.teams.editFailed);
      }
    } catch {
      setFieldError(copy.teams.editFailed);
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-warm-xl animate-[fadeScaleIn_0.2s_ease_both] max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-900">{copy.teams.editTitle}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-stone-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* 队伍名称 */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">队伍名称 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-2xl text-stone-800 text-sm bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"
            />
          </div>

          {/* 队伍描述 */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">队伍描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl text-stone-800 text-sm bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all resize-none"
            />
          </div>

          {/* 人数 + 时间 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">人数上限 *</label>
              <input
                type="number"
                min={2}
                max={50}
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl text-stone-800 text-sm bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">出发时间</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl text-stone-800 text-sm bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"
              />
            </div>
          </div>

          {/* 活动时长 */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">活动时长（分钟）</label>
            <input
              type="number"
              min={30}
              max={1440}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl text-stone-800 text-sm bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"
            />
          </div>

          {/* 参与要求（每行一条） */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">参与要求（每行一条）</label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={3}
              placeholder="例如：需要有徒步经验&#10;自备充足饮用水"
              className="w-full px-4 py-2.5 rounded-2xl text-stone-800 text-sm bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all resize-none"
            />
          </div>

          {/* 错误提示 */}
          {fieldError && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {fieldError}
            </p>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-stone-600 text-sm font-medium bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            {copy.common.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-brand-glow transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? copy.teams.editBtnLoading : copy.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}

interface TeamDetailClientProps {
  teamId: string;
}

/**
 * 队伍详情页客户端组件 - React Island
 * 优化版本：头像网格成员展示、Bottom Sheet 加入流程、骨架屏、信息架构重排
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
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const [showJoinSheet, setShowJoinSheet] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);

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
    } catch (err) {
      console.error("[TeamDetail] 获取当前用户会话失败:", err);
    }
  };

  const fetchUserMemberStatus = async () => {
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/my-status`);
      const data = await res.json();
      if (data.success) setUserMemberStatus(data.status);
    } catch (err) {
      console.error("[TeamDetail] 获取用户成员状态失败:", err);
    }
  };

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}`);
      if (res.status === 404) { setError(copy.teams.notFound); return; }
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
      const res = await fetchAPI(`/api/teams?locationId=${locationId}&status=recruiting&pageSize=3`);
      const data = await res.json();
      if (data.success) {
        setOtherTeams((data.teams || []).filter((t: Team) => t.id !== currentId).slice(0, 2));
      }
    } catch (err) {
      console.error("[TeamDetail] 获取同地点其他队伍失败:", err);
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
        setShowJoinSheet(false);
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

  const handleLeave = async () => {
    setShowLeaveConfirm(false);
    try {
      const res = await fetchAPI(`/api/teams/${teamId}/leave`, { method: "POST" });
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

  const handleEditSuccess = (updated: Partial<Team>) => {
    setTeam((prev) => prev ? { ...prev, ...updated } : prev);
    showToast({ type: "success", message: copy.teams.editSuccess });
  };

  /* ---- 加载态：骨架屏 ---- */
  if (isLoading) return <TeamDetailSkeleton />;

  /* ---- 错误态 ---- */
  if (error || !team) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900 mb-3">{error || copy.teams.notFound}</h1>
            <a href="/teams" className="text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors">
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
    !isLeader && !isMember && !isPending &&
    team.status === "recruiting" && team.currentMembers < team.maxMembers;

  const fillRatio = team.maxMembers > 0 ? Math.round((team.currentMembers / team.maxMembers) * 100) : 0;
  const isFull = team.currentMembers >= team.maxMembers;
  const remaining = team.maxMembers - team.currentMembers;
  const members = team.members || [];

  // 当前状态 key，用于触发动画
  const currentState = isLeader ? "leader" : isMember ? "member" : isPending ? "pending" : canJoin ? "canJoin" : "closed";

  const location = (team as any).location;

  return (
    <main className="min-h-screen bg-stone-50 pb-24 lg:pb-0">
      <Navbar />

      {/* ================================================================
          封面图区域 — 增强视觉冲击力 + 教化设计
          ================================================================ */}
      <div className="relative h-[400px] sm:h-[520px] overflow-hidden bg-stone-900">
        {location?.coverImage ? (
          <img
            src={location.coverImage}
            alt={location.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
            <Mountain className="h-24 w-24 text-stone-600" />
          </div>
        )}

        {/* 光晕装饰层 */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-400/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -left-10 w-32 h-32 bg-amber-300/10 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 w-24 h-24 bg-white/5 blur-xl rounded-full pointer-events-none" />

        {/* 渐变层 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* 底部信息 */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-7">
          <div className="max-w-7xl mx-auto">
            {location && (
              <a
                href={`/locations/${location.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/25 to-amber-400/15 backdrop-blur-md border border-amber-400/40 text-amber-100 hover:text-white hover:border-amber-300/60 text-xs font-medium transition-all duration-200 shadow-[0_2px_12px_rgba(251,191,36,0.15)] mb-3"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{location.name}</span>
              </a>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] mt-1 mb-4">
              {team.title}
            </h1>
            
            {/* 状态药丸行 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full backdrop-blur-sm",
                statusInfo.className
              )}>
                <span className="text-sm">{statusInfo.icon}</span>
                {statusInfo.label}
              </span>
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-medium">
                <Calendar className="h-3 w-3" /> {team.date}
              </span>
              {team.time && (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-medium">
                  <Clock className="h-3 w-3" /> {team.time}
                </span>
              )}
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-medium">
                <Users className="h-3 w-3" />
                {team.currentMembers}/{team.maxMembers} 人
                {!isFull && remaining <= 3 && remaining > 0 && (
                  <span className="text-amber-300 font-bold">· 仅剩 {remaining} 名额</span>
                )}
              </span>
            </div>
            
            {/* 教化设计：队伍故事文案 */}
            {!isFull && team.status === "recruiting" && (
              <p className="mt-4 text-sm text-white/70 max-w-xl leading-relaxed">
                {getTeamStory(team.currentMembers, team.maxMembers)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          主内容区
          ================================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ════════════════ 左/中栏 ════════════════ */}
          <div className="lg:col-span-2 space-y-5">

            {/* ── 核心信息卡（-mt-12 breakout）── */}
            <div className="bg-white rounded-2xl p-5 -mt-12 relative z-10 shadow-warm-md border border-stone-100">
              {/* 状态徽章行 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full", statusInfo.className)}>
                    <span className="text-sm">{statusInfo.icon}</span>
                    {statusInfo.label}
                  </span>
                  {!(team as any).routeId && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-stone-100 text-stone-500">
                      <AlertCircle className="h-3 w-3" />
                      路线待定
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowShareModal(true)}
                  title={copy.teams.guidanceTooltips.shareButton}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-stone-500 hover:text-amber-600 hover:bg-amber-50 border border-stone-200 hover:border-amber-200 transition-all duration-150 active:scale-95 flex-shrink-0"
                  aria-label={copy.teams.shareLabel}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {copy.teams.shareLabel}
                </button>
              </div>

              {/* 3 列数据网格 */}
              <div className="grid grid-cols-3 gap-3 border-t border-stone-50 pt-4">
                <div className="text-center">
                  <p className="text-xs text-stone-400 mb-1.5 flex items-center justify-center gap-1">
                    <Calendar className="h-3 w-3" /> {copy.teams.dateLabel}
                  </p>
                  <p className="font-semibold text-stone-800 text-sm">{team.date}</p>
                </div>
                {team.time ? (
                  <div className="text-center">
                    <p className="text-xs text-stone-400 mb-1.5 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" /> {copy.teams.meetTimeLabel}
                    </p>
                    <p className="font-semibold text-stone-800 text-sm">{team.time}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-stone-400 mb-1.5 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" /> 时间
                    </p>
                    <p className="font-medium text-stone-400 text-sm">待定</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs text-stone-400 mb-1.5 flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" /> {copy.teams.membersCountLabel}
                  </p>
                  <p className={cn("font-bold text-lg leading-none", isFull ? "text-warm" : "text-amber-600")}>
                    {team.currentMembers}
                    <span className="text-stone-300 font-normal text-sm">/{team.maxMembers}</span>
                  </p>
                </div>
              </div>

              {/* 教化设计：名额情感化描述 + 进度故事 */}
              {!isFull && team.status === "recruiting" && (
                <div className="mt-4 pt-3 border-t border-stone-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-stone-600 font-medium">
                      {remaining === 1 ? copy.teams.spotsOneLeft : copy.teams.spotsDesc.replace("{remaining}", String(remaining))}
                    </p>
                    <span className="text-xs font-bold text-amber-700">{fillRatio}%</span>
                  </div>
                  <AnimatedProgress ratio={fillRatio} isFull={false} showMilestones />
                  {fillRatio > 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      {getProgressStory(fillRatio)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── 队伍描述 ── */}
            {team.description && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-5">
                <h2 className="text-base font-semibold text-stone-900 mb-2.5">{copy.teams.introTitle}</h2>
                <p className="text-sm text-stone-500 leading-relaxed">{team.description}</p>
              </div>
            )}

            {/* ── 参与要求 ── */}
            {Array.isArray(team.requirements) && team.requirements.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-5">
                <h2 className="text-base font-semibold text-stone-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  参与要求
                </h2>
                <ul className="space-y-2">
                  {team.requirements.map((req: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-stone-600">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── 地点简介卡（上移！提升决策效率）── */}
            {location && (
              <a href={`/locations/${location.id}`}>
                <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-4 group hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4">
                  {location.coverImage && (
                    <div className="w-18 h-18 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={location.coverImage}
                        alt={location.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-400 mb-1">活动地点</p>
                    <h3 className="font-semibold text-stone-900 group-hover:text-amber-700 transition-colors text-sm mb-2 truncate">
                      {location.name}
                    </h3>
                    <span className="inline-flex items-center text-xs font-medium text-amber-600">
                      {copy.teams.viewLocationDetail}
                      <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-150" />
                    </span>
                  </div>
                </div>
              </a>
            )}

            {/* ── 成员列表（头像网格）── */}
            {members.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-5">
                <h2 className="text-base font-semibold text-stone-900 mb-4 flex items-center gap-2">
                  {copy.teams.membersSectionTitle}
                  <span className="text-xs font-normal text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                    {members.length} 人
                  </span>
                </h2>
                <MemberAvatarGrid members={members} leaderId={team.leader?.id} />
              </div>
            )}

            {/* ── 同地点其他队伍 ── */}
            {otherTeams.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-stone-200" />
                  <span className="text-xs font-medium text-stone-400 px-2 py-1 bg-stone-100 rounded-full whitespace-nowrap">
                    同地点其他队伍
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-stone-200" />
                </div>
                <div className="space-y-2.5">
                  {otherTeams.map((t) => {
                    const s = getStatusInfo(t.status, t.currentMembers, t.maxMembers);
                    const tRemaining = t.maxMembers - t.currentMembers;
                    return (
                      <a key={t.id} href={`/teams/${t.id}`}>
                        <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-4 group hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-200">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-stone-900 text-sm group-hover:text-amber-700 transition-colors leading-snug">
                              {t.title}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {tRemaining > 0 && tRemaining <= 2 && (
                                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                  剩 {tRemaining} 名额
                                </span>
                              )}
                              <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full", s.className)}>
                                {s.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-stone-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {t.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {t.currentMembers}/{t.maxMembers} 人
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

          {/* ════════════════ 右栏（sticky）════════════════ */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4 -mt-12 relative z-10">

              {/* ── 加入操作卡（置顶！核心转化 + Glassmorphism）── */}
              <div key={currentState} className="animate-[fadeScaleIn_0.2s_ease_both]">

                {canJoin && (
                  <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(251,191,36,0.15)]">
                    {/* 顶部光晕装饰 */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent blur-xl pointer-events-none" />
                    
                    {/* 渐变 header */}
                    <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 px-5 py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-amber-200" />
                        <p className="text-sm font-semibold text-white">
                          {remaining === 1 ? "就差你一个了，快来！" : `还差 ${remaining} 位伙伴，一起出发`}
                        </p>
                      </div>
                      <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-amber-100">已有 {team.currentMembers} / {team.maxMembers} 人</span>
                          <span className="text-xs font-bold text-white">{fillRatio}%</span>
                        </div>
                        <AnimatedProgress ratio={fillRatio} isFull={false} />
                      </div>
                      {/* 教化设计：进度故事 */}
                      {fillRatio > 0 && (
                        <p className="mt-2 text-xs text-amber-100 font-medium">
                          {getProgressStory(fillRatio)}
                        </p>
                      )}
                    </div>
                    
                    {/* 玻璃态底部 */}
                    <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl px-5 py-4 border-t border-amber-200/30">
                      <p className="text-xs text-stone-500 mb-2">{copy.teams.guidanceTooltips.messageInput}</p>
                      <textarea
                        placeholder={copy.teams.joinPlaceholderDesktop}
                        aria-label="申请留言"
                        value={joinMessage}
                        onChange={(e) => setJoinMessage(e.target.value)}
                        rows={2}
                        className="w-full px-3.5 py-2.5 rounded-xl text-stone-800 text-sm placeholder:text-stone-400 focus:outline-none resize-none mb-3 bg-white/80 border border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"
                      />
                      <button
                        onClick={handleJoin}
                        disabled={isJoining}
                        title={copy.teams.guidanceTooltips.joinButton}
                        className="w-full py-3.5 font-semibold text-white rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 hover:from-amber-700 hover:via-amber-600 hover:to-amber-500 shadow-brand-glow hover:shadow-[0_12px_32px_rgba(217,119,6,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2 text-base"
                      >
                        {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
                        {copy.teams.joinTeam}
                      </button>
                    </div>
                  </div>
                )}

                {isPending && (
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <p className="font-semibold text-stone-900 text-sm">{copy.teams.statusPending}</p>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed pl-6">{copy.teams.pendingDesc}</p>
                    <a
                      href="/my-teams"
                      className="mt-3 pl-6 inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-semibold transition-colors"
                    >
                      查看我的队伍 <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {isMember && (
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <p className="font-semibold text-stone-900 text-sm">{copy.teams.statusApproved}</p>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed pl-6">
                      {copy.teams.storyNarrative.waitingForYou}
                    </p>
                    <a href="/my-teams" className="mt-3 pl-6 inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold transition-colors">
                      查看我的队伍 <ArrowRight className="h-3 w-3" />
                    </a>
                    <div className="pl-6 mt-3 pt-3 border-t border-emerald-200/50">
                      <button
                        onClick={() => setShowLeaveConfirm(true)}
                        className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                      >
                        {copy.teams.leaveTeam}
                      </button>
                    </div>
                  </div>
                )}

                {isLeader && (
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <p className="font-semibold text-stone-900 text-sm">{copy.teams.youAreLeader}</p>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed pl-6 mb-3">{copy.teams.youAreLeaderDesc}</p>
                    <div className="pl-6 flex items-center gap-3">
                      <a
                        href="/my-teams"
                        className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-semibold transition-colors"
                      >
                        {copy.teams.manageTeam} <ArrowRight className="h-3 w-3" />
                      </a>
                      <span className="text-stone-300">·</span>
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-medium transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        {copy.teams.editBtn}
                      </button>
                    </div>
                  </div>
                )}

                {!canJoin && !isLeader && !isMember && !isPending && (
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-center">
                    <p className="text-sm text-stone-500">{getClosedMessage(team)}</p>
                  </div>
                )}
              </div>

              {/* ── 队长信息卡（置于加入卡下方）── */}
              {team.leader && (
                <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-warm-sm">
                  <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    {copy.teams.leaderSectionTitle}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-amber-400/40 ring-offset-2 bg-gradient-to-br from-amber-500 to-amber-300">
                        {team.leader.avatar ? (
                          <img src={team.leader.avatar} alt={team.leader.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                            {(team.leader.nickname || team.leader.name || "?")[0]}
                          </span>
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                        <Crown className="w-3 h-3 text-white" />
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">
                        {team.leader.nickname || team.leader.name}
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">{copy.teams.leaderInfoTitle}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 出行提示卡（统一琥珀色调）── */}
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5">
                <h4 className="font-semibold text-stone-700 text-sm mb-3 flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-amber-500" />
                  {copy.teams.safetyTips}
                </h4>
                <ul className="space-y-2.5">
                  {[
                    { Icon: Clock,          text: copy.teams.safetyTip1 },
                    { Icon: MessageCircle,  text: copy.teams.safetyTip2 },
                    { Icon: Handshake,      text: copy.teams.safetyTip3 },
                    { Icon: Cloud,          text: copy.teams.safetyTip4 },
                  ].map(({ Icon, text }, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Icon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-stone-500 leading-relaxed">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          移动端底部固定操作栏
          ================================================================ */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-100 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div key={`mobile-${currentState}`} className="animate-[fadeScaleIn_0.2s_ease_both]">

            {isLeader ? (
              <div className="flex items-center justify-between min-h-[44px]">
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <Crown className="h-4 w-4" />
                  <span className="font-medium">{copy.teams.youAreLeader}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors active:scale-95"
                    aria-label={copy.teams.shareLabel}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <a href="/my-teams" className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    {copy.teams.manageTeam} <ArrowRight className="h-3 w-3" />
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
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors active:scale-95"
                    aria-label={copy.teams.shareLabel}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="flex items-center gap-1 text-xs text-stone-500 border border-stone-200 rounded-full px-3 py-1.5 hover:border-red-300 hover:text-red-500 transition-colors"
                  >
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
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors active:scale-95"
                    aria-label={copy.teams.shareLabel}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <a href="/my-teams" className="text-xs text-amber-600 flex items-center gap-1">
                    查看 <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>

            ) : joinSuccess ? (
              <div className="flex items-center justify-between min-h-[44px]">
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <CheckCircle className="h-4 w-4 animate-[checkFadeIn_0.3s_ease_both]" />
                  <span className="font-medium">{copy.success.applied}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors active:scale-95"
                    aria-label={copy.teams.shareLabel}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <a href="/my-teams" className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    查看我的队伍 <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>

            ) : canJoin ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="w-11 h-11 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-amber-50 hover:text-amber-600 border border-stone-200 hover:border-amber-200 transition-all flex-shrink-0 active:scale-95"
                  aria-label={copy.teams.shareLabel}
                >
                  <Share2 className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => setShowJoinSheet(true)}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-brand-glow transition-all duration-150 flex items-center justify-center gap-2 min-h-[44px] active:scale-[0.98] text-base"
                >
                  {copy.teams.joinTeam}
                </button>
              </div>

            ) : (
              <div className="flex items-center justify-between min-h-[44px]">
                <div className="text-stone-400 text-sm">
                  {getClosedMessage(team)}
                </div>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors active:scale-95"
                  aria-label={copy.teams.shareLabel}
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sheet 加入面板 */}
      <JoinBottomSheet
        open={showJoinSheet}
        onClose={() => setShowJoinSheet(false)}
        onJoin={handleJoin}
        isJoining={isJoining}
        joinMessage={joinMessage}
        setJoinMessage={setJoinMessage}
        remaining={remaining}
        fillRatio={fillRatio}
        currentMembers={team.currentMembers}
        maxMembers={team.maxMembers}
      />

      {/* 退出确认对话框 */}
      <LeaveConfirmDialog
        open={showLeaveConfirm}
        onCancel={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
      />

      {/* 编辑队伍 Modal（仅队长可见） */}
      {showEditModal && team && (
        <EditTeamModal
          open={showEditModal}
          team={team}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Toast */}
      <ToastDisplay toast={toast} exiting={exiting} />

      {/* 分享海报弹窗 */}
      {showShareModal && team && (
        <SharePosterModal
          type="team"
          title={team.title}
          subtitle={team.date}
          url={typeof window !== "undefined" ? window.location.href : ""}
          meta={`${team.currentMembers}/${team.maxMembers} 人`}
          onClose={() => setShowShareModal(false)}
          onToast={showToast}
        />
      )}

      <Footer />
    </main>
  );
}
