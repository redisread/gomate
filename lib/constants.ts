// GoMate 常量定义

// 难度标签映射
export const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: '简单', color: 'bg-emerald-100 text-emerald-700' },
  moderate: { label: '中等', color: 'bg-amber-100 text-amber-700' },
  hard: { label: '困难', color: 'bg-orange-100 text-orange-700' },
  expert: { label: '专家', color: 'bg-red-100 text-red-700' },
};

// 领队等级映射
export const leaderLevelLabels: Record<string, string> = {
  beginner: '新芽领队',
  intermediate: '破风者领队',
  advanced: '巅峰行者领队',
  expert: '传奇徒步家领队',
};

// 预设参与要求标签
export const REQUIREMENT_PRESETS = [
  // 装备类
  "防滑鞋", "手套", "头灯", "登山杖", "防晒用品", "保暖衣物",
  // 经验类
  "有徒步经验", "有夜爬经验", "体能较好",
  // 行为类
  "准时", "能早起", "不怕晒",
  // 特殊类
  "家长陪同", "自备装备",
] as const;

export type RequirementPreset = typeof REQUIREMENT_PRESETS[number];
