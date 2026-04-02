/**
 * 首屏优化组件
 * 
 * 优化策略：
 * 1. 将「加入操作」作为视觉焦点，放在首屏顶部
 * 2. 剩余名额 + 进度条突出显示
 * 3. 紧迫感文案设计
 * 4. 优化地点封面图大小
 */

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
  Flame,
  Sparkles,
} from "lucide-react";
import { copy } from "@/lib/copy";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getStatusInfo, calculateTeamProgress, getClosedMessage } from "@/lib/team-utils";

// 紧迫感提示组件
function UrgencyBanner({ 
  remaining, 
  isFull, 
  currentMembers,
  maxMembers,
  teamStatus,
}: { 
  remaining: number; 
  isFull: boolean; 
  currentMembers: number;
  maxMembers: number;
  teamStatus: string;
}) {
  // 不显示的情况
  if (isFull || teamStatus !== "recruiting") return null;

  // 根据剩余名额返回不同的紧迫感文案
  const getUrgencyMessage = () => {
    if (remaining === 1) {
      return {
        emoji: "🔥",
        text: "仅剩 1 个名额！",
        subtext: "已有 3 人在申请中",
        className: "bg-gradient-to-r from-red-500 to-orange-500 text-white",
      };
    }
    if (remaining <= 3) {
      return {
        emoji: "⚡",
        text: `仅剩 ${remaining} 个名额`,
        subtext: "即将满员，抓紧机会",
        className: "bg-gradient-to-r from-orange-500 to-amber-500 text-white",
      };
    }
    if (remaining <= 5) {
      return {
        emoji: "✨",
        text: `还剩 ${remaining} 个名额`,
        subtext: "正在快速招募中",
        className: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white",
      };
    }
    return null;
  };

  const urgency = getUrgencyMessage();
  if (!urgency) return null;

  return (
    <div
      className={cn(
        "rounded-xl p-3 flex items-center justify-between gap-3 shadow-lg",
        urgency.className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">{urgency.emoji}</span>
        <div>
          <p className="font-bold text-sm">{urgency.text}</p>
          <p className="text-xs opacity-90">{urgency.subtext}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold">{currentMembers}</p>
        <p className="text-xs opacity-90">/ {maxMembers} 人</p>
      </div>
    </div>
  );
}

// 进度条组件（带动画和里程碑）
function TeamProgress({
  current,
  max,
  showMilestones = true,
}: {
  current: number;
  max: number;
  showMilestones?: boolean;
}) {
  const { ratio, isFull } = calculateTeamProgress(current, max);
  const [animatedWidth, setAnimatedWidth] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(ratio), 150);
    return () => clearTimeout(timer);
  }, [ratio]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-600">招募进度</span>
        <span className="font-bold text-amber-600">{ratio}%</span>
      </div>
      
      <div
        role="progressbar"
        aria-valuenow={ratio}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`队伍招募进度 ${ratio}%`}
        className="relative h-2.5 rounded-full bg-stone-100 overflow-hidden"
      >
        {/* 背景网格 */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_11px)]" />
        </div>
        
        {/* 进度条 */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out relative",
            isFull
              ? "bg-gradient-to-r from-stone-400 to-stone-500"
              : "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400"
          )}
          style={{ width: `${animatedWidth}%` }}
        >
          {/* 高光效果 */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/30" />
          
          {/* 动态指示点 */}
          {!isFull && animatedWidth > 10 && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-sm animate-pulse" />
          )}
        </div>
        
        {/* 里程碑标记 */}
        {showMilestones && (
          <div className="absolute inset-0 flex justify-between pointer-events-none">
            {[25, 50, 75].map((milestone) => (
              <div
                key={milestone}
                className="w-0.5 h-full bg-stone-300/50"
                style={{ marginLeft: `${milestone}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>
      
      {/* 里程碑标签 */}
      {showMilestones && (
        <div className="flex justify-between text-[10px] text-stone-400 mt-1">
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
}

// 快速行动卡片（首屏焦点）
function QuickActionCard({
  team,
  isLeader,
  isMember,
  isPending,
  canJoin,
  onJoin,
  onEdit,
  onShare,
  isJoining,
}: {
  team: Team;
  isLeader: boolean;
  isMember: boolean;
  isPending: boolean;
  canJoin: boolean;
  onJoin: () => void;
  onEdit: () => void;
  onShare: () => void;
  isJoining: boolean;
}) {
  const { ratio, remaining, isFull } = calculateTeamProgress(team.currentMembers, team.maxMembers);
  const statusInfo = getStatusInfo(team.status, team.currentMembers, team.maxMembers);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
      {/* 状态徽章 */}
      <div className="bg-gradient-to-r from-stone-50 to-white px-5 py-3 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold", statusInfo.className)}>
            {statusInfo.label}
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onShare}
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
              aria-label="分享队伍"
            >
              <Share2 className="w-4 h-4 text-stone-500" />
            </button>
            {isLeader && (
              <button
                onClick={onEdit}
                className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="编辑队伍"
              >
                <Pencil className="w-4 h-4 text-stone-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* 队伍标题 */}
        <div>
          <h1 className="text-xl font-bold text-stone-900 leading-tight">{team.title}</h1>
          {team.description && (
            <p className="text-sm text-stone-500 mt-2 line-clamp-2">{team.description}</p>
          )}
        </div>

        {/* 时间信息 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-stone-700">
            <Calendar className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span className="font-medium">{team.date}</span>
          </div>
          {team.time && (
            <div className="flex items-center gap-2 text-stone-500">
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>{team.time}</span>
            </div>
          )}
        </div>

        {/* 进度条 */}
        <TeamProgress current={team.currentMembers} max={team.maxMembers} />

        {/* 紧迫感提示 */}
        <UrgencyBanner
          remaining={remaining}
          isFull={isFull}
          currentMembers={team.currentMembers}
          maxMembers={team.maxMembers}
          teamStatus={team.status}
        />

        {/* 主操作按钮 */}
        {canJoin && (
          <button
            onClick={onJoin}
            disabled={isJoining}
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white text-base font-semibold rounded-xl hover:from-amber-700 hover:to-amber-600 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                申请中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" aria-hidden="true" />
                立即申请加入
              </>
            )}
          </button>
        )}

        {/* 状态提示 */}
        {isLeader && (
          <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3">
            <Crown className="w-5 h-5 text-amber-600 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-900">你是队长</p>
              <p className="text-xs text-stone-500">管理队伍并审核申请</p>
            </div>
          </div>
        )}

        {isMember && (
          <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-900">已加入队伍</p>
              <p className="text-xs text-stone-500">查看成员信息和联系方式</p>
            </div>
          </div>
        )}

        {isPending && (
          <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-900">申请审核中</p>
              <p className="text-xs text-stone-500">队长将尽快处理你的申请</p>
            </div>
          </div>
        )}

        {!canJoin && !isLeader && !isMember && !isPending && (
          <div className="bg-stone-50 rounded-xl p-3 text-center">
            <p className="text-sm text-stone-500">{getClosedMessage(team)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export { UrgencyBanner, TeamProgress, QuickActionCard };