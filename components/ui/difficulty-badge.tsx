"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { difficultyLabels } from "@/lib/data/mock";

interface DifficultyBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  difficulty: "easy" | "moderate" | "hard" | "extreme";
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
  const { label, color } = difficultyLabels[difficulty];

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
