/**
 * P0-C T2 (task #173) — 推荐卡类别徽章
 *
 * 视觉规范：Martin CR dm:@Martin msg ae57ca8b
 *  - steady:  Shield  emerald  bg rgba(5,150,105,0.10) / text #065F46
 *  - worthy:  Sparkles amber    bg rgba(217,119,6,0.10) / text #92400E
 *  - fresh:   Zap     sky      bg rgba(2,132,199,0.10) / text #0369A1
 *
 * 色板哲学与 status-badge.tsx 一致：bg 10% + text 深色 + border 25%
 * 深色模式：跟 `bg-card / text-foreground` 主题走；10% opacity 兜底可读
 */

import { Shield, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/i18n/types";
import type { RecommendationKind } from "./types";

const KIND_STYLES: Record<
  RecommendationKind,
  { bg: string; text: string; border: string; Icon: typeof Shield }
> = {
  steady: {
    bg: "rgba(5, 150, 105, 0.10)",
    text: "#065F46",
    border: "rgba(5, 150, 105, 0.25)",
    Icon: Shield,
  },
  worthy: {
    bg: "rgba(217, 119, 6, 0.10)",
    text: "#92400E",
    border: "rgba(217, 119, 6, 0.25)",
    Icon: Sparkles,
  },
  fresh: {
    bg: "rgba(2, 132, 199, 0.10)",
    text: "#0369A1",
    border: "rgba(2, 132, 199, 0.25)",
    Icon: Zap,
  },
};

interface RecommendationBadgeProps {
  kind: RecommendationKind;
  size?: "sm" | "md";
  className?: string;
  /** 覆盖默认 kind 标签文案（如 fresh fallback 不显示「本周新的」） */
  labelKey?: TranslationKey;
}

export function RecommendationBadge({
  kind,
  size = "md",
  className,
  labelKey,
}: RecommendationBadgeProps) {
  const { t } = useI18n(["home"]);
  const s = KIND_STYLES[kind];
  const label = labelKey ? t(labelKey) : t(`home.recommendations.kind.${kind}`);
  const Icon = s.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium border",
        size === "sm" ? "px-2 py-0.5 text-2xs" : "px-2.5 py-1 text-xs",
        className,
      )}
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
      data-testid={`recommendation-badge-${kind}`}
    >
      <Icon className={cn(size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} strokeWidth={2} />
      {label}
    </span>
  );
}
