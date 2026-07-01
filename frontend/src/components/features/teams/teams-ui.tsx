import * as React from "react";
import {
  Users, Mountain, ChevronRight, Flame, MapPin, Calendar, Clock, Filter,
  CalendarDays, Tag, X, Search, Sparkles, ArrowRight, CheckCircle, Zap, Shield,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";
import {
  DIFFICULTY_CONFIG, DIFFICULTY_OPTIONS,
  getCardGradient, getProgressGradient,
} from "@/lib/constants";
import { getStatusConfig, getDaysUntilStart } from "./constants";
import { TeamUrgencyLabel, TeamProgress, TeamLeaderMini } from "./shared";

// ─── MemberProgress ────────────────────────────────────────────────
export function MemberProgress({ current, max, showUrgency = true }: { current: number; max: number; showUrgency?: boolean }) {
  const { t } = useI18n(["teams", "filter", "common"]);
  const pct = Math.min((current / max) * 100, 100);
  const remaining = max - current;
  const isFull = current >= max;
  const isUrgent = remaining <= 2 && !isFull;
  const isWarning = remaining <= 3 && !isFull;

  const getUrgencyStyle = () => {
    if (isFull) return { text: "text-stone-400 dark:text-stone-500", badge: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400", label: t("teams.memberFull", { current, max }) };
    if (isUrgent) return { text: "text-red-600", badge: "bg-red-50 text-red-600 ring-1 ring-red-200", label: t("teams.spotsOneLeft") };
    if (isWarning) return { text: "text-amber-600", badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", label: t("teams.spotsLeft", { count: remaining }) };
    return { text: "text-amber-600", badge: "bg-amber-50/50 text-amber-700", label: t("teams.spotsLeft", { count: remaining }) };
  };

  const style = getUrgencyStyle();

  return (
    <div className="space-y-2">
      {showUrgency && (
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold", style.text)}>
            {isFull ? (
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{style.label}</span>
            ) : (
              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs", style.badge)}>
                {isUrgent && <span className="animate-pulse">🔥</span>}
                {style.label}
              </span>
            )}
          </span>
          {!isFull && <span className="text-xs text-stone-400 dark:text-stone-500">{current}/{max}</span>}
        </div>
      )}
      <div className={cn("bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden", isUrgent ? "h-2.5" : "h-2")}>
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", isUrgent && "animate-pulse")}
          style={{ width: `${pct}%`, background: getProgressGradient(pct), boxShadow: isUrgent ? "0 0 8px rgba(239, 68, 68, 0.4)" : undefined }}
        />
      </div>
    </div>
  );
}

// ─── StatusBadge ────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n(["teams", "filter", "common"]);
  const statusCfg = getStatusConfig(t);
  const cfg = statusCfg[status] ?? {
    label: status, dotColor: "bg-stone-400", bgColor: "bg-stone-100 dark:bg-stone-800",
    textColor: "text-stone-500 dark:text-stone-400", pulse: false,
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", cfg.bgColor, cfg.textColor)}>
      {cfg.icon ? cfg.icon : (
        <span className="relative flex h-2 w-2">
          {cfg.pulse && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", cfg.dotColor)} />}
          <span className={cn("relative inline-flex rounded-full h-2 w-2", cfg.dotColor)} />
        </span>
      )}
      {cfg.label}
    </span>
  );
}

// ─── TeamCard ───────────────────────────────────────────────────────
export const TeamCard = React.memo(function TeamCard({ team }: { team: Team }) {
  const { t } = useI18n(["teams", "filter", "common"]);
  const location = team.location;
  const diff = location?.difficulty ? DIFFICULTY_CONFIG[location.difficulty as keyof typeof DIFFICULTY_CONFIG] : null;
  const gradient = getCardGradient(team.id);
  const _daysInfo = location?.startDate ? getDaysUntilStart(t, location.startDate) : null;

  return (
    <a href={`/teams/${team.id}`} className="group block">
      <article className={cn("bg-card rounded-3xl border border-border overflow-hidden transition-all duration-300 hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-100/40 dark:hover:border-amber-800 dark:hover:shadow-amber-900/20 hover:-translate-y-1.5")}>
        <div className="relative h-40 overflow-hidden">
          {location?.coverImage ? (
            <img src={location.coverImage} alt={location.name ?? t('common.unknown')} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", gradient)}>
              <Mountain className="h-10 w-10 text-white/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 right-3">
            <TeamUrgencyLabel
              status={team.status}
              currentMembers={team.currentMembers}
              maxMembers={team.maxMembers}
              date={team.date}
              variant="badge"
            />
          </div>
        </div>
        <div className="p-4">
          {location?.name && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">
                {location.name}
                {diff && <span className="text-muted-foreground font-normal"><span className="mx-1">·</span>{diff.emoji} {diff.label}</span>}
              </span>
            </div>
          )}
          <h3 className="font-medium text-stone-700 dark:text-stone-300 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug text-sm mb-2">{team.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-3">
            <span className="flex items-center gap-1 bg-stone-50 dark:bg-stone-800 px-2 py-0.5 rounded-full"><Calendar className="h-3 w-3" />{team.date}</span>
            {team.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{team.time}</span>}
          </div>
          <div className="mb-3">
            <TeamProgress
              current={team.currentMembers}
              max={team.maxMembers}
              status={team.status}
              showLabel={true}
              size="md"
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <TeamLeaderMini leader={team.leader} size="sm" />
            <span className="text-xs text-stone-400 dark:text-stone-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-0.5">
              {t("teams.viewDetailShort")}<ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </article>
    </a>
  );
});

// ─── TeamSkeleton ───────────────────────────────────────────────────
export function TeamSkeleton() {
  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden">
      <div className="skeleton h-40 rounded-none" />
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-4 rounded-full w-3/4" />
        <div className="skeleton h-3.5 rounded-full w-full" />
        <div className="skeleton h-3 rounded-full w-1/2" />
        <div className="skeleton h-2 rounded-full w-full" />
        <div className="flex justify-between items-center pt-1">
          <div className="skeleton h-3.5 rounded-full w-20" />
          <div className="skeleton h-3.5 rounded-full w-12" />
        </div>
      </div>
    </div>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────
export function EmptyState({ onClear }: { onClear: () => void }) {
  const { t } = useI18n(["teams", "filter", "common"]);
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-stone-100 dark:bg-stone-800/80" />
        <div className="absolute inset-3 rounded-full bg-stone-100 dark:bg-stone-800" />
        <div className="absolute inset-6 rounded-full bg-stone-200 dark:bg-stone-700/60" />
        <Mountain className="relative h-10 w-10 text-stone-400 dark:text-stone-500 z-10" />
      </div>
      <h3 className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-2">{t("teams.noResults")}</h3>
      <p className="text-stone-400 dark:text-stone-500 text-sm text-center max-w-xs leading-relaxed mb-6">{t("teams.noResultsTip")}</p>
      <div className="flex items-center gap-3">
        <button onClick={onClear} className="px-5 py-2.5 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 text-stone-600 dark:text-stone-400 rounded-full text-sm font-medium transition-colors">
          {t("teams.clearFilters")}
        </button>
        <a href="/teams/create">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors">
            <Flame className="h-4 w-4" />{t("teams.createBtn")}
          </button>
        </a>
      </div>
    </div>
  );
}

// ─── Pagination ─────────────────────────────────────────────────────
export function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex justify-center items-center gap-2 mt-12">
      {Array.from({ length: total }, (_, i) => i + 1).map((page) => (
        <button key={page} onClick={() => onChange(page)} aria-current={page === current ? "page" : undefined}
          className={cn("w-10 h-10 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105",
            page === current ? "bg-amber-600 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30" : "bg-card text-stone-500 dark:text-stone-400 border border-border hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400"
          )}>
          {page}
        </button>
      ))}
    </div>
  );
}

// ─── FilterPanel ────────────────────────────────────────────────────
interface FilterPanelProps {
  startDate: string;
  endDate: string;
  selectedDifficulty: string[];
  availableTags: { id: string; name: string }[];
  selectedTags: string[];
  activeFiltersCount: number;
  activeDateQuickType: string | null;
  onDateQuickSelect: (type: string) => void;
  onDifficultyToggle: (id: string) => void;
  onTagToggle: (tagId: string) => void;
  onClearAll: () => void;
}

export function FilterPanel({
  startDate, endDate, selectedDifficulty, availableTags, selectedTags, activeFiltersCount, activeDateQuickType,
  onDateQuickSelect, onDifficultyToggle, onTagToggle, onClearAll,
}: FilterPanelProps) {
  const { t } = useI18n(["teams", "filter", "common"]);
  return (
    <div className="mt-4 pt-4 pb-1 border-t border-border space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div>
        <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 mb-2 block flex items-center gap-2"><CalendarDays className="h-4 w-4" />{t("filter.dateRange")}</span>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "today", label: t("filter.dateQuickToday") },
            { key: "tomorrow", label: t("filter.dateQuickTomorrow") },
            { key: "weekend", label: t("filter.dateQuickWeekend") },
            { key: "7days", label: t("filter.dateQuick7Days") },
          ].map((opt) => {
            const isSelected = activeDateQuickType === opt.key;
            return (
              <button key={opt.key} onClick={() => onDateQuickSelect(opt.key)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full border transition-all duration-200",
                  isSelected
                    ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                    : "border-border bg-card text-stone-600 dark:text-stone-400 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400"
                )}>
                {opt.label}
              </button>
            );
          })}
          {(startDate || endDate) && (
            <button onClick={() => onDateQuickSelect("clear")}
              className="px-3 py-1.5 text-xs rounded-full border border-border text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
              {t("filter.clearBtn")}
            </button>
          )}
        </div>
      </div>
      <div>
        <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 mb-2 block">{t("filter.difficulty")}</span>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const isSelected = selectedDifficulty.includes(opt.id);
            return (
              <button key={opt.id} onClick={() => onDifficultyToggle(opt.id)}
                className={cn("px-3 py-1.5 text-xs rounded-full border transition-all duration-200 active:scale-95",
                  isSelected ? opt.activeColor : "bg-card text-stone-600 dark:text-stone-400 border-border hover:border-stone-300 dark:hover:border-stone-600"
                )}>
                {opt.emoji} {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      {availableTags.length > 0 && (
        <div>
          <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 mb-2 block flex items-center gap-2"><Tag className="h-4 w-4" />{t("filter.tags")}</span>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button key={tag.id} onClick={() => onTagToggle(tag.id)}
                  className={cn("px-3 py-1.5 text-xs rounded-full border transition-all duration-200",
                    isSelected ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-300" : "bg-card text-stone-600 dark:text-stone-400 border-border hover:border-stone-300 dark:hover:border-stone-600"
                  )}>
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {activeFiltersCount > 0 && (
        <button onClick={onClearAll} className="text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center gap-1.5">
          <X className="h-3.5 w-3.5" />{t("filter.clearAll")}
        </button>
      )}
    </div>
  );
}

// ─── TeamsHeader ────────────────────────────────────────────────────
interface TeamsHeaderProps {
  searchQuery: string;
  showFilters: boolean;
  activeFiltersCount: number;
  isLoading: boolean;
  pagination: { total: number };
  onSearchChange: (q: string) => void;
  onToggleFilters: () => void;
  renderFilterPanel: () => React.ReactNode;
}

export function TeamsHeader({
  searchQuery, showFilters, activeFiltersCount, isLoading, pagination,
  onSearchChange, onToggleFilters, renderFilterPanel,
}: TeamsHeaderProps) {
  const { t } = useI18n(["teams", "filter", "common"]);
  return (
    <section className="relative pt-20 pb-6 border-b border-border bg-card">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("teams.pageTitle")}</h1>
            {!isLoading && pagination.total > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{pagination.total}</span>
            )}
          </div>
          <button onClick={onToggleFilters} aria-expanded={showFilters}
            className={cn("relative flex items-center justify-center w-10 h-10 border rounded-xl transition-all duration-200",
              showFilters || activeFiltersCount > 0 ? "bg-amber-50 border-amber-300 text-amber-700 shadow-sm" : "bg-card border-border text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600"
            )}>
            <Filter className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{activeFiltersCount}</span>
            )}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder={t("teams.searchPlaceholder")} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} aria-label={t("teams.searchAriaLabel")}
            className={cn("w-full pl-12 pr-10 py-3 rounded-xl text-foreground placeholder-muted-foreground bg-muted border border-border transition-all duration-200 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15")}
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} aria-label={t("teams.clearSearchAriaLabel")} className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
              <X className="h-4 w-4 text-stone-400 dark:text-stone-500" />
            </button>
          )}
        </div>
        {showFilters && renderFilterPanel()}
      </div>
    </section>
  );
}

// ─── TeamsCtaSection ────────────────────────────────────────────────
export function TeamsCtaSection() {
  const { t } = useI18n(["teams", "filter", "common"]);
  return (
    <section className="relative mt-16 py-16 lg:py-20 overflow-hidden bg-gradient-to-b from-amber-50/50 via-stone-50/80 to-orange-50/30 dark:from-amber-950/20 dark:via-stone-950/80 dark:to-orange-950/10">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl border border-amber-200/50 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm shadow-warm-sm overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-100/40 blur-3xl translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-orange-100/30 blur-3xl -translate-x-1/4 translate-y-1/4" />
          </div>

          <div className="relative px-8 py-12 sm:px-12 sm:py-14 lg:px-16 lg:py-16">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
              {/* Left: Text Content */}
              <div className="flex-1 text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 text-orange-800 text-sm font-medium mb-5 border border-orange-200/60">
                  <Users className="w-4 h-4" />
                  <span>{t("teams.ctaBadge")}</span>
                </div>

                {/* Title */}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight">
                  {t("teams.ctaTitle")}
                </h2>

                {/* Description */}
                <p className="text-base sm:text-lg text-stone-500 dark:text-stone-400 mb-7 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                  {t("teams.ctaDesc")}
                </p>

                {/* Button Group */}
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                  <a href="/teams/create" className="group">
                    <button className="inline-flex items-center gap-2 bg-orange-600 text-white px-7 py-3.5 rounded-2xl text-base font-semibold transition-all duration-200 hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-200/40 active:scale-[0.98]">
                      <Sparkles className="w-5 h-5" />
                      {t("teams.createBtn")}
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </button>
                  </a>
                  <a href="/locations" className="text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-400 text-base font-medium transition-colors inline-flex items-center gap-1.5">
                    {t("teams.exploreLink")}
                  </a>
                </div>
              </div>

              {/* Right: Visual Element — simplified circular icon */}
              <div className="flex-shrink-0 relative">
                <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-orange-200/60" />
                  {/* Inner circle */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shadow-warm-md">
                    <Users className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600" />
                  </div>
                  {/* Small decorative dots */}
                  <div className="absolute top-2 right-6 w-3 h-3 rounded-full bg-orange-300/60" />
                  <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-amber-300/50" />
                  <div className="absolute top-8 left-2 w-2.5 h-2.5 rounded-full bg-orange-200/70" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-stone-500 dark:text-stone-400 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>{t("teams.ctaTrust1")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>{t("teams.ctaTrust2")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span>{t("teams.ctaTrust3")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
