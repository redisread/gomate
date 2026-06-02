import * as React from "react";
import { Search, MapPin, X, ChevronDown, Sparkles, Compass, TreePine, Mountain, ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { getRoleConfig, type RoleKey, type RoleCfg } from "./constants";
import { LocationsHeroSkeleton } from "@/components/ui/skeleton";

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
  const { t, loading: i18nLoading } = useI18n(["locations"]);
  const cfg = getRoleConfig(t);
  const cityBtnRef = React.useRef<HTMLButtonElement>(null);
  const cityDropdownRef = React.useRef<HTMLDivElement>(null);
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
          <p className="text-stone-400 dark:text-stone-500 text-sm sm:text-base mb-7 leading-relaxed w-full max-w-xl text-center" style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 150ms both" }}>
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
              <button ref={cityBtnRef} type="button" data-city-btn
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
          <div ref={cityDropdownRef} data-city-dropdown className="fixed bg-popover border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg z-[9999] min-w-[140px] max-h-60 overflow-y-auto py-1 origin-top"
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
    <section className="relative py-16 lg:py-24 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 rounded-full bg-amber-400/10 dark:bg-amber-500/10 blur-[100px]" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 rounded-full bg-orange-400/8 dark:bg-orange-500/8 blur-[80px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Main CTA Card */}
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 dark:from-amber-600 dark:via-amber-700 dark:to-orange-700" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNjAgMEgwVjYwSDYwVjBaIiBmaWxsPSJ1cmwoI3ApIi8+PGRlZnM+PHBhdHRlcm4gaWQ9InAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgNjBWMHNNNjAgMFY2MCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjwvc3ZnPg==')] opacity-30" />

            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-white/5 blur-2xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-white/5 blur-3xl translate-x-1/4 translate-y-1/4" />

            {/* Mountain silhouette (decorative) */}
            <svg className="absolute bottom-0 left-0 right-0 w-full h-32 opacity-10" viewBox="0 0 1440 120" preserveAspectRatio="none">
              <path d="M0 120L240 60L480 100L720 40L960 90L1200 50L1440 80V120H0Z" fill="white"/>
            </svg>

            {/* Content */}
            <div className="relative px-8 py-14 sm:px-12 sm:py-18 lg:px-20 lg:py-20">
              <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                {/* Left: Text Content */}
                <div className="flex-1 text-center lg:text-left">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-white/90 text-sm font-medium mb-6 border border-white/20">
                    <Compass className="w-4 h-4" />
                    <span>{t("locations.ctaBadge")}</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                    {t("locations.ctaTitle")}
                  </h2>

                  {/* Description */}
                  <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                    {t("locations.ctaDesc")}
                  </p>

                  {/* Button Group */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                    <a href="/teams/create" className="group">
                      <button className="inline-flex items-center gap-2 bg-white text-amber-700 px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-1 active:scale-95">
                        <Sparkles className="w-5 h-5" />
                        {t("locations.ctaBtn")}
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </button>
                    </a>
                    <a href="/contact" className="text-white/80 hover:text-white text-base font-medium transition-colors inline-flex items-center gap-1.5 hover:underline underline-offset-4">
                      {t("locations.contactLink")}
                    </a>
                  </div>
                </div>

                {/* Right: Visual Element */}
                <div className="flex-shrink-0 relative">
                  {/* Floating cards stack effect */}
                  <div className="relative w-64 h-48 sm:w-80 sm:h-56">
                    {/* Back card */}
                    <div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 transform rotate-3 translate-x-3 translate-y-2" />
                    {/* Middle card */}
                    <div className="absolute inset-0 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 transform -rotate-2 -translate-x-2 translate-y-1" />
                    {/* Front card */}
                    <div className="absolute inset-0 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl shadow-black/10 flex flex-col items-center justify-center p-6">
                      <div className="w-16 h-16 rounded-2xl bg-white/90 flex items-center justify-center mb-4 shadow-lg">
                        <Mountain className="w-8 h-8 text-amber-600" />
                      </div>
                      <div className="text-white text-center">
                        <div className="text-lg font-bold mb-1">{t("locations.ctaCardTitle")}</div>
                        <div className="text-sm text-white/70">{t("locations.ctaCardDesc")}</div>
                      </div>
                    </div>

                    {/* Floating decorative icons */}
                    <div className="absolute -top-4 -right-4 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg animate-pulse" style={{ animationDuration: "3s" }}>
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute -bottom-2 -left-6 w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-lg animate-pulse" style={{ animationDuration: "4s", animationDelay: "1s" }}>
                      <TreePine className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust indicators below */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-stone-500 dark:text-stone-400 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <span>{t("locations.ctaTrust1")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <span>{t("locations.ctaTrust2")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              </div>
              <span>{t("locations.ctaTrust3")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
