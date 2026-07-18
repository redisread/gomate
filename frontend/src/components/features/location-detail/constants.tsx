
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
    label: "enums.difficulty.easy",
    barColor: "bg-emerald-400",
    textColor: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    percent: 25,
    ringColor: "ring-emerald-200 dark:ring-emerald-800",
  },
  moderate: {
    label: "enums.difficulty.moderate",
    barColor: "bg-amber-400",
    textColor: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    percent: 50,
    ringColor: "ring-amber-200 dark:ring-amber-800",
  },
  hard: {
    label: "enums.difficulty.hard",
    barColor: "bg-orange-500",
    textColor: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    percent: 75,
    ringColor: "ring-orange-200 dark:ring-orange-800",
  },
  expert: {
    label: "enums.difficulty.expert",
    barColor: "bg-red-500",
    textColor: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    percent: 100,
    ringColor: "ring-red-200 dark:ring-red-800",
  },
};
