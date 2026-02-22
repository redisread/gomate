// GoMate 常量定义

// 难度标签映射
export const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: '简单', color: 'bg-emerald-100 text-emerald-700' },
  moderate: { label: '中等', color: 'bg-amber-100 text-amber-700' },
  hard: { label: '困难', color: 'bg-orange-100 text-orange-700' },
  extreme: { label: '极难', color: 'bg-red-100 text-red-700' },
};

// 领队等级映射
export const leaderLevelLabels: Record<string, string> = {
  beginner: '初级领队',
  intermediate: '中级领队',
  advanced: '高级领队',
  expert: '资深领队',
};
