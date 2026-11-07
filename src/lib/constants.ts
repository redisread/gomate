// 卡片渐变色池（用于无封面时的占位）
const CARD_GRADIENTS = [
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
