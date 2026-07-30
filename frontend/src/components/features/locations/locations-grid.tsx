import { MapPin, TreePine, ChevronLeft, ChevronRight, Clock, TrendingUp, ArrowRight, Search, Map, Filter } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Location, Tag } from "@/lib/types";
import { tagColorClasses } from "./constants";
import { LocationCoverImage } from "@/components/ui/lazy-image";
import { formatRouteMetric, normalizeLocationHiking } from "@/components/features/location-detail/route-utils";

function ShimmerCard() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border">
      <div className="h-52 skeleton" />
      <div className="p-5 space-y-3">
        <div className="h-5 skeleton rounded-full w-2/3" />
        <div className="h-3.5 skeleton rounded-full w-1/3" />
        <div className="space-y-2 pt-1">
          <div className="h-3.5 skeleton rounded-full w-full" />
          <div className="h-3.5 skeleton rounded-full w-4/5" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-14 skeleton rounded-full" />
          <div className="h-6 w-16 skeleton rounded-full" />
        </div>
      </div>
    </div>
  );
}

function LocationCard({ location, index }: { location: Location; index: number }) {
  const { t } = useI18n(["locations", "common", "locationDetail"]);
  // task #152 切源：徒步参数读 location 自身字段（0010 回填），不再读 routes[0]
  const hiking = normalizeLocationHiking(location);
  const durationText = formatRouteMetric(hiking?.duration, t);
  const distanceText = hiking?.distance?.value;
  const delayMs = Math.min(index, 5) * 60;

  return (
    <a
      href={`/locations/${location.id}`}
      className="group block"
      style={{ animation: `fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms both` }}
    >
      <article className="bg-card rounded-2xl overflow-hidden border border-border hover:border-amber-200/50 dark:hover:border-amber-800/50 hover:shadow-xl hover:shadow-amber-100/40 dark:hover:shadow-amber-900/20 hover:ring-1 hover:ring-amber-200/40 dark:hover:ring-amber-700/40 transition-all duration-300 hover:-translate-y-1">
        <div className="relative h-52 overflow-hidden bg-stone-100 dark:bg-stone-800">
          {location.coverImage ? (
            <LocationCoverImage
              src={location.coverImage}
              alt={location.name}
              priority={index === 0}
              className="group-hover:scale-[1.06] transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
              <TreePine className="h-14 w-14 text-amber-400/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          {location.cityName && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-black/35 text-white backdrop-blur-sm">
                <MapPin className="w-3 h-3" />
                {location.cityName}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-bold text-white text-lg leading-tight drop-shadow-sm">
              {location.name}
            </h3>
            {(durationText || distanceText) && (
              <div className="flex items-center gap-3 mt-1.5 text-white/75 text-xs">
                {durationText && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {durationText}
                  </span>
                )}
                {distanceText && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {distanceText}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          <p className="text-stone-500 dark:text-stone-400 text-sm line-clamp-2 leading-relaxed mb-4">
            {location.description}
          </p>
          {location.tags && location.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {location.tags.slice(0, 3).map((tag: Tag, i: number) => (
                <span
                  key={tag?.id ?? i}
                  className={cn("px-2.5 py-0.5 rounded-full text-xs border", tagColorClasses[i % tagColorClasses.length])}
                >
                  {typeof tag === "string" ? tag : tag?.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
            <span className="text-xs text-stone-500 dark:text-stone-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {location.address || location.cityName || t("locations.defaultCity")}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
              {t("common.viewDetail")}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </article>
    </a>
  );
}

/**
 * EmptyState variants (spec v1.1 §3 / #222 T1).
 *
 * Primary button per variant:
 * - noSearch:  清除搜索  (onClearSearch)
 * - noCity:    切换城市  (onChangeCity)
 * - noCitySet: 设置城市  (onSetCity)
 * - tooNarrow: 放宽筛选  (onClearSearch)
 *
 * T3 will add i18n keys (locations.empty.{variant}.title / desc / primaryBtn / secondaryBtn).
 * Placeholder text used until T3 merges.
 */
export type EmptyStateVariant = "noSearch" | "noCity" | "noCitySet" | "tooNarrow";

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  onClearSearch?: () => void;
  onClearAll?: () => void;
  onChangeCity?: () => void;
  onSetCity?: () => void;
}

const VARIANT_META: Record<
  EmptyStateVariant,
  {
    Icon: React.ElementType;
    title: string;
    desc: string;
    primaryLabel: string;
    primaryIcon: React.ElementType;
    primaryAction?: () => void;
    secondaryLabel?: string;
    secondaryAction?: () => void;
  }
> = {
  noSearch: {
    Icon: Search,
    title: "未找到相关地点",
    desc: "没有找到匹配的探索地点，试试换个关键词",
    primaryLabel: "清除搜索",
    primaryIcon: Search,
    primaryAction: undefined, // filled by caller
    secondaryLabel: "查看全部",
    secondaryAction: undefined, // filled by caller
  },
  noCity: {
    Icon: Map,
    title: "该城市暂无探索地点",
    desc: "暂无符合条件的探索地点，试试切换城市",
    primaryLabel: "切换城市",
    primaryIcon: Map,
    primaryAction: undefined,
    secondaryLabel: "查看全部",
    secondaryAction: undefined,
  },
  noCitySet: {
    Icon: MapPin,
    title: "你还没设置探索城市",
    desc: "设置你的探索城市，发现附近的精彩地点",
    primaryLabel: "设置城市",
    primaryIcon: MapPin,
    primaryAction: undefined,
    secondaryLabel: "查看全部",
    secondaryAction: undefined,
  },
  tooNarrow: {
    Icon: Filter,
    title: "筛选条件太严格了",
    desc: "试试放宽筛选条件，发现更多地点",
    primaryLabel: "放宽筛选",
    primaryIcon: Filter,
    primaryAction: undefined,
    secondaryLabel: "查看全部",
    secondaryAction: undefined,
  },
};

export function EmptyState({
  variant,
  onClearSearch,
  onClearAll,
  onChangeCity,
  onSetCity,
}: EmptyStateProps) {
  const meta = VARIANT_META[variant];
  const { Icon } = meta;

  // Route primary/secondary actions based on variant
  const primaryAction = (() => {
    if (variant === "noSearch" || variant === "tooNarrow") return onClearSearch;
    if (variant === "noCity") return onChangeCity;
    if (variant === "noCitySet") return onSetCity;
    return undefined;
  })();

  
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      {/* Icon container — TreePine float animation + amber dots PRESERVED (#222 T1) */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          <Icon
            className="h-9 w-9 text-stone-500 dark:text-stone-500 motion-reduce:animate-none"
            style={{ animation: "float 3s ease-in-out infinite" }}
          />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-200" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-amber-200" />
      </div>
      <h3 className="text-lg font-semibold text-foreground dark:text-stone-300 mb-2">{meta.title}</h3>
      <p className="text-stone-500 dark:text-stone-500 text-sm text-center max-w-xs leading-relaxed mb-6">
        {meta.desc}
      </p>
      {/* Primary button — amber rounded-full shadow-md hover:-translate-y-0.5 active:scale-95 PRESERVED */}
      {primaryAction && (
        <button
          onClick={primaryAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 rounded-full text-sm font-medium transition-all duration-200 shadow-md shadow-amber-200 hover:-translate-y-0.5 active:scale-95"
        >
          <meta.primaryIcon className="h-4 w-4" />
          {meta.primaryLabel}
        </button>
      )}
      {/* Secondary button */}
      {meta.secondaryLabel && onClearAll && (
        <button
          onClick={onClearAll}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300 transition-colors"
        >
          {meta.secondaryLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function LocationsGrid({
  locations,
  isLoading,
  gridKey,
  gridFading,
  pagination,
  onClear,
  emptyVariant,
  currentPage,
  onPageChange,
  getPageNumbers,
}: {
  locations: Location[];
  isLoading: boolean;
  gridKey: number;
  gridFading: boolean;
  pagination: { total: number; totalPages: number };
  onClear: () => void;
  /** @default "noSearch" */
  emptyVariant?: EmptyStateVariant;
  currentPage: number;
  onPageChange: (page: number) => void;
  getPageNumbers: () => (number | "...")[];
}) {
  const { t } = useI18n(["locations"]);
  return (
    <div>
      <h2 className="sr-only">{t("locations.locationList")}</h2>
      <div
        className="transition-opacity duration-200"
        style={{ opacity: gridFading ? 0 : 1 }}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <ShimmerCard key={i} />)}
          </div>
        ) : locations.length === 0 ? (
          <EmptyState
            variant={emptyVariant ?? "noSearch"}
            onClearSearch={onClear}
            onClearAll={onClear}
          />
        ) : (
          <div key={gridKey} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {locations.map((location, index) => (
              <LocationCard key={location.id} location={location} index={index} />
            ))}
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-12">
          <button
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label={t("locations.paginationPrev")}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-popover border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-700 dark:hover:text-stone-300 disabled:bg-stone-100 disabled:border-stone-200 dark:disabled:bg-stone-900 dark:disabled:border-stone-700 disabled:cursor-not-allowed transition-all duration-200"
          >
            <span className={cn("text-stone-900 dark:text-stone-100", currentPage === 1 && "text-stone-500 dark:text-stone-500")}>
              <ChevronLeft className="h-4 w-4" />
            </span>
          </button>

          {getPageNumbers().map((page, idx) =>
            page === "..." ? (
              <span key={`e-${idx}`} className="w-9 h-9 flex items-center justify-center text-stone-600 dark:text-stone-400 text-sm">···</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={cn(
                  "w-9 h-9 rounded-xl text-sm font-medium transition-all duration-200",
                  page === currentPage
                    ? "bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white shadow-sm"
                    : "bg-card text-stone-600 dark:text-stone-400 border border-border hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-700 dark:hover:text-stone-300"
                )}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => currentPage < pagination.totalPages && onPageChange(currentPage + 1)}
            disabled={currentPage === pagination.totalPages}
            aria-label={t("locations.paginationNext")}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-popover border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-700 dark:hover:text-stone-300 disabled:bg-stone-100 disabled:border-stone-200 dark:disabled:bg-stone-900 dark:disabled:border-stone-700 disabled:cursor-not-allowed transition-all duration-200"
          >
            <span className={cn("text-stone-900 dark:text-stone-100", currentPage === pagination.totalPages && "text-stone-500 dark:text-stone-500")}>
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
