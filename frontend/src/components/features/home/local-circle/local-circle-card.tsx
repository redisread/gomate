/**
 * P0-D T2 (task #176) — 本地圈子地点卡（Top 3 邻居活动过的地点）
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §4 / §5.2 / §6.2
 *   - 「{uniqueVisitors} 人在行动」措辞（非「去过」，spec §5.2）
 *   - 头像堆叠 + tooltip「过去 7 天参与过此地点行动」
 *   - 点卡跳地点详情页
 */

import { memo } from "react";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { LocationCoverImage } from "@/components/ui/lazy-image";
import { AvatarStack } from "./avatar-stack";
import type { TopLocation } from "./types";

interface LocalCircleCardProps {
  location: TopLocation;
  index?: number;
}

export const LocalCircleCard = memo(function LocalCircleCard({ location, index = 0 }: LocalCircleCardProps) {
  const { t } = useI18n(["home"]);

  return (
    <a href={`/locations/${location.locationId}`} className="block group" data-testid="local-circle-card">
      <article
        className="overflow-hidden rounded-2xl cursor-pointer bg-card
          shadow-[var(--shadow-card)]
          transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 ease-out
          hover:shadow-[var(--shadow-card-hover)]
          hover:-translate-y-1
          will-change-transform"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <LocationCoverImage
            src={location.locationCoverImage}
            alt={location.locationName}
            priority={index === 0}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-4 sm:p-5">
          <h3 className="font-semibold text-base sm:text-lg text-card-foreground line-clamp-1">
            {location.locationName}
          </h3>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AvatarStack
                urls={location.avatarStack}
                size="sm"
                tooltip={t("home.localCircle.avatarStack.tooltip")}
              />
              <span className="text-sm text-stone-700 dark:text-stone-300 truncate">
                {t("home.localCircle.inAction", { n: location.uniqueVisitors })}
              </span>
            </div>
            <ArrowRight
              className="w-4 h-4 flex-shrink-0 text-amber-700 dark:text-amber-400 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </div>
        </div>
      </article>
    </a>
  );
});
