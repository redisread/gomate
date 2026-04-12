import * as React from "react";
import { copy } from "@/lib/copy";
import {
  Navigation,
  Flag,
  Eye,
  Building2,
  Star,
} from "lucide-react";

// ─── 季节映射 ─────────────────────────────────────────────────────────────────
export const SEASON_LABEL: Record<string, string> = {
  spring: "春季",
  summer: "夏季",
  autumn: "秋季",
  winter: "冬季",
};

// ─── 难度配置 ─────────────────────────────────────────────────────────────────
export const DIFFICULTY_CONFIG: Record<
  string,
  {
    label: string;
    barColor: string;
    textColor: string;
    bgColor: string;
    percent: number;
    ringColor: string;
  }
> = {
  easy: {
    label: copy.enums.difficulty.easy,
    barColor: "bg-emerald-400",
    textColor: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    percent: 25,
    ringColor: "ring-emerald-200 dark:ring-emerald-800",
  },
  moderate: {
    label: copy.enums.difficulty.moderate,
    barColor: "bg-amber-400",
    textColor: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    percent: 50,
    ringColor: "ring-amber-200 dark:ring-amber-800",
  },
  hard: {
    label: copy.enums.difficulty.hard,
    barColor: "bg-orange-500",
    textColor: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    percent: 75,
    ringColor: "ring-orange-200 dark:ring-orange-800",
  },
  expert: {
    label: copy.enums.difficulty.expert,
    barColor: "bg-red-500",
    textColor: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    percent: 100,
    ringColor: "ring-red-200 dark:ring-red-800",
  },
};

// POI 类型图标映射
export const POI_ICON_MAP: Record<string, React.ReactNode> = {
  waypoint: <Navigation className="h-3.5 w-3.5" />,
  checkpoint: <Flag className="h-3.5 w-3.5" />,
  viewpoint: <Eye className="h-3.5 w-3.5" />,
  facility: <Building2 className="h-3.5 w-3.5" />,
  poi: <Star className="h-3.5 w-3.5" />,
};

export const POI_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  waypoint: { bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-400", border: "border-sky-100 dark:border-sky-900/50" },
  checkpoint: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-100 dark:border-amber-900/50" },
  viewpoint: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-400", border: "border-violet-100 dark:border-violet-900/50" },
  facility: { bg: "bg-stone-50 dark:bg-stone-800", text: "text-stone-600 dark:text-stone-400", border: "border-stone-100 dark:border-stone-700" },
  poi: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-900/50" },
};
