"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";

interface JoinButtonProps {
  team: Team;
  className?: string;
  onJoin?: () => void;
}

type JoinState = "idle" | "loading" | "success" | "full" | "closed";

function JoinButton({ team, className, onJoin }: JoinButtonProps) {
  const [joinState, setJoinState] = React.useState<JoinState>(
    team.status === "full" ? "full" : team.status === "closed" ? "closed" : "idle"
  );

  const handleJoin = async () => {
    if (joinState !== "idle") return;

    setJoinState("loading");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setJoinState("success");
    onJoin?.();

    // Reset after showing success
    setTimeout(() => {
      setJoinState("idle");
    }, 2000);
  };

  const buttonConfig = {
    idle: {
      text: "申请加入",
      icon: Users,
      variant: "default" as const,
      className: "bg-stone-900 hover:bg-stone-800 text-white",
    },
    loading: {
      text: "处理中...",
      icon: Loader2,
      variant: "default" as const,
      className: "bg-stone-700 text-white cursor-not-allowed",
    },
    success: {
      text: "申请已发送",
      icon: Check,
      variant: "default" as const,
      className: "bg-emerald-600 text-white",
    },
    full: {
      text: "队伍已满员",
      icon: Users,
      variant: "secondary" as const,
      className: "bg-stone-200 text-stone-500 cursor-not-allowed",
    },
    closed: {
      text: "报名已截止",
      icon: Users,
      variant: "secondary" as const,
      className: "bg-stone-200 text-stone-500 cursor-not-allowed",
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
                ? "该队伍已达到人数上限"
                : joinState === "closed"
                ? "该队伍已结束招募"
                : joinState === "success"
                ? "领队会尽快与你联系"
                : `已有 ${team.currentMembers} 人报名，还剩 ${
                    team.maxMembers - team.currentMembers
                  } 个名额`}
            </p>
          </div>
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
        </div>
      </div>
    </motion.div>
  );
}

export { JoinButton };
