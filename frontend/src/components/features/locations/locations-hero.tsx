import * as React from "react";
import { Search, MapPin, X, ChevronDown, Sparkles, Compass, TreePine, Mountain, ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { getRoleConfig, type RoleKey, type RoleCfg } from "./constants";

interface LocationsHeroProps {
  activeRole: RoleKey;
  searchQuery: string;
  selectedCityId: string;
  selectedTags: string[];
  cities: { id: string; name: string }[];
  popularTags: { id: string; name: string }[];
  showCityDropdown: boolean;
  cityDropdownPos: { top: number; left: number };
  selectedCityName?: string;
  hasActiveFilters: boolean;
  isLoading: boolean;
  pagination: { total: number };
  onRoleSelect: (role: RoleKey) => void;
  onSearchChange: (q: string) => void;
  onTagToggle: (tagId: string) => void;
  onCitySelect: (cityId: string) => void;
  onClearAll: () => void;
  onToggleCityDropdown: () => void;
  setCityDropdownPos: (pos: { top: number; left: number }) => void;
}

export function LocationsHero({
  activeRole, searchQuery, selectedCityId, selectedTags, cities, popularTags,
  showCityDropdown, cityDropdownPos, selectedCityName, hasActiveFilters,
  isLoading, pagination, onRoleSelect, onSearchChange, onTagToggle,
  onCitySelect, onClearAll, onToggleCityDropdown, setCityDropdownPos,
}: LocationsHeroProps) {
  const { t } = useI18n(["locations"]);
  const cfg = getRoleConfig(t);
  const cityBtnRef = React.useRef<HTMLButtonElement>(null);
  const cityDropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <section className="relative pt-28 pb-10 bg-card border-b border-border">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-50/60 dark:bg-amber-900/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-stone-50/60 dark:bg-stone-900 blur-2xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium"
          style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)", color: "#b45309", animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          <Sparkles className="h-3 w-3" />
          {t("locations.ctaHeroBadge")}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 leading-tight" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 80ms both" }}>
          {t("locations.pageTitle")}
        </h1>
        <p className="text-stone-400 dark:text-stone-500 text-sm sm:text-base mb-7 leading-relaxed max-w-xl" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 150ms both" }}>
          {t("locations.heroTagline")}
        </p>

        {/* 场景角色入口 */}
        <div className="mb-6" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 190ms both" }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(Object.entries(cfg) as [Exclude<RoleKey, "">, RoleCfg][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = activeRole === key;
              return (
                <button key={key} type="button" onClick={() => onRoleSelect(key)}
                  className="relative group flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all duration-250 active:scale-[0.97] overflow-hidden"
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
                    <p className="text-[11px] leading-tight mt-0.5 truncate" style={{ color: isActive ? "rgba(255,255,255,0.75)" : "#a8a29e" }}>{cfg.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both" }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
          <input
            ref={searchInputRef} type="text" placeholder={t("locations.searchPlaceholder")}
            value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-12 py-3.5 bg-stone-50 dark:bg-stone-900 text-foreground placeholder-stone-400 border border-stone-200 dark:border-stone-700 rounded-2xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 transition-all duration-200 text-sm shadow-sm"
          />
          {searchQuery && (
            <button type="button" onClick={() => onSearchChange("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 dark:bg-stone-800 rounded-full transition-colors">
              <X className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
            </button>
          )}
        </div>

        {/* 筛选栏 */}
        <div className="mt-3 relative" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 290ms both" }}>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {cities.length > 0 && (
              <button ref={cityBtnRef} type="button"
                onClick={() => {
                  if (cityBtnRef.current) {
                    const rect = cityBtnRef.current.getBoundingClientRect();
                    setCityDropdownPos({ top: rect.bottom + 6, left: rect.left });
                  }
                  onToggleCityDropdown();
                }}
                className={cn("flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                  selectedCityId ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-card text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-700 dark:hover:text-stone-300"
                )}>
                <MapPin className="w-3 h-3" />
                {selectedCityName || t("locations.allCities")}
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showCityDropdown && "rotate-180")} />
              </button>
            )}
            {cities.length > 0 && popularTags.length > 0 && (
              <div className="flex-shrink-0 w-px h-4 bg-stone-200 dark:bg-stone-700" />
            )}
            {popularTags.slice(0, 8).map((tag) => (
              <button key={tag.id} type="button" onClick={() => onTagToggle(tag.id)}
                className={cn("flex-shrink-0 px-3 py-1.5 text-xs rounded-full border transition-all duration-200 active:scale-95",
                  selectedTags.includes(tag.id) ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-card text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-700 dark:hover:text-stone-300"
                )}>
                {tag.name}
              </button>
            ))}
            {hasActiveFilters && (
              <button type="button" onClick={onClearAll}
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors rounded-full">
                <X className="w-3 h-3" />{t("locations.clearBtn")}
              </button>
            )}
          </div>
          <div className="absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        </div>

        {/* 城市下拉 */}
        {showCityDropdown && (
          <div ref={cityDropdownRef} className="fixed bg-popover border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg z-[9999] min-w-[140px] max-h-60 overflow-y-auto py-1 origin-top"
            style={{ top: cityDropdownPos.top, left: cityDropdownPos.left, animation: "scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            <button type="button" onClick={() => onCitySelect("")}
              className={cn("w-full flex items-center gap-2 px-3.5 py-2 text-xs transition-colors",
                !selectedCityId ? "text-amber-600 bg-amber-50" : "text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300"
              )}>
              <MapPin className="w-3 h-3 flex-shrink-0" />{t("locations.allCities")}
            </button>
            {cities.map((city) => (
              <button key={city.id} type="button" onClick={() => onCitySelect(city.id)}
                className={cn("w-full flex items-center gap-2 px-3.5 py-2 text-xs transition-colors",
                  selectedCityId === city.id ? "text-amber-600 bg-amber-50" : "text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300"
                )}>
                <MapPin className="w-3 h-3 flex-shrink-0" />{city.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function LocationsResultBar({
  isLoading, pagination, selectedCityId, selectedTags, activeRole,
  selectedCityName, popularTags, hasActiveFilters, onRoleSelect, onCitySelect, onTagToggle, onClearAll,
}: {
  isLoading: boolean; pagination: { total: number }; selectedCityId: string; selectedTags: string[];
  activeRole: RoleKey; selectedCityName?: string; popularTags: { id: string; name: string }[];
  hasActiveFilters: boolean; onRoleSelect: (role: RoleKey) => void; onCitySelect: (cityId: string) => void;
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
        {!isLoading && (selectedCityId || selectedTags.length > 0 || activeRole) && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeRole && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                <span>{cfg[activeRole].emoji}</span>
                {cfg[activeRole].label}
                <button onClick={() => onRoleSelect("")} className="hover:text-emerald-900 dark:hover:text-emerald-300 transition-colors ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedCityId && selectedCityName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                <MapPin className="w-3 h-3" />
                {selectedCityName}
                <button onClick={() => onCitySelect("")} className="hover:text-amber-900 dark:hover:text-amber-300 transition-colors ml-0.5"><X className="w-3 h-3" /></button>
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
          className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">
          <X className="h-3.5 w-3.5" />
          {t("locations.clearFilter")}
        </button>
      )}
    </div>
  );
}

export function LocationsCtaSection() {
  const { t } = useI18n(["locations"]);
  return (
    <section className="relative py-16 border-t border-stone-200 dark:border-stone-800 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50 dark:from-stone-900 dark:via-amber-950/20 dark:to-stone-900" />
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #78716c 1px, transparent 0)`, backgroundSize: "24px 24px" }} />
      <div className="absolute left-8 top-1/2 -translate-y-1/2 opacity-[0.06]"><Compass className="h-32 w-32 text-stone-600 dark:text-stone-400" /></div>
      <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-[0.06]"><TreePine className="h-32 w-32 text-stone-600 dark:text-stone-400" /></div>

      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mx-auto mb-5 border border-amber-100 dark:border-amber-900/50">
          <Mountain className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">{t("locations.ctaTitle")}</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-7 max-w-sm mx-auto leading-relaxed">{t("locations.ctaDesc")}</p>
        <a href="/contact">
          <button className="group inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-7 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-amber-200 dark:shadow-amber-900/50">
            {t("locations.ctaBtn")}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1" />
          </button>
        </a>
      </div>
    </section>
  );
}
