"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Users, Clock, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";

interface JoinButtonProps {
  team: Team;
  className?: string;
  onJoin?: () => void;
  userMemberStatus?: "pending" | "approved" | "rejected" | null;
}

type JoinState = "idle" | "loading" | "success" | "full" | "closed" | "pending" | "approved" | "rejected";

function JoinButton({ team, className, onJoin, userMemberStatus }: JoinButtonProps) {
  const { user } = useAuth();
  const [joinState, setJoinState] = React.useState<JoinState>(() => {
    // 根据用户成员状态初始化
    if (userMemberStatus === "approved") return "approved";
    if (userMemberStatus === "pending") return "pending";
    if (userMemberStatus === "rejected") return "rejected";
    // 根据队伍状态初始化
    if (team.status === "full") return "full";
    if (team.status === "closed") return "closed";
    return "idle";
  });

  // 判断是否是队长
  const isLeader = user && team?.leader?.id === user?.id;

  const handleJoin = async () => {
    // 只有 idle 或 rejected 状态可以申请
    if (joinState !== "idle" && joinState !== "rejected") return;

    setJoinState("loading");

    try {
      const response = await fetch('/api/teams/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId: team.id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setJoinState("pending");
        onJoin?.();
      } else {
        alert(result.error || copy.api.failed);
        // 重置到之前的状态
        if (userMemberStatus === "rejected") {
          setJoinState("rejected");
        } else {
          setJoinState(team.status === "full" ? "full" : team.status === "closed" ? "closed" : "idle");
        }
      }
    } catch (error) {
      console.error("Join team error:", error);
      alert(copy.api.networkError);
      if (userMemberStatus === "rejected") {
        setJoinState("rejected");
      } else {
        setJoinState(team.status === "full" ? "full" : team.status === "closed" ? "closed" : "idle");
      }
    }
  };

  const buttonConfig = {
    idle: {
      text: copy.teams.joinTeam,
      icon: Users,
      variant: "default" as const,
      className: "bg-stone-900 hover:bg-stone-800 text-white",
      disabled: false,
    },
    loading: {
      text: copy.common.loading,
      icon: Loader2,
      variant: "default" as const,
      className: "bg-stone-700 text-white cursor-not-allowed",
      disabled: true,
    },
    success: {
      text: copy.success.applied,
      icon: Check,
      variant: "default" as const,
      className: "bg-emerald-600 text-white",
      disabled: true,
    },
    full: {
      text: copy.teams.statusFull,
      icon: Users,
      variant: "secondary" as const,
      className: "bg-stone-200 text-stone-500 cursor-not-allowed",
      disabled: true,
    },
    closed: {
      text: copy.teams.statusEnded,
      icon: Users,
      variant: "secondary" as const,
      className: "bg-stone-200 text-stone-500 cursor-not-allowed",
      disabled: true,
    },
    pending: {
      text: copy.teams.statusPending,
      icon: Clock,
      variant: "secondary" as const,
      className: "bg-amber-100 text-amber-800 cursor-default",
      disabled: true,
    },
    approved: {
      text: copy.teams.statusApproved,
      icon: Check,
      variant: "default" as const,
      className: "bg-emerald-600 text-white cursor-default",
      disabled: true,
    },
    rejected: {
      text: copy.teams.reapply,
      icon: RefreshCw,
      variant: "outline" as const,
      className: "border-red-300 text-red-600 hover:bg-red-50",
      disabled: false,
    },
  };

  const config = buttonConfig[joinState];
  const Icon = config.icon;

  // 获取状态描述文本
  const getStatusText = () => {
    switch (joinState) {
      case "full":
        return copy.errors.teamFull;
      case "closed":
        return copy.errors.teamNotAccepting;
      case "pending":
        return copy.teams.statusPending;
      case "approved":
        return copy.teams.statusApproved;
      case "rejected":
        return copy.teams.statusRejected;
      default:
        return `已有 ${team.currentMembers} 人报名，还剩 ${team.maxMembers - team.currentMembers} 个名额`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={cn("sticky bottom-4 z-30", className)}
    >
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-stone-500">
              {getStatusText()}
            </p>
          </div>
          {/* 如果不是队长，则显示申请加入按钮 */}
          {!isLeader && (
            <Button
              size="lg"
              variant={config.variant}
              onClick={handleJoin}
              disabled={config.disabled}
              className={cn(
                "px-8 transition-all duration-300",
                config.className
              )}
            >
              <motion.div
                animate={joinState === "loading" ? { rotate: 360 } : {}}
                transition={
                  joinState === "loading"
                    ? { duration: 1, repeat: Infinity, ease: "linear" }
                    : {}
                }
              >
                <Icon className="h-5 w-5 mr-2" />
              </motion.div>
              {config.text}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export { JoinButton };