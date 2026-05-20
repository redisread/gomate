"use client";

import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";

interface TeamProgressProps {
  current: number;
  max: number;
  status: Team["status"];
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function TeamProgress({
  current,
  max,
  status,
  showLabel = true,
  size = "md",
}: TeamProgressProps) {
  // 防御：max <= 0 时显示为 100% neutral
  const fillRatio = max > 0 ? Math.min(Math.max(current / max, 0), 1) : 1;
  const percentage = Math.round(fillRatio * 100);
  const remaining = max > 0 ? Math.max(max - current, 0) : 0;

  // 判断颜色等级
  const getColorLevel = () => {
    // 终态统一 neutral
    if (status === "cancelled" || status === "completed") {
      return { bar: "bg-stone-400", track: "bg-stone-200 dark:bg-stone-700" };
    }
    if (status === "full") {
      return { bar: "bg-red-500", track: "bg-stone-200 dark:bg-stone-700" };
    }

    // 按 fillRatio 分级
    if (fillRatio < 0.5) {
      return { bar: "bg-stone-500", track: "bg-stone-200 dark:bg-stone-700" };
    }
    if (fillRatio < 0.8) {
      return { bar: "bg-amber-500", track: "bg-stone-200 dark:bg-stone-700" };
    }
    return { bar: "bg-red-500", track: "bg-stone-200 dark:bg-stone-700" };
  };

  const colors = getColorLevel();
  const isUrgent = fillRatio >= 0.8 && status !== "full" && status !== "cancelled" && status !== "completed";
  const isFull = status === "full";

  // 显示文案
  const getLabel = () => {
    if (max <= 0) return "名额不限";
    if (isFull) return "已满员";
    if (remaining === 1) return "仅剩 1 个名额";
    return `${current}/${max}`;
  };

  return (
    <div className={cn("space-y-2", size === "sm" && "space-y-1")}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            "font-medium",
            isFull && "text-stone-500 dark:text-stone-400",
            isUrgent && "text-red-600",
            !isFull && !isUrgent && "text-stone-500 dark:text-stone-400"
          )}>
            {getLabel()}
          </span>
          {isUrgent && !isFull && (
            <span className="text-red-600 font-medium">即将满员</span>
          )}
        </div>
      )}
      <div
        className={cn(
          "rounded-full overflow-hidden transition-all duration-300",
          colors.track,
          size === "md" ? "h-2" : "h-1.5",
          isUrgent && "h-2.5"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            colors.bar,
            isUrgent && "animate-pulse"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
