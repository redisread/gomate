"use client";

import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";
import { getDaysUntilStart } from "../constants";

interface TeamUrgencyLabelProps {
  status: Team["status"];
  currentMembers: number;
  maxMembers: number;
  date: string;
  variant?: "badge" | "text";
}

/**
 * 判断目标日期是否是【当前周】的周六或周日（北京时间）
 * @param dateStr - ISO 日期字符串
 * @returns 是否为本周末（当前周的周六或周日）
 */
export function isThisWeekendBeijing(dateStr: string): boolean {
  const targetDate = new Date(dateStr);
  const now = new Date();

  // 转换为北京时间
  const beijingOffset = 8 * 60 * 60 * 1000;
  const targetBeijing = new Date(targetDate.getTime() + beijingOffset);
  const nowBeijing = new Date(now.getTime() + beijingOffset);

  // 获取本周一的日期（北京时间）
  const dayOfWeek = nowBeijing.getUTCDay(); // 0=周日, 1=周一, ..., 6=周六
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 周一到今天的偏移
  const thisMonday = new Date(nowBeijing);
  thisMonday.setUTCDate(nowBeijing.getUTCDate() + mondayOffset);
  thisMonday.setUTCHours(0, 0, 0, 0);

  // 本周六、周日的起始时间
  const thisSaturday = new Date(thisMonday);
  thisSaturday.setUTCDate(thisMonday.getUTCDate() + 5);
  const thisSunday = new Date(thisMonday);
  thisSunday.setUTCDate(thisMonday.getUTCDate() + 6);
  thisSunday.setUTCHours(23, 59, 59, 999);

  // 判断目标日期是否落在本周六/日
  const targetTime = targetBeijing.getTime();
  return targetTime >= thisSaturday.getTime() && targetTime <= thisSunday.getTime();
}

export function TeamUrgencyLabel({
  status,
  currentMembers,
  maxMembers,
  date,
  variant = "badge",
}: TeamUrgencyLabelProps) {
  const { t } = useI18n(["teams"]);

  // 1. 终态（优先级最高）
  if (status === "cancelled") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        variant === "badge" && "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
      )}>
        {t("teams.statusCancelled")}
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        variant === "badge" && "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400"
      )}>
        {t("teams.statusEnded")}
      </span>
    );
  }

  // 2. 已满员
  if (status === "full") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        variant === "badge" && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
      )}>
        {t("teams.statusFull")}
      </span>
    );
  }

  // 3. 已组建
  if (status === "formed") {
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        variant === "badge" && "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
      )}>
        {t("teams.statusFormed")}
      </span>
    );
  }

  // 防御：maxMembers <= 0 时显示「名额不限」
  if (maxMembers <= 0) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        variant === "badge" && "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
      )}>
        {t("teams.unlimitedSpots")}
      </span>
    );
  }

  const fillRatio = currentMembers / maxMembers;

  // 4. 时间紧迫性（仅 recruiting 状态）
  const daysInfo = getDaysUntilStart(t, date);
  if (daysInfo.days === 0) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        "bg-red-50 text-red-600 ring-1 ring-red-200",
        variant === "text" && "text-red-600"
      )}>
        <span className="animate-pulse">🔥</span>
        {t("teams.departToday")}
      </span>
    );
  }
  if (daysInfo.days === 1) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        variant === "text" && "text-amber-600"
      )}>
        {t("teams.departTomorrow")}
      </span>
    );
  }
  if (isThisWeekendBeijing(date)) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        variant === "text" && "text-amber-600"
      )}>
        {t("teams.thisWeekend")}
      </span>
    );
  }

  // 5. 人数紧迫
  if (fillRatio >= 0.8) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        "bg-red-50 text-red-600 ring-1 ring-red-200",
        variant === "text" && "text-red-600"
      )}>
        <span className="animate-pulse">🔥</span>
        {t("teams.almostFull")}
      </span>
    );
  }

  // 6. 默认：还差 X 人成行
  const remaining = Math.max(maxMembers - currentMembers, 0);
  if (remaining === 1) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        "bg-amber-50/50 text-amber-700",
        variant === "text" && "text-amber-600"
      )}>
        {t("teams.spotsOneLeft")}
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
      "bg-amber-50/50 text-amber-700",
      variant === "text" && "text-amber-600"
    )}>
      {t("teams.spotsLeft", { count: remaining })}
    </span>
  );
}
