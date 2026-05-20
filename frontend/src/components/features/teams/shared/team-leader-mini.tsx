"use client";

import { UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";

interface TeamLeaderMiniProps {
  leader: Team["leader"];
  showLevel?: boolean;
  size?: "sm" | "md";
}

export function TeamLeaderMini({
  leader,
  showLevel = false,
  size = "md",
}: TeamLeaderMiniProps) {
  const name = leader?.nickname || leader?.name || "领队";
  const avatar = leader?.avatar;
  const level = leader?.level;

  const sizeClasses = {
    sm: {
      avatar: "w-6 h-6",
      icon: "w-4 h-4",
      text: "text-xs",
    },
    md: {
      avatar: "w-8 h-8",
      icon: "w-5 h-5",
      text: "text-sm",
    },
  };

  const classes = sizeClasses[size];

  // 等级标签映射
  const levelLabels: Record<string, string> = {
    beginner: "新手",
    intermediate: "进阶",
    advanced: "高阶",
    expert: "专家",
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className={cn(
            "rounded-full object-cover flex-shrink-0 ring-1 ring-stone-100 dark:ring-stone-700",
            classes.avatar
          )}
        />
      ) : (
        <div
          className={cn(
            "rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0",
            classes.avatar
          )}
        >
          <UserCircle className={cn("text-stone-400", classes.icon)} />
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className={cn("font-medium truncate text-foreground", classes.text)}>
          {name}
        </span>
        {showLevel && level && (
          <span className="text-xs text-muted-foreground">
            {levelLabels[level] || level}
          </span>
        )}
      </div>
    </div>
  );
}
