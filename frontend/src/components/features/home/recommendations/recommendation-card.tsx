/**
 * P0-C T2 (task #173) — 推荐卡（单一组件按 kind prop 切样式）
 *
 * spec §3.3 视觉结构（卡片布局）：
 *   [kind badge]  [难度/时长 小 meta]
 *   [地点名（点击跳详情）]
 *   [一句话推荐理由]
 *   [二级数据（favCount/storyCount/ageDays/距离）]
 *
 * 卡片外框：kind 对应颜色的 border-{color}-500/40（不加背景，保持 bg-card）
 * 深色模式：走主题 tokens（bg-card / text-foreground），无需手写 dark: 分支
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/hooks/useI18n";
import { RecommendationBadge } from "./recommendation-badge";
import type { Recommendation, RecommendationKind, ReasonKey } from "./types";

/** kind → 左侧强调边框色（tailwind 语义色，暗色模式跟主题） */
const KIND_BORDER: Record<RecommendationKind, string> = {
  steady: "border-l-emerald-500/60",
  worthy: "border-l-amber-500/60",
  fresh: "border-l-sky-500/60",
};

/** ReasonKey 中的 `.` 转 flat `_`，对齐 i18n depth ≤3 约束 */
function reasonKeyToI18n(key: ReasonKey): string {
  return `home.recommendations.reason.${key.replace(".", "_")}`;
}

interface RecommendationCardProps {
  reco: Recommendation;
}

export function RecommendationCard({ reco }: RecommendationCardProps) {
  const { t } = useI18n(["home", "enums"]);
  const { kind, locationId, reason, location } = reco;

  // reason 文案 —— t() 会用 params 插值；`t(key, vars)` hook 签名
  const reasonText = t(reasonKeyToI18n(reason.key), {
    n: reason.params.n ?? 0,
    km: reason.params.km ?? 0,
    days: reason.params.days ?? 0,
  });

  const difficultyLabel =
    location.difficulty !== null
      ? t(`enums.difficulty.${location.difficulty}`)
      : null;

  // 二级数据（根据 kind 优先展示不同维度）
  const metaLine = buildMetaLine(kind, location, t);

  return (
    <a
      href={`/locations/${locationId}`}
      className="block h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
      data-testid={`recommendation-card-${kind}`}
    >
      <Card
        className={cn(
          "h-full p-5 flex flex-col gap-3 border-l-4 transition-all duration-200",
          "hover:shadow-lg hover:-translate-y-0.5",
          KIND_BORDER[kind],
        )}
      >
        {/* Row 1: badge + difficulty/duration */}
        <div className="flex items-center justify-between gap-2">
          <RecommendationBadge kind={kind} />
          {(difficultyLabel || location.durationMin) && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              {difficultyLabel && <span>{difficultyLabel}</span>}
              {difficultyLabel && location.durationMin ? <span>·</span> : null}
              {location.durationMin && (
                <span>{t("home.recommendations.meta.duration", { n: location.durationMin })}</span>
              )}
            </div>
          )}
        </div>

        {/* Row 2: 地点名 */}
        <h3 className="text-lg font-semibold text-foreground leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
          {location.name}
        </h3>

        {/* Row 3: 一句话理由 */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
          {reasonText}
        </p>

        {/* Row 4: 二级数据 */}
        {metaLine.length > 0 && (
          <div className="pt-2 mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground border-t border-border/50">
            {metaLine.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        )}
      </Card>
    </a>
  );
}

/**
 * 按 kind 的语义挑二级数据字段（避免所有 kind 都塞满信息噪声）：
 *  - steady: 距离 + 未来队伍数
 *  - worthy: 收藏数 + 故事数
 *  - fresh:  新建 N 天 + 未来队伍数
 * 若字段为 0 / null 自动隐藏。
 */
function buildMetaLine(
  kind: RecommendationKind,
  loc: Recommendation["location"],
  t: (key: string, vars?: Record<string, string | number>) => string,
): string[] {
  const out: string[] = [];
  if (kind === "steady") {
    if (loc.distanceKm !== null && loc.distanceKm > 0) {
      out.push(t("home.recommendations.meta.distance", { km: loc.distanceKm }));
    }
    if (loc.futureTeams > 0) {
      out.push(t("home.recommendations.meta.futureTeams", { n: loc.futureTeams }));
    }
  } else if (kind === "worthy") {
    if (loc.favCount > 0) {
      out.push(t("home.recommendations.meta.favorites", { n: loc.favCount }));
    }
    if (loc.storyCount > 0) {
      out.push(t("home.recommendations.meta.stories", { n: loc.storyCount }));
    }
  } else {
    out.push(t("home.recommendations.meta.ageDays", { n: loc.ageDays }));
    if (loc.futureTeams > 0) {
      out.push(t("home.recommendations.meta.futureTeams", { n: loc.futureTeams }));
    }
  }
  return out;
}
