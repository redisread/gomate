"use client";

import { useI18n } from "@/hooks/useI18n";
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
  const { t } = useI18n(["teams"]);

  // 判断是否为无限名额
  const isUnlimited = max <= 0;
  // 防御：max <= 0 时不显示进度（无限名额）
  const fillRatio = isUnlimited ? 0 : Math.min(Math.max(current / max, 0), 1);
  const percentage = Math.round(fillRatio * 100);
  const remaining = isUnlimited ? 0 : Math.max(max - current, 0);

  // 判断颜色等级
  const getColorLevel = () => {
    // 终态统一 neutral
    if (status === "cancelled" || status === "completed") {
      return { bar: "bg-stone-400", track: "bg-stone-200 dark:bg-stone-700" };
    }
    if (status === "full") {
      return { bar: "bg-red-500", track: "bg-stone-200 dark:bg-stone-700" };
    }

    // 无限名额使用 special 样式
    if (isUnlimited) {
      return { bar: "bg-emerald-500", track: "bg-emerald-100 dark:bg-emerald-900/30" };
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
  const isUrgent = !isUnlimited && fillRatio >= 0.8 && status !== "full" && status !== "cancelled" && status !== "completed";
  const isFull = status === "full";

  // 显示文案
  const getLabel = () => {
    if (isUnlimited) return t("teams.unlimitedSpots");
    if (isFull) return t("teams.statusFull");
    if (remaining === 1) return t("teams.spotsOneLeft");
    return `${current}/${max}`;
  };

  return (
    <div className={cn("space-y-2", size === "sm" && "space-y-1")}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            "font-medium",
            isFull && "text-stone-500 dark:text-stone-400",
            isUnlimited && "text-emerald-600 dark:text-emerald-400",
            isUrgent && "text-red-600",
            !isFull && !isUrgent && !isUnlimited && "text-stone-500 dark:text-stone-400"
          )}>
            {getLabel()}
          </span>
          {isUrgent && !isFull && (
            <span className="text-red-600 font-medium">{t("teams.almostFull")}</span>
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
    // 无限名额：只显示标签，不渲染进度条 fill
  if (isUnlimited) {
    return (
      <div className={cn("space-y-2", size === "sm" && "space-y-1")}>
        {showLabel && (
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {t("teams.unlimitedSpots")}
            </span>
          </div>
        )}
        {/* 无限名额显示细线占位，不填充 */}
        <div className={cn(
          "rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/20",
          size === "md" ? "h-1" : "h-0.5"
        )} />
      </div>
    );
  }
      </div>
    </div>
  );
}
