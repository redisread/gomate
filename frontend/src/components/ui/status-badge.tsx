import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

type TeamStatus = "recruiting" | "full" | "formed" | "cancelled" | "completed";
type Difficulty  = "easy" | "moderate" | "hard" | "expert";

/* ============================================================
   队伍状态徽章颜色方案（Design System v2.0 精确色值）
   ============================================================ */
const STATUS_STYLES: Record<TeamStatus, {
  bg: string;
  text: string;
  border: string;
  dotColor: string;
  ping: boolean;  // recruiting 时圆点闪烁
}> = {
  recruiting: {
    bg:       "oklch(0.666 0.157 58.3 / 0.10)",
    text:     "oklch(0.473 0.125 46.2)",
    border:   "oklch(0.666 0.157 58.3 / 0.25)",
    dotColor: "oklch(0.666 0.157 58.3)",
    ping:     true,
  },
  full: {
    bg:       "oklch(0.666 0.157 58.3 / 0.10)",
    text:     "oklch(0.473 0.125 46.2)",
    border:   "oklch(0.666 0.157 58.3 / 0.25)",
    dotColor: "oklch(0.666 0.157 58.3)",
    ping:     false,
  },
  formed: {
    bg:       "oklch(0.879 0.153 91.6 / 0.12)",
    text:     "oklch(0.666 0.157 58.3)",
    border:   "oklch(0.879 0.153 91.6 / 0.30)",
    dotColor: "oklch(0.769 0.165 70.1)",
    ping:     false,
  },
  completed: {
    bg:       "oklch(0.606 0.032 68.9 / 0.10)",
    text:     "oklch(0.606 0.032 68.9)",
    border:   "oklch(0.606 0.032 68.9 / 0.20)",
    dotColor: "oklch(0.606 0.032 68.9)",
    ping:     false,
  },
  cancelled: {
    bg:       "oklch(0.614 0.204 25.6 / 0.08)",
    text:     "oklch(0.544 0.186 26)",
    border:   "oklch(0.614 0.204 25.6 / 0.20)",
    dotColor: "oklch(0.614 0.204 25.6)",
    ping:     false,
  },
};

/* 难度颜色方案 */
const DIFFICULTY_STYLES: Record<Difficulty, { bg: string; text: string }> = {
  easy:     { bg: "oklch(0.666 0.157 58.3 / 0.10)",  text: "oklch(0.473 0.125 46.2)" },
  moderate: { bg: "oklch(0.666 0.157 58.3 / 0.10)",   text: "oklch(0.473 0.125 46.2)" },
  hard:     { bg: "oklch(0.731 0.166 30.7 / 0.12)", text: "oklch(0.553 0.174 38.4)" },
  expert:   { bg: "oklch(0.614 0.204 25.6 / 0.10)",   text: "oklch(0.448 0.162 26.8)" },
};

/* ============================================================
   StatusBadge — 队伍状态徽章
   props:
     status  — 队伍状态
     showDot — 是否显示状态圆点（recruiting 时闪烁）
     size    — sm | md
   ============================================================ */
interface StatusBadgeProps {
  status: TeamStatus;
  showDot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  status,
  showDot = true,
  size = "md",
  className,
}: StatusBadgeProps) {
  const { t } = useI18n(["enums"]);
  const s = STATUS_STYLES[status];
  // 温暖文案（v2.0：正在招募 / 名额已满 / 队伍已集结 / 圆满收队 / 已取消）
  const label = t(`enums.teamStatus.${status}`);

  return (
    <span
      className={cn(
        "badge-base font-medium border",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className
      )}
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {showDot && (
        /* 状态圆点：recruiting 时有 animate-ping 扩散波纹 */
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {s.ping && (
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
              style={{ backgroundColor: s.dotColor }}
            />
          )}
          <span
            className="relative inline-flex h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: s.dotColor }}
          />
        </span>
      )}
      {label}
    </span>
  );
}

/* ============================================================
   DifficultyBadge — 难度徽章（方形标签，区别于圆角状态徽章）
   ============================================================ */
interface DifficultyBadgeProps {
  difficulty: Difficulty;
  size?: "sm" | "md";
  className?: string;
}

export function DifficultyBadge({
  difficulty,
  size = "md",
  className,
}: DifficultyBadgeProps) {
  const { t } = useI18n(["enums"]);
  const s     = DIFFICULTY_STYLES[difficulty];
  const label = t(`enums.difficulty.${difficulty}`);

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium",
        size === "sm"
          ? "px-1.5 py-0.5 text-[10px] rounded"
          : "px-2 py-0.5 text-xs rounded-md",
        className
      )}
      style={{ background: s.bg, color: s.text }}
    >
      {label}
    </span>
  );
}
