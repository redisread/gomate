/**
 * P0-D T3 (task #177) — 邻居队伍行「你的邻居参加了这些队伍」
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §4 / §6 / §7（D2 拍板 A-1）
 *   - 落在本地圈子模块内子区块（不改 HomeTeamsSection 现有卡）
 *   - 每行：队伍标题 + 地点·时间 + AvatarStack + formatNeighbor
 *   - formatNeighbor: 1-3 → 「{city}邻居 N 人」(city dynamic)，≥4 → 「你的邻居 4+」(不露具体数字)
 *   - 数据 = local-circle/home 的 neighborTeams（零额外查询）
 *   - 行式布局，视觉层级次于主区块地点卡
 */

import { memo } from "react";
import { MapPin, Calendar } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { getDaysUntil } from "@/lib/date-utils";
import { AvatarStack } from "./avatar-stack";
import type { NeighborTeam } from "./types";

interface NeighborTeamRowProps {
  team: NeighborTeam;
  /** 城市名（formatNeighbor 的 {city} dynamic 前缀） */
  cityName: string;
}

export const NeighborTeamRow = memo(function NeighborTeamRow({ team, cityName }: NeighborTeamRowProps) {
  const { t } = useI18n(["home"]);

  // formatNeighbor：1-3 显示具体数（{city}邻居 N 人），≥4 显示「你的邻居 4+」（不露具体数字，spec §4.2）
  const neighborLabel =
    team.neighborCount >= 4
      ? t("home.localCircle.neighborCountMany")
      : t("home.localCircle.neighborCount", { city: cityName, n: team.neighborCount });

  // 出发时间标签（复用 getDaysUntil；未来时间戳 ms）
  const daysUntil = team.startTime ? getDaysUntil(team.startTime) : null;
  const timeLabel =
    daysUntil === null
      ? null
      : daysUntil === 0
        ? t("home.teamCard.departingToday")
        : daysUntil === 1
          ? t("home.teamCard.departingTomorrow")
          : t("home.teamCard.departingInDays", { days: daysUntil });

  return (
    <a
      href={`/teams/${team.teamId}`}
      className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-card
        shadow-[var(--shadow-warm-sm)] hover:shadow-[var(--shadow-card)]
        transition-shadow duration-200 group"
      data-testid="neighbor-team-row"
    >
      <div className="flex-1 min-w-0">
        <h4 title={team.teamTitle} className="font-medium text-sm sm:text-base text-card-foreground line-clamp-1">
          {team.teamTitle}
        </h4>
        <div className="mt-1 flex items-center gap-3 text-xs text-stone-600 dark:text-stone-400">
          <span className="inline-flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
            <span title={team.locationName} className="truncate">{team.locationName}</span>
          </span>
          {timeLabel && (
            <span className="inline-flex items-center gap-1 flex-shrink-0">
              <Calendar className="w-3 h-3" strokeWidth={2} />
              {timeLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <AvatarStack urls={team.neighborAvatars} size="sm" />
        <span className="text-xs font-medium text-amber-800 dark:text-amber-300 whitespace-nowrap">
          {neighborLabel}
        </span>
      </div>
    </a>
  );
});
