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
    bg:       "rgba(217, 119, 6, 0.10)",
    text:     "#92400E",
    border:   "rgba(217, 119, 6, 0.25)",
    dotColor: "#D97706",
    ping:     true,
  },
  full: {
    bg:       "rgba(217, 119, 6, 0.10)",
    text:     "#92400e",
    border:   "rgba(217, 119, 6, 0.25)",
    dotColor: "#d97706",
    ping:     false,
  },
  formed: {
    bg:       "rgba(252, 211, 77, 0.12)",
    text:     "#D97706",
    border:   "rgba(252, 211, 77, 0.30)",
    dotColor: "#F59E0B",
    ping:     false,
  },
  completed: {
    bg:       "rgba(143, 127, 110, 0.10)",
    text:     "#8f7f6e",
    border:   "rgba(143, 127, 110, 0.20)",
    dotColor: "#8f7f6e",
    ping:     false,
  },
  cancelled: {
    bg:       "rgba(229, 62, 62, 0.08)",
    text:     "#c53030",
    border:   "rgba(229, 62, 62, 0.20)",
    dotColor: "#e53e3e",
    ping:     false,
  },
};

/* 难度颜色方案 */
const DIFFICULTY_STYLES: Record<Difficulty, { bg: string; text: string }> = {
  easy:     { bg: "rgba(217, 119, 6, 0.10)",  text: "#92400E" },
  moderate: { bg: "rgba(217, 119, 6, 0.10)",   text: "#92400e" },
  hard:     { bg: "rgba(255, 122, 101, 0.12)", text: "#c2410c" },
  expert:   { bg: "rgba(229, 62, 62, 0.10)",   text: "#9b1c1c" },
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
