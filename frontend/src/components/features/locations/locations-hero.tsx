import * as React from "react";
import { Search, MapPin, X, ChevronDown, Sparkles } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { getRoleConfig, type RoleKey, type RoleCfg } from "./constants";
import { LocationsHeroSkeleton } from "@/components/ui/skeleton";
import type { Region } from "@/lib/types";

interface LocationsHeroProps {
  activeRole: RoleKey;
  searchQuery: string;
  selectedRegionId: string;
  selectedTags: string[];
  regions: Region[];
  popularTags: { id: string; name: string }[];
  showRegionDropdown: boolean;
  regionDropdownPos: { top: number; left: number };
  selectedRegionName?: string;
  hasActiveFilters: boolean;
  isLoading: boolean;
  pagination: { total: number };
  onRoleSelect: (role: RoleKey) => void;
  onSearchChange: (q: string) => void;
  onTagToggle: (tagId: string) => void;
  onRegionSelect: (regionId: string) => void;
  onClearAll: () => void;
  onToggleRegionDropdown: () => void;
  setRegionDropdownPos: (pos: { top: number; left: number }) => void;
}

export function LocationsHero({
  activeRole, searchQuery, selectedRegionId, selectedTags, regions, popularTags,
  showRegionDropdown, regionDropdownPos, selectedRegionName, hasActiveFilters,
  isLoading: _isLoading, pagination: _pagination, onRoleSelect, onSearchChange, onTagToggle,
  onRegionSelect, onClearAll, onToggleRegionDropdown, setRegionDropdownPos,
}: LocationsHeroProps) {
  const { t, loading: i18nLoading } = useI18n(["locations"]);
  const cfg = getRoleConfig(t);
  const regionBtnRef = React.useRef<HTMLButtonElement>(null);
  const regionDropdownRef = React.useRef<HTMLDivElement>(null);
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
            style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)", color: "#b45309", animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            <Sparkles className="h-3 w-3" />
            {t("locations.ctaHeroBadge")}
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 leading-tight text-center" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 80ms both" }}>
          {t("locations.pageTitle")}
        </h1>
        <div className="flex justify-center">
          <p className="text-stone-500 dark:text-stone-500 text-sm sm:text-base mb-7 leading-relaxed w-full max-w-xl text-center" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 150ms both" }}>
            {t("locations.pageSubtitle")}
          </p>
        </div>

        {/* 场景角色入口 */}
        <div className="mb-6" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 190ms both" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(Object.entries(cfg) as [Exclude<RoleKey, "">, RoleCfg][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = activeRole === key;
              return (
                <button key={key} type="button" onClick={() => onRoleSelect(key)}
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
                </button>
              );
            })}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both" }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 dark:text-stone-500 pointer-events-none" />
          <input
            ref={searchInputRef} type="text" placeholder={t("locations.searchPlaceholder")}
            value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-12 py-3.5 bg-stone-50 dark:bg-stone-900 text-foreground placeholder-stone-500 border border-stone-200 dark:border-stone-700 rounded-2xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 text-sm shadow-sm"
          />
          {searchQuery && (
            <button type="button" onClick={() => onSearchChange("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 dark:bg-stone-800 rounded-full transition-colors">
              <X className="h-3.5 w-3.5 text-stone-500 dark:text-stone-500" />
            </button>
          )}
        </div>

        {/* 筛选栏 */}
        <div className="mt-3 relative" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 290ms both" }}>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {regions.length > 0 && (
              <button ref={regionBtnRef} type="button" data-region-btn
                onClick={() => {
                  if (regionBtnRef.current) {
                    const rect = regionBtnRef.current.getBoundingClientRect();
                    setRegionDropdownPos({ top: rect.bottom + 6, left: rect.left });
                  }
                  onToggleRegionDropdown();
                }}
                className={cn("flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200",
                  selectedRegionId ? "bg-amber-700 text-white border-amber-700 shadow-sm dark:bg-amber-500 dark:border-amber-500 dark:text-stone-950" : "bg-card text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-700 dark:hover:text-stone-300"
                )}>
                <MapPin className="w-3 h-3" />
                {selectedRegionName || t("locations.allRegions")}
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showRegionDropdown && "rotate-180")} />
              </button>
            )}
            {regions.length > 0 && popularTags.length > 0 && (
              <div className="flex-shrink-0 w-px h-4 bg-stone-200 dark:bg-stone-700" />
            )}
            {popularTags.slice(0, 8).map((tag) => (
              <button key={tag.id} type="button" onClick={() => onTagToggle(tag.id)}
                className={cn("flex-shrink-0 px-3 py-1.5 text-xs rounded-full border transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 active:scale-[0.96]",
                  selectedTags.includes(tag.id) ? "bg-amber-700 text-white border-amber-700 shadow-sm dark:bg-amber-500 dark:border-amber-500 dark:text-stone-950" : "bg-card text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-700 dark:hover:text-stone-300"
                )}>
                {tag.name}
              </button>
            ))}
            {hasActiveFilters && (
              <button type="button" onClick={onClearAll}
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs text-stone-500 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors rounded-full">
                <X className="w-3 h-3" />{t("locations.clearBtn")}
              </button>
            )}
          </div>
          <div className="absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        </div>

        {/* Region dropdown */}
        {showRegionDropdown && (
          <div ref={regionDropdownRef} data-region-dropdown className="fixed bg-popover border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg z-[9999] min-w-[140px] max-h-60 overflow-y-auto py-1 origin-top"
            style={{ top: regionDropdownPos.top, left: regionDropdownPos.left, animation: "scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            <button type="button" onClick={() => onRegionSelect("")}
              className={cn("w-full flex items-center gap-2 px-3.5 py-2 text-xs transition-colors",
                !selectedRegionId ? "text-amber-700 bg-amber-50" : "text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300"
              )}>
              <MapPin className="w-3 h-3 flex-shrink-0" />{t("locations.allRegions")}
            </button>
            {regions.map((region) => (
              <button key={region.id} type="button" onClick={() => onRegionSelect(region.id)}
                className={cn("w-full flex items-center gap-2 px-3.5 py-2 text-xs transition-colors",
                  selectedRegionId === region.id ? "text-amber-700 bg-amber-50" : "text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300"
                )}>
                <MapPin className="w-3 h-3 flex-shrink-0" />{region.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function LocationsResultBar({
  isLoading, pagination, selectedRegionId, selectedTags, activeRole,
  selectedRegionName, popularTags, hasActiveFilters, onRoleSelect, onRegionSelect, onTagToggle, onClearAll,
}: {
  isLoading: boolean; pagination: { total: number }; selectedRegionId: string; selectedTags: string[];
  activeRole: RoleKey; selectedRegionName?: string; popularTags: { id: string; name: string }[];
  hasActiveFilters: boolean; onRoleSelect: (role: RoleKey) => void; onRegionSelect: (regionId: string) => void;
  onTagToggle: (tagId: string) => void; onClearAll: () => void;
}) {
  const { t } = useI18n(["locations"]);
  const cfg = getRoleConfig(t);
  return (
    <div className="flex items-center justify-between mb-7">
      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="h-4 w-28 bg-stone-200 dark:bg-stone-700 rounded-full animate-pulse" />
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {t("locations.totalResultPrefix", { count: pagination.total })}
          </p>
        )}
        {!isLoading && (selectedRegionId || selectedTags.length > 0 || activeRole) && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeRole && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                <span>{cfg[activeRole].emoji}</span>
                {cfg[activeRole].label}
                <button onClick={() => onRoleSelect("")} className="hover:text-emerald-900 dark:hover:text-emerald-300 transition-colors ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedRegionId && selectedRegionName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                <MapPin className="w-3 h-3" />
                {selectedRegionName}
                <button onClick={() => onRegionSelect("")} className="hover:text-amber-900 dark:hover:text-amber-300 transition-colors ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedTags.map((tagId) => {
              const tag = popularTags.find((t) => t.id === tagId);
              return (
                <span key={tagId} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                  {tag?.name || tagId}
                  <button onClick={() => onTagToggle(tagId)} className="hover:text-foreground transition-colors ml-0.5"><X className="w-3 h-3" /></button>
                </span>
              );
            })}
          </div>
        )}
      </div>
      {hasActiveFilters && !isLoading && (
        <button onClick={onClearAll}
          className="text-xs text-stone-500 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">
          <X className="h-3.5 w-3.5" />
          {t("locations.clearFilter")}
        </button>
      )}
    </div>
  );
}
