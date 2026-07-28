/**
 * GoMate 全局配置
 * 集中管理难度、状态、渐变色等重复配置
 */

// 队伍状态类型
export type TeamStatus = "recruiting" | "full" | "formed" | "cancelled" | "completed";

// 难度类型
export type Difficulty = "easy" | "moderate" | "hard" | "expert";

// 难度配置（全局统一）
// task #158：标签统一以 enums.json 为唯一出处（Steven 定稿），此处只留 labelKey + 样式，
// 渲染处用 t(config.labelKey) 取多语言文案（enums 值自带 emoji，无需再拼 config.emoji）
export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    labelKey: string;
    emoji: string;
    badgeColor: string;
    bg: string;
    color: string;
    activeColor: string;
  }
> = {
  easy: {
    labelKey: "enums.difficulty.easy",
    emoji: "🌿",
    badgeColor: "bg-amber-500/80 text-white",
    bg: "rgba(217,119,6,0.85)",
    color: "#fff",
    activeColor: "bg-amber-600 border-amber-600 text-white",
  },
  moderate: {
    labelKey: "enums.difficulty.moderate",
    emoji: "⛰",
    badgeColor: "bg-amber-500/80 text-white",
    bg: "rgba(217,119,6,0.88)",
    color: "#fff",
    activeColor: "bg-amber-500 border-amber-500 text-white",
  },
  hard: {
    labelKey: "enums.difficulty.hard",
    emoji: "🧗",
    badgeColor: "bg-orange-500/80 text-white",
    bg: "rgba(255,122,101,0.90)",
    color: "#fff",
    activeColor: "bg-orange-500 border-orange-500 text-white",
  },
  expert: {
    labelKey: "enums.difficulty.expert",
    emoji: "🏔",
    badgeColor: "bg-red-500/80 text-white",
    bg: "rgba(109,40,217,0.85)",
    color: "#fff",
    activeColor: "bg-red-500 border-red-500 text-white",
  },
};

// 难度选项（用于筛选面板，label 渲染处 t(labelKey)）
export const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_CONFIG).map(([id, config]) => ({
  id,
  emoji: config.emoji,
  labelKey: config.labelKey,
  activeColor: config.activeColor,
}));


// 卡片渐变色池（用于无封面时的占位）
export const CARD_GRADIENTS = [
  "from-amber-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-cyan-400 to-sky-500",
];

// 根据 ID 获取卡片渐变色
export function getCardGradient(id: string): string {
  const index = id.charCodeAt(0) % CARD_GRADIENTS.length;
  return CARD_GRADIENTS[index];
}

// 进度条颜色分级
export function getProgressGradient(pct: number): string {
  if (pct >= 81) return "linear-gradient(to right, #f87171, #ef4444)"; // red
  if (pct >= 51) return "linear-gradient(to right, #fbbf24, #d97706)"; // amber
  return "linear-gradient(to right, #34d399, #059669)"; // emerald
}
