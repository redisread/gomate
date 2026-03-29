"use client";

import * as React from "react";
import { Crown, ChevronDown, Loader2 } from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { Team, TeamMember } from "@/lib/types";

export function useScrollLock(lock: boolean) {
  React.useEffect(() => {
    if (lock) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lock]);
}

export type TeamActionState = "leader" | "member" | "pending" | "canJoin" | "closed";

export function getActionState(
  isLeader: boolean,
  isMember: boolean,
  isPending: boolean,
  canJoin: boolean
): TeamActionState {
  if (isLeader) return "leader";
  if (isMember) return "member";
  if (isPending) return "pending";
  if (canJoin) return "canJoin";
  return "closed";
}

export function getStatusInfo(status: string, current: number, max: number) {
  if (status === "recruiting" && current < max) {
    return {
      label: copy.enums.teamStatus.recruiting,
      className: "bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border border-emerald-300/50 shadow-[0_2px_8px_rgba(16,185,129,0.15)]",
      icon: "🔥",
    };
  }
  if (status === "full" || (status === "recruiting" && current >= max)) {
    return {
      label: copy.enums.teamStatus.full,
      className: "bg-gradient-to-r from-amber-100 to-amber-50 text-warm border border-amber-300/50 shadow-[0_2px_8px_rgba(217,119,6,0.2)]",
      icon: "✓",
    };
  }
  if (status === "formed") {
    return {
      label: copy.enums.teamStatus.formed,
      className: "bg-gradient-to-r from-violet-100 to-violet-50 text-violet-700 border border-violet-300/50 shadow-[0_2px_8px_rgba(139,92,246,0.15)]",
      icon: "🚀",
    };
  }
  if (status === "completed") {
    return {
      label: copy.enums.teamStatus.completed,
      className: "bg-gradient-to-r from-stone-100 to-stone-50 text-stone-500 border border-stone-200",
      icon: "🎉",
    };
  }
  if (status === "cancelled") {
    return {
      label: copy.enums.teamStatus.cancelled,
      className: "bg-gradient-to-r from-red-100 to-red-50 text-red-600 border border-red-300/50",
      icon: "✗",
    };
  }
  return {
    label: copy.enums.teamStatus.recruiting,
    className: "bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border border-emerald-300/50",
    icon: "🔥",
  };
}

export function getClosedMessage(team: Team): string {
  if (team.status === "completed") return copy.teams.statusEnded;
  if (team.status === "cancelled") return copy.teams.statusCancelled;
  if (team.currentMembers >= team.maxMembers) return copy.teams.teamFull;
  return copy.teams.statusEnded;
}

export function getProgressStory(ratio: number): string {
  if (ratio >= 100) return copy.teams.progressStory.milestone100;
  if (ratio >= 75) return copy.teams.progressStory.milestone75;
  if (ratio >= 50) return copy.teams.progressStory.milestone50;
  if (ratio >= 25) return copy.teams.progressStory.milestone25;
  return "";
}

export function getTeamStory(current: number, max: number): string {
  const ratio = (current / max) * 100;
  if (ratio >= 100) return copy.teams.storyNarrative.full;
  if (ratio >= 75) return copy.teams.storyNarrative.ready.replace("{current}", String(current));
  if (ratio >= 25) return copy.teams.storyNarrative.growing.replace("{current}", String(current));
  return copy.teams.storyNarrative.early;
}

export function AnimatedProgress({
  ratio,
  isFull,
  showMilestones = false,
}: {
  ratio: number;
  isFull: boolean;
  showMilestones?: boolean;
}) {
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
      className="relative h-2 rounded-full bg-stone-100 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-stone-50 to-stone-100 opacity-50" />
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out relative",
          isFull
            ? "bg-gradient-to-r from-warm to-stone-400"
            : "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400"
        )}
        style={{ width: `${width}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40" />
        {!isFull && width > 30 && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-sm" />
        )}
      </div>
      {showMilestones && (
        <div className="absolute inset-0 flex justify-between px-0 pointer-events-none">
          {[25, 50, 75].map((m) => (
            <div
              key={m}
              className="w-0.5 h-full bg-stone-300/50"
              style={{ marginLeft: `${m - 0.5}%`, marginRight: `${100 - m - 0.5}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const MemberAvatarItem = React.memo(function MemberAvatarItem({
  member,
  isLeader,
  index,
}: {
  member: TeamMember;
  isLeader: boolean;
  index: number;
}) {
  const name = member.nickname || member.name;
  return (
    <div
      className="relative group flex flex-col items-center gap-1.5 animate-[fadeUp_0.4s_ease-out_both]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-warm-md",
          isLeader
            ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-white bg-gradient-to-br from-amber-500 to-amber-300"
            : "bg-stone-100 ring-1 ring-stone-200 group-hover:ring-amber-300"
        )}
      >
        {member.avatar ? (
          <img src={member.avatar} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className={cn("font-semibold text-sm", isLeader ? "text-white" : "text-stone-500")}>
            {name?.[0] || "?"}
          </span>
        )}
      </div>
      {isLeader && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
          <Crown className="w-2.5 h-2.5 text-white" />
        </span>
      )}
      <p className="text-xs text-stone-400 max-w-[44px] truncate text-center leading-tight">{name}</p>
      {isLeader && (
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold whitespace-nowrap">
          领队
        </span>
      )}
    </div>
  );
});

export function MemberAvatarGrid({
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
    <div role="list" aria-label={`队伍成员，共 ${members.length} 人`}>
      <div className="flex flex-wrap gap-3">
        {visible.map((m, i) => (
          <MemberAvatarItem key={m.id} member={m} isLeader={m.userId === leaderId} index={i} />
        ))}
        {!expanded && hidden > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex flex-col items-center gap-1.5 group animate-[fadeUp_0.4s_ease-out_both]"
            style={{ animationDelay: `${GRID_THRESHOLD * 50}ms` }}
          >
            <div className="w-11 h-11 rounded-full bg-stone-100 ring-1 ring-stone-200 flex items-center justify-center transition-all duration-200 group-hover:bg-amber-50 group-hover:ring-amber-200">
              <span className="text-xs font-semibold text-stone-400 group-hover:text-amber-600">+{hidden}</span>
            </div>
            <p className="text-[10px] text-stone-300">查看全部</p>
          </button>
        )}
      </div>
      {expanded && members.length > GRID_THRESHOLD && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-4 flex items-center gap-1 text-xs text-stone-400 hover:text-amber-600 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
          收起
        </button>
      )}
    </div>
  );
}

interface ToastOptions {
  type: "success" | "error";
  message: string;
}

export function useToast() {
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

export function ToastDisplay({ toast, exiting }: { toast: ToastOptions | null; exiting: boolean }) {
  if (!toast) return null;
  const isSuccess = toast.type === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] lg:left-auto lg:right-6 lg:translate-x-0",
        exiting ? "animate-[fadeOut_0.2s_ease-in_both]" : "animate-[fadeUp_0.25s_ease_both]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium text-stone-800 whitespace-nowrap",
          isSuccess
            ? "bg-white border border-amber-200 shadow-amber-900/10"
            : "bg-white border border-red-200 shadow-red-900/10"
        )}
      >
        {isSuccess ? (
          <span className="text-amber-600 text-lg">✓</span>
        ) : (
          <span className="text-red-500 text-lg">✗</span>
        )}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}