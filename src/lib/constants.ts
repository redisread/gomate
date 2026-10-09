/**
 * GoMate 全局配置
 * 集中管理状态、渐变色等重复配置
 */

// 队伍状态类型
export type TeamStatus = "recruiting" | "full" | "formed" | "cancelled" | "completed";

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
  if (pct >= 81) return "linear-gradient(to right, oklch(0.711 0.166 22.2), var(--destructive))"; // red
  if (pct >= 51) return "linear-gradient(to right, var(--warning), var(--primary))"; // amber
  return "linear-gradient(to right, oklch(0.773 0.153 163.2), oklch(0.596 0.127 163.2))"; // emerald
}
