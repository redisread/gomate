import { memo, useMemo } from "react";
import { MapPin, Mountain, ArrowRight, Clock, Route } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { DIFFICULTY_CONFIG } from "@/lib/constants";
import { LocationCoverImage } from "@/components/ui/lazy-image";
import { formatRouteMetric, normalizeLocationHiking } from "@/components/features/location-detail/route-utils";
import type { Location } from "@/lib/types";

interface LocationCardProps {
  location: Location;
  /** 卡片索引，前3张为首屏图片，优先加载 */
  index?: number;
}

/**
 * 地点卡片组件
 * 使用 React.memo 避免不必要重渲染
 * 仅当 location.id 变化时重新渲染
 */
export const LocationCard = memo(function LocationCard({ location, index = 0 }: LocationCardProps) {
  const { t } = useI18n(["locations", "locationDetail", "enums"]);
  // task #152 切源：徒步参数读 location 自身字段（0010 回填），不再读 routes[0]
  const difficulty = location.difficulty;
  const diffConfig = difficulty ? DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] : null;
  const firstTag = location.tags?.[0];

  // 仅第一张图片为首屏，优先加载
  const isPriority = index === 0;

  // 使用 useMemo 缓存复杂计算
  const routeInfo = useMemo(() => {
    const hiking = normalizeLocationHiking(location);
    if (!hiking) return null;
    return {
      duration: formatRouteMetric(hiking.duration, t),
      distance: hiking.distance?.value,
      elevation: hiking.elevation?.value,
    };
  }, [location, t]);

  return (
    <a href={`/locations/${location.id}`} className="block group">
      <article
        className="overflow-hidden rounded-2xl cursor-pointer bg-card
          shadow-[var(--shadow-card)]
          transition-all duration-200 ease-out
          hover:shadow-[var(--shadow-card-hover)]
          hover:-translate-y-1
          will-change-transform"
      >
        <div className="relative h-52 overflow-hidden bg-muted">
          {location.coverImage ? (
            <LocationCoverImage
              src={location.coverImage}
              alt={location.name}
              priority={isPriority}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 dark:from-amber-950/40 to-teal-100 dark:to-teal-950/40">
              <Mountain className="h-14 w-14 text-primary/30" />
            </div>
          )}

          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,15,12,0.72) 0%, rgba(15,15,12,0.18) 45%, transparent 70%)" }} />

          <div className="absolute inset-0 flex flex-col justify-end p-4 pb-16 sm:pb-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            style={{ background: "linear-gradient(to top, rgba(146,64,14,0.90) 0%, rgba(146,64,14,0.55) 55%, transparent 100%)", transition: "opacity 0.3s ease" }}>
            <p className="text-white/90 text-xs sm:text-sm line-clamp-1 sm:line-clamp-2 leading-relaxed mb-2">{location.description}</p>
            {routeInfo && (
              <div className="flex flex-wrap gap-2 text-white/75 text-xs">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {routeInfo.duration}</span>
                <span className="inline-flex items-center gap-1"><Route className="h-3 w-3" /> {routeInfo.distance}</span>
                {routeInfo.elevation && <span className="inline-flex items-center gap-1">⛰️ {routeInfo.elevation}</span>}
              </div>
            )}
          </div>

          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
            {diffConfig && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: diffConfig.bg, color: diffConfig.color, backdropFilter: "blur(4px)" }}>{t(diffConfig.labelKey)}</span>
            )}
            {firstTag && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(255,255,255,0.90)", color: "#92400E", backdropFilter: "blur(4px)" }}>{firstTag.name}</span>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 group-hover:opacity-0" style={{ transition: "opacity 0.2s ease" }}>
            <h3 className="font-bold text-white text-lg leading-tight drop-shadow-sm">{location.name}</h3>
            <p className="text-white/75 text-sm flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />{location.address || t("locations.defaultCity")}
            </p>
          </div>
        </div>

        <div className="px-4 py-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            {/* task #180 a11y：location card address 小字体 muted 挂门禁 */}
            <p className="text-xs text-stone-700 dark:text-stone-300 flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />{location.address || t("locations.defaultCity")}
            </p>
            {routeInfo && (
              <div className="flex items-center gap-3 mt-1 text-xs text-stone-500 dark:text-stone-400">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{routeInfo.duration}</span>
                <span className="inline-flex items-center gap-1"><Route className="h-3 w-3" />{routeInfo.distance}</span>
              </div>
            )}
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-3 transition-all duration-150 group-hover:bg-brand group-hover:text-white"
            style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </article>
    </a>
  );
}, (prevProps, nextProps) => {
  // 比较 id 和 index，确保首屏加载状态变化时重新渲染
  return prevProps.location.id === nextProps.location.id &&
         prevProps.index === nextProps.index;
});
