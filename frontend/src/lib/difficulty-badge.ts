import { DIFFICULTY_CONFIG } from "./constants";

export interface BadgeStyle {
  label: string;
  dot: string;
  text: string;
  pill: string;
}

/**
 * getDifficultyBadgeStyles — 生成地点详情页 hero 区域难度徽章样式
 *
 * 基于全局 DIFFICULTY_CONFIG，仅添加 badge 专属的 dot/pill 样式。
 * @param labelResolver 接收 i18n key，返回本地化标签
 */
export function getDifficultyBadgeStyles(
  labelResolver: (key: string) => string
): Record<string, BadgeStyle> {
  const dotColors: Record<string, string> = {
    easy: "bg-emerald-400",
    moderate: "bg-amber-400",
    hard: "bg-orange-500",
    expert: "bg-red-500",
  };
  const pillStyles: Record<string, string> = {
    easy: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30",
    moderate: "bg-amber-500/20 text-amber-100 border-amber-400/30",
    hard: "bg-orange-500/20 text-orange-100 border-orange-400/30",
    expert: "bg-red-500/20 text-red-100 border-red-400/30",
  };

  const result = {} as Record<string, BadgeStyle>;
  for (const key of Object.keys(DIFFICULTY_CONFIG)) {
    const i18nKey = `enums.difficulty.${key}`;
    result[key] = {
      label: labelResolver(i18nKey),
      dot: dotColors[key],
      text: DIFFICULTY_CONFIG[key as keyof typeof DIFFICULTY_CONFIG].textColor,
      pill: pillStyles[key],
    };
  }
  return result;
}
