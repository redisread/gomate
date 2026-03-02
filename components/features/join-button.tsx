"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Users, Clock, RefreshCw, AlertCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface JoinButtonProps {
  team: Team;
  className?: string;
  onJoin?: () => void;
  onLeave?: () => void;
  userMemberStatus?: "pending" | "approved" | "rejected" | null;
}

type JoinState = "idle" | "loading" | "success" | "full" | "closed" | "pending" | "approved" | "rejected" | "wechat_required" | "leaving";

function JoinButton({ team, className, onJoin, onLeave, userMemberStatus }: JoinButtonProps) {
  const { user } = useAuth();
  const router = useRouter();

  // 根据用户成员状态和队伍状态初始化
  const getInitialState = React.useCallback((): JoinState => {
    if (userMemberStatus === "approved") return "approved";
    if (userMemberStatus === "pending") return "pending";
    if (userMemberStatus === "rejected") return "rejected";
    if (team.status === "full") return "full";
    if (team.status === "closed") return "closed";
    return "idle";
  }, [userMemberStatus, team.status]);

  const [joinState, setJoinState] = React.useState<JoinState>(getInitialState);
  const [showLeaveDialog, setShowLeaveDialog] = React.useState(false);

  // 当 userMemberStatus 或 team.status 变化时更新状态
  React.useEffect(() => {
    setJoinState(getInitialState());
  }, [getInitialState]);

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

      const result = await response.json() as { success?: boolean; error?: string };

      if (response.ok && result.success) {
        setJoinState("pending");
        onJoin?.();
      } else {
        // 检查是否是微信号缺失错误
        if (result.error?.includes("微信号")) {
          setJoinState("wechat_required");
        } else {
          alert(result.error || copy.api.failed);
          // 重置到之前的状态
          setJoinState(getInitialState());
        }
      }
    } catch (error) {
      console.error("Join team error:", error);
      alert(copy.api.networkError);
      setJoinState(getInitialState());
    }
  };

  const buttonConfig: Record<JoinState, { text: string; icon: React.ElementType; variant: "default" | "secondary" | "outline"; className: string; disabled: boolean }> = {
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
    wechat_required: {
      text: "请先填写微信号",
      icon: AlertCircle,
      variant: "outline" as const,
      className: "border-amber-500 text-amber-600",
      disabled: false,
    },
    leaving: {
      text: copy.common.loading,
      icon: Loader2,
      variant: "default" as const,
      className: "bg-stone-700 text-white cursor-not-allowed",
      disabled: true,
    },
  };

  // 退出队伍处理函数
  const handleLeave = async () => {
    setJoinState("leaving");
    setShowLeaveDialog(false);

    try {
      const response = await fetch(`/api/teams/${team.id}/leave`, {
        method: 'POST',
      });

      const result = await response.json() as { success?: boolean; error?: string };

      if (response.ok && result.success) {
        // 退出成功后刷新页面或调用回调
        onLeave?.();
        router.refresh();
      } else {
        alert(result.error || copy.teams.leaveTeamFailed);
        setJoinState("approved");
      }
    } catch (error) {
      console.error("Leave team error:", error);
      alert(copy.api.networkError);
      setJoinState("approved");
    }
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
      case "wechat_required":
        return copy.errors.wechatRequired;
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
            <p className="text-sm text-stone-500">{getStatusText()}</p>
          </div>
          {/* 如果不是队长，则显示申请加入/退出队伍按钮 */}
          {!isLeader && (
            joinState === "wechat_required" ? (
              <Button
                size="lg"
                variant="outline"
                asChild
                className="px-8 border-amber-500 text-amber-600 hover:bg-amber-50"
              >
                <Link href="/profile/edit">
                  去填写
                </Link>
              </Button>
            ) : joinState === "approved" ? (
              // 已加入状态显示退出队伍按钮
              <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    {copy.teams.leaveTeam}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{copy.teams.leaveTeamConfirm}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {copy.teams.leaveTeamWarning}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{copy.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLeave}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {copy.common.confirm}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : joinState === "leaving" ? (
              <Button
                size="lg"
                variant="default"
                disabled
                className="px-8 bg-stone-700 text-white cursor-not-allowed"
              >
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {copy.common.loading}
              </Button>
            ) : (
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
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

export { JoinButton };