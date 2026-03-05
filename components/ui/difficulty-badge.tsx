"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { difficultyLabels } from "@/lib/constants";
import type { Difficulty } from "@/db/schema";

interface DifficultyBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  difficulty: Difficulty;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
  lg: "px-3 py-1 text-sm",
};

function DifficultyBadge({
  difficulty,
  size = "md",
  className,
  ...props
}: DifficultyBadgeProps) {
  // 防御性编程：如果 difficulty 未定义，使用默认值
  const difficultyInfo = difficultyLabels[difficulty] || {
    label: difficulty || "未知",
    color: "bg-gray-100 text-gray-700"
  };
  const { label, color } = difficultyInfo;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium",
        sizeClasses[size],
        color,
        className
      )}
      {...props}
    >
      {label}
    </span>
  );
}

export { DifficultyBadge };
