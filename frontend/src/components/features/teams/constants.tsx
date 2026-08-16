import * as React from "react";
import { Lock, Flag, CheckCircle2 } from "lucide-react";
import type { TranslationKey } from "@/i18n";

type StatusCfg = {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
  pulse: boolean;
  icon?: React.ReactNode;
};

/**
 * Build status config with translated labels
 */
export function getStatusConfig(t: (key: TranslationKey) => string): Record<string, StatusCfg> {
  return {
    recruiting: {
      label: t("enums.teamStatus.recruiting"),
      dotColor: "bg-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200/60 dark:ring-amber-900/50",
      textColor: "text-amber-700 dark:text-amber-400",
      pulse: true,
    },
    full: {
      label: t("enums.teamStatus.full"),
      dotColor: "bg-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200/60 dark:ring-amber-900/50",
      textColor: "text-amber-700 dark:text-amber-400",
      pulse: false,
      icon: <Lock className="h-3 w-3" />,
    },
    formed: {
      label: t("enums.teamStatus.formed"),
      dotColor: "bg-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200/60 dark:ring-blue-900/50",
      textColor: "text-blue-700 dark:text-blue-400",
      pulse: false,
      icon: <Flag className="h-3 w-3" />,
    },
    ongoing: {
      label: t("enums.teamStatus.ongoing"),
      dotColor: "bg-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200/60 dark:ring-blue-900/50",
      textColor: "text-blue-700 dark:text-blue-400",
      pulse: false,
      icon: <Flag className="h-3 w-3" />,
    },
    completed: {
      label: t("enums.teamStatus.completed"),
      dotColor: "bg-stone-400",
      bgColor: "bg-stone-100 dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700",
      textColor: "text-stone-500 dark:text-stone-400",
      pulse: false,
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    cancelled: {
      label: t("enums.teamStatus.cancelled"),
      dotColor: "bg-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/30 ring-1 ring-red-200/60 dark:ring-red-900/50",
      textColor: "text-red-600 dark:text-red-400",
      pulse: false,
    },
    closed: {
      label: t("enums.teamStatus.closed"),
      dotColor: "bg-stone-400",
      bgColor: "bg-stone-100 dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700",
      textColor: "text-stone-500 dark:text-stone-400",
      pulse: false,
      icon: <Lock className="h-3 w-3" />,
    },
    expired_unformed: {
      label: t("enums.teamStatus.closed"),
      dotColor: "bg-stone-400",
      bgColor: "bg-stone-100 dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700",
      textColor: "text-stone-500 dark:text-stone-400",
      pulse: false,
      icon: <Lock className="h-3 w-3" />,
    },
  };
}

export function getDaysUntilStart(t: (key: TranslationKey, vars?: Record<string, string | number>) => string, dateStr: string): { days: number; text: string; urgent: boolean; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(dateStr);
  startDate.setHours(0, 0, 0, 0);

  const diffTime = startDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { days: diffDays, text: t("teams.departed"), urgent: false, color: "text-stone-400 dark:text-stone-500" };
  }
  if (diffDays === 0) {
    return { days: 0, text: t("teams.departToday"), urgent: true, color: "text-red-600" };
  }
  if (diffDays === 1) {
    return { days: 1, text: t("teams.departTomorrow"), urgent: true, color: "text-red-600" };
  }
  if (diffDays <= 3) {
    return { days: diffDays, text: t("teams.daysRemaining", { days: diffDays }), urgent: true, color: "text-amber-600" };
  }
  return { days: diffDays, text: t("teams.daysLeft", { days: diffDays }), urgent: false, color: "text-muted-foreground" };
}
