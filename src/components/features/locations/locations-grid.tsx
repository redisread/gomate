import { Card as SwCard } from "@/components/starwind-react/card";
import { Button as SwButton } from "@/components/starwind-react/button";
import { MapPin, TreePine, ChevronLeft, ChevronRight, ArrowRight, Search, Map, Filter } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Location, Tag } from "@/lib/types";
import { tagColorClasses } from "./constants";
import { LocationCoverImage } from "@/components/ui/lazy-image";
import { getRegionDisplayName } from "@/components/shared/quick-city-options";

function ShimmerCard() {
  return (
    <SwCard className="block gap-0 py-0 ring-0 bg-card rounded-2xl overflow-hidden border border-border">
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
    </SwCard>
  );
}

function LocationCard({ location, index, onNavigate }: { location: Location; index: number; onNavigate?: () => void }) {
  const { t } = useI18n(["locations", "common", "locationDetail"]);
  return (
    <a
      href={`/locations/${location.id}`}
      onClick={onNavigate}
      className="group block"
    >
      <article className="bg-card rounded-2xl overflow-hidden border border-border hover:border-amber-200/50 dark:hover:border-amber-800/50 hover:shadow-xl hover:shadow-amber-100/40 dark:hover:shadow-amber-900/20 hover:ring-1 hover:ring-amber-200/40 dark:hover:ring-amber-700/40 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 motion-reduce:transition-none hover:-translate-y-1">
        <div className="relative h-52 overflow-hidden bg-stone-100 dark:bg-stone-800">
          {location.coverImageUrl ? (
            <LocationCoverImage
              src={location.coverImageUrl}
              alt={location.name}
              priority={index === 0}
              className="group-hover:scale-[1.03] transition-transform duration-150 ease-out motion-reduce:transition-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
              <TreePine className="h-14 w-14 text-amber-400/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          {location.region && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-black/35 text-white backdrop-blur-sm">
                <MapPin className="w-3 h-3" />
                {getRegionDisplayName(location.region)}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-bold text-white text-lg leading-tight drop-shadow-sm">
              {location.name}
            </h3>
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
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
            <span className="text-xs text-stone-500 dark:text-stone-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {location.address || location.region?.name || t("locations.defaultRegion")}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
              {t("common.viewDetail")}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 ease-out motion-reduce:transition-none group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </article>
    </a>
  );
}

/**
 * EmptyState variants (spec v1.1 §3 / #222 T1).
 * i18n keys provided by T3 (locations.empty.{variant}.*).
 */
export type EmptyStateVariant = "noSearch" | "noRegion" | "noRegionSet" | "tooNarrow";

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  /** Search query for the noSearch variant template. */
  query?: string;
  /** Region name for noRegion variant template (e.g. "深圳") */
  regionName?: string;
  onClearSearch?: () => void;
  onClearAll?: () => void;
  onChangeRegion?: () => void;
  onSetRegion?: () => void;
  onClearTags?: () => void;
}

const VARIANT_ICON: Record<EmptyStateVariant, React.ElementType> = {
  noSearch: Search,
  noRegion: Map,
  noRegionSet: MapPin,
  tooNarrow: Filter,
};

const VARIANT_PRIMARY: Record<
  EmptyStateVariant,
  { action: "onClearSearch" | "onChangeRegion" | "onSetRegion"; labelKey: string }
> = {
  noSearch: { action: "onClearSearch", labelKey: "locations.empty.noSearch.clearBtn" },
  noRegion: { action: "onChangeRegion", labelKey: "locations.empty.noRegion.changeBtn" },
  noRegionSet: { action: "onSetRegion", labelKey: "locations.empty.noRegionSet.setBtn" },
  tooNarrow: { action: "onClearSearch", labelKey: "locations.empty.tooNarrow.resetBtn" },
};

const VARIANT_SECONDARY: Record<EmptyStateVariant, string> = {
  noSearch: "locations.empty.noSearch.browseBtn",
  noRegion: "locations.empty.noRegion.browseBtn",
  noRegionSet: "locations.empty.noRegionSet.browseFirstBtn",
  tooNarrow: "locations.empty.tooNarrow.homeBtn",
};

export function EmptyState({
  variant,
  query,
  regionName,
  onClearSearch,
  onClearAll,
  onChangeRegion,
  onSetRegion,
  onClearTags,
}: EmptyStateProps) {
  const { t } = useI18n(["locations", "common"]);
  const Icon = VARIANT_ICON[variant];

  const actionMap = { onClearSearch, onChangeRegion, onSetRegion };
  const primaryConfig = VARIANT_PRIMARY[variant];
  const primaryAction = onClearTags ?? actionMap[primaryConfig.action];

  const titleVars: Record<string, string> = variant === "noSearch" ? { query: query ?? "" } : { regionName: regionName ?? "" };
  const title = t(`locations.empty.${variant}.title`, titleVars);
  const desc = t(`locations.empty.${variant}.desc`, titleVars);
  const primaryLabel = t(onClearTags ? "locations.clearInterests" : primaryConfig.labelKey);
  const secondaryLabel = t(VARIANT_SECONDARY[variant]);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      {/* Icon container */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          <Icon
            className="h-9 w-9 text-stone-500 dark:text-stone-500"
          />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-200" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-amber-200" />
      </div>

      <h3 className="text-lg font-semibold text-foreground dark:text-stone-300 mb-2">{title}</h3>
      <p className="text-stone-500 dark:text-stone-500 text-sm text-center max-w-xs leading-relaxed mb-6">
        {desc}
      </p>

      {/* Primary button — amber rounded-full shadow-md hover:-translate-y-0.5 active:scale-[0.96] PRESERVED */}
      {primaryAction && (
        <SwButton variant="plain" size="inherit" type="button"
          onClick={primaryAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 rounded-full text-sm font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 shadow-md shadow-amber-200 hover:-translate-y-0.5 active:scale-[0.96]"
        >
          <Icon className="h-4 w-4" />
          {primaryLabel}
        </SwButton>
      )}

      {onChangeRegion && primaryConfig.action !== "onChangeRegion" && (
        <SwButton variant="plain" size="inherit" type="button" onClick={onChangeRegion} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <MapPin className="size-4" aria-hidden="true" />{t("locations.changeCity")}
        </SwButton>
      )}
      {onClearTags && query && onClearSearch && (
        <SwButton variant="plain" size="inherit" type="button" onClick={onClearSearch} className="mt-2 min-h-11 rounded-full px-4 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("locations.empty.noSearch.clearBtn")}</SwButton>
      )}
      {/* Secondary "browse" button */}
      {onClearAll && (
        <SwButton variant="plain" size="inherit" type="button"
          onClick={onClearAll}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300 transition-colors"
        >
          {secondaryLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </SwButton>
      )}
    </div>
  );
}

export function LocationsGrid({
  locations,
  isLoading,
  isRefreshing,
  pagination,
  hasLoadError,
  onClearSearch,
  onClearTags,
  onChangeRegion,
  hasSelectedTags,
  onNavigate,
  regionName,
  emptyVariant,
  query,
  currentPage,
  onPageChange,
}: {
  locations: Location[];
  isLoading: boolean;
  isRefreshing: boolean;
  pagination: { total: number; nextCursor: string | null };
  hasLoadError: boolean;
  onClearSearch: () => void;
  onClearTags: () => void;
  onChangeRegion: () => void;
  hasSelectedTags: boolean;
  onNavigate?: () => void;
  regionName?: string;
  /** @default "noSearch" */
  emptyVariant?: EmptyStateVariant;
  /** Search query for the noSearch empty state. */
  query?: string;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useI18n(["locations", "common"]);
  return (
    <div>
      <h2 className="sr-only">{t("locations.locationList")}</h2>
      <div
        className="relative transition-opacity duration-150 motion-reduce:transition-none"
        aria-busy={isLoading || isRefreshing}
      >
        <div className={cn("min-h-96 transition-opacity duration-150 motion-reduce:transition-none", isRefreshing && "opacity-75")}>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <ShimmerCard key={i} />)}
            </div>
          ) : hasLoadError && locations.length === 0 ? null : locations.length === 0 ? (
            <EmptyState
              variant={emptyVariant ?? "noSearch"}
              query={query}
              regionName={regionName}
              onClearSearch={query ? onClearSearch : undefined}
              onClearTags={hasSelectedTags ? onClearTags : undefined}
              onChangeRegion={onChangeRegion}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {locations.map((location, index) => (
                <LocationCard key={location.id} location={location} index={index} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      </div>

      {(currentPage > 1 || pagination.nextCursor) && (
        <div className="flex justify-center items-center gap-1.5 mt-12">
          <SwButton variant="plain" size="inherit" type="button"
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading || isRefreshing || hasLoadError}
            aria-label={t("locations.paginationPrev")}
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-popover border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-700 dark:hover:text-stone-300 disabled:bg-stone-100 disabled:border-stone-200 dark:disabled:bg-stone-900 dark:disabled:border-stone-700 disabled:cursor-not-allowed transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200"
          >
            <span className={cn("text-stone-900 dark:text-stone-100", currentPage === 1 && "text-stone-500 dark:text-stone-500")}>
              <ChevronLeft className="h-4 w-4" />
            </span>
          </SwButton>

          <SwButton variant="plain" size="inherit" type="button"
            onClick={() => pagination.nextCursor && onPageChange(currentPage + 1)}
            disabled={!pagination.nextCursor || isLoading || isRefreshing || hasLoadError}
            aria-label={t("locations.paginationNext")}
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-popover border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-700 dark:hover:text-stone-300 disabled:bg-stone-100 disabled:border-stone-200 dark:disabled:bg-stone-900 dark:disabled:border-stone-700 disabled:cursor-not-allowed transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200"
          >
            <span className={cn("text-stone-900 dark:text-stone-100", !pagination.nextCursor && "text-stone-500 dark:text-stone-500")}>
              <ChevronRight className="h-4 w-4" />
            </span>
          </SwButton>
        </div>
      )}
    </div>
  );
}
