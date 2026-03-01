"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";
import Link from "next/link";

interface JoinButtonProps {
  team: Team;
  className?: string;
  onJoin?: () => void;
}

type JoinState = "idle" | "loading" | "success" | "full" | "closed" | "wechat_required";

function JoinButton({ team, className, onJoin }: JoinButtonProps) {
  const { user } = useAuth();
  const [joinState, setJoinState] = React.useState<JoinState>(
    team.status === "full" ? "full" : team.status === "closed" ? "closed" : "idle"
  );

  // 判断是否是队长
  const isLeader = user && team?.leader?.id === user?.id;

  const handleJoin = async () => {
    if (joinState !== "idle") return;

    setJoinState("loading");

    try {
      // 实际的API调用
      const response = await fetch('/api/teams/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId: team.id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setJoinState("success");
        onJoin?.();

        // 2秒后重置状态
        setTimeout(() => {
          setJoinState(team.status === "full" ? "full" : team.status === "closed" ? "closed" : "idle");
        }, 2000);
      } else {
        // 检查是否是微信号缺失错误
        if (result.error?.includes("微信号")) {
          setJoinState("wechat_required");
        } else {
          alert(result.error || copy.api.failed);
          setJoinState(team.status === "full" ? "full" : team.status === "closed" ? "closed" : "idle");
        }
      }
    } catch (error) {
      console.error("Join team error:", error);
      alert(copy.api.networkError);
      setJoinState(team.status === "full" ? "full" : team.status === "closed" ? "closed" : "idle");
    }
  };

  const buttonConfig = {
    idle: {
      text: copy.teams.joinTeam,
      icon: Users,
      variant: "default" as const,
      className: "bg-stone-900 hover:bg-stone-800 text-white",
    },
    loading: {
      text: copy.common.loading,
      icon: Loader2,
      variant: "default" as const,
      className: "bg-stone-700 text-white cursor-not-allowed",
    },
    success: {
      text: copy.success.applied,
      icon: Check,
      variant: "default" as const,
      className: "bg-emerald-600 text-white",
    },
    full: {
      text: copy.teams.statusFull,
      icon: Users,
      variant: "secondary" as const,
      className: "bg-stone-200 text-stone-500 cursor-not-allowed",
    },
    closed: {
      text: copy.teams.statusEnded,
      icon: Users,
      variant: "secondary" as const,
      className: "bg-stone-200 text-stone-500 cursor-not-allowed",
    },
    wechat_required: {
      text: "请先填写微信号",
      icon: AlertCircle,
      variant: "outline" as const,
      className: "border-amber-500 text-amber-600",
    },
  };

  const config = buttonConfig[joinState];
  const Icon = config.icon;

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
              {joinState === "full"
                ? copy.errors.teamFull
                : joinState === "closed"
                ? copy.errors.teamNotAccepting
                : joinState === "wechat_required"
                ? copy.errors.wechatRequired
                : joinState === "success"
                ? copy.teams.leader
                : `已有 ${team.currentMembers} 人报名，还剩 ${
                    team.maxMembers - team.currentMembers
                  } 个名额`}
            </p>
          </div>
          {/* 如果不是队长，则显示申请加入按钮 */}
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
            ) : (
              <Button
                size="lg"
                variant={config.variant}
                onClick={handleJoin}
                disabled={joinState === "loading" || joinState === "full" || joinState === "closed"}
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
