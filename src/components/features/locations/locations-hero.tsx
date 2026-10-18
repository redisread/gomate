import { Alert as SwAlert } from "@/components/starwind-react/alert";
import { Button as SwButton } from "@/components/starwind-react/button";
import { Input as SwInput } from "@/components/starwind-react/input";
import * as React from "react";
import { Search, X, Sparkles, LoaderCircle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { getRoleConfig, type RoleKey, type RoleCfg } from "./constants";
import { LocationsHeroSkeleton } from "@/components/ui/skeleton";
import type { Region } from "@/lib/types";
import { LocationFilters } from "./location-filters";

interface LocationsHeroProps {
  activeRole: RoleKey;
  searchQuery: string;
  selectedRegionId: string;
  selectedTags: string[];
  regions: Region[];
  popularTags: { id: string; name: string }[];
  showRegionDropdown: boolean;
  onRoleSelect: (role: RoleKey) => void;
  onSearchChange: (q: string) => void;
  onTagToggle: (tagId: string) => void;
  onRegionSelect: (regionId: string) => void;
  onClearFilters: () => void;
  onRegionDropdownChange: (open: boolean) => void;
}

export function LocationsHero({
  activeRole, searchQuery, selectedRegionId, selectedTags, regions, popularTags,
  showRegionDropdown, onRoleSelect, onSearchChange, onTagToggle,
  onRegionSelect, onClearFilters, onRegionDropdownChange,
}: LocationsHeroProps) {
  const { t, loading: i18nLoading } = useI18n(["locations"]);
  const cfg = getRoleConfig(t);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // i18n 加载中时显示骨架屏
  if (i18nLoading) {
    return <LocationsHeroSkeleton />;
  }

  return (
    <section className="relative pt-28 pb-10 bg-card border-b border-border">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-50/60 dark:bg-amber-900/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-stone-50/60 dark:bg-stone-900 blur-2xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium"
            style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)", color: "#b45309" }}
          >
            <Sparkles className="h-3 w-3" />
            {t("locations.ctaHeroBadge")}
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 leading-tight text-center">
          {t("locations.pageTitle")}
        </h1>
        <div className="flex justify-center">
          <p className="text-stone-500 dark:text-stone-500 text-sm sm:text-base mb-7 leading-relaxed w-full max-w-xl text-center">
            {t("locations.pageSubtitle")}
          </p>
        </div>

        {/* 场景角色入口 */}
        <div className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(Object.entries(cfg) as [Exclude<RoleKey, "">, RoleCfg][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = activeRole === key;
              return (
                <SwButton variant="plain" size="inherit" key={key} type="button" onClick={() => onRoleSelect(key)}
                  className="relative group flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-250 active:scale-[0.96] overflow-hidden"
                  style={isActive ? { background: cfg.activeBg, borderColor: "transparent", boxShadow: `0 6px 20px ${cfg.iconColor}35` } : { background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`, borderColor: "rgba(231,229,228,0.8)" }}
                >
                  {isActive && <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle at 80% 20%, rgba(255,255,255,0.6) 0%, transparent 60%)` }} />}
                  <div className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: isActive ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.75)", boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.12)" : "none" }}>
                    <Icon className="h-4 w-4" style={{ color: isActive ? "#fff" : cfg.iconColor }} />
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold leading-tight" style={{ color: isActive ? "#fff" : "#1c1917" }}>{cfg.label}</span>
                      {isActive && <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.25)" }}><X className="h-2.5 w-2.5 text-white" /></span>}
                    </div>
                    <p title={cfg.desc} className="text-2xs leading-tight mt-0.5 truncate" style={{ color: isActive ? "rgba(255,255,255,0.75)" : "#78716c" }}>{cfg.desc}</p>
                  </div>
                </SwButton>
              );
            })}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 dark:text-stone-500 pointer-events-none" />
          <SwInput
            ref={searchInputRef} type="text" placeholder={t("locations.searchPlaceholder")}
            aria-label={t("locations.searchPlaceholder")} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-12 py-3.5 bg-stone-50 dark:bg-stone-900 text-foreground placeholder-stone-500 border border-stone-200 dark:border-stone-700 rounded-2xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 text-base sm:text-sm shadow-sm"
          />
          {searchQuery && (
            <SwButton variant="plain" size="inherit" type="button" aria-label={t("locations.empty.noSearch.clearBtn")} onClick={() => onSearchChange("")}
              className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center hover:bg-stone-100 dark:bg-stone-800 rounded-full transition-colors">
              <X className="h-3.5 w-3.5 text-stone-500 dark:text-stone-500" />
            </SwButton>
          )}
        </div>

        <LocationFilters regions={regions} popularTags={popularTags} selectedRegionId={selectedRegionId}
          selectedTags={selectedTags} showRegionDropdown={showRegionDropdown}
          onRegionSelect={onRegionSelect} onTagToggle={onTagToggle} onClear={onClearFilters} onOpenChange={onRegionDropdownChange} />

      </div>
    </section>
  );
}

export function LocationsResultBar({ isLoading, isRefreshing, pagination, hasLoadError, onRetry }: {
  isLoading: boolean;
  isRefreshing: boolean;
  pagination: { total: number };
  hasLoadError: boolean;
  onRetry: () => void;
}) {
  const { t } = useI18n(["locations"]);
  const pending = isLoading || isRefreshing;
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="mb-5 flex min-h-11 items-center gap-3 text-sm text-muted-foreground">
      {hasLoadError ? (
        <SwAlert as="div" variant="plain" role="alert" className="flex min-h-11 items-center gap-3 text-foreground">
          <span>{t("locations.loadFailed")}</span>
          <SwButton variant="plain" size="inherit" type="button" onClick={onRetry} className="min-h-11 shrink-0 rounded-full px-3 font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("locations.retry")}</SwButton>
        </SwAlert>
      ) : isLoading ? <span className="h-4 w-28 rounded-full bg-muted" /> : <span>{t("locations.totalResultPrefix", { count: pagination.total })}</span>}
      <span className={cn("inline-flex items-center gap-1.5 text-xs", hasLoadError ? "hidden" : !pending && "invisible")}>
        <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />{t("locations.updating")}
      </span>
    </div>
  );
}
