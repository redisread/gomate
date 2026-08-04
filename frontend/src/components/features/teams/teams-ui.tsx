import * as React from "react";
import {
  Users, Mountain, ChevronRight, Flame, MapPin, Calendar, Clock, Filter,
  CalendarDays, Tag, X, Search,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";
import {
  DIFFICULTY_CONFIG, DIFFICULTY_OPTIONS,
  getCardGradient, getProgressGradient,
} from "@/lib/constants";
import { getStatusConfig } from "./constants";
import { TeamProgress, TeamLeaderMini } from "./shared";

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
          className={cn("h-full rounded-full transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-700 ease-out", isUrgent && "animate-pulse")}
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
  const { t } = useI18n(["teams", "filter", "common", "enums"]);
  const location = team.location;
  const diff = location?.difficulty ? DIFFICULTY_CONFIG[location.difficulty as keyof typeof DIFFICULTY_CONFIG] : null;
  const gradient = getCardGradient(team.id);

  return (
    <li className="h-full list-none">
      <a
        href={`/teams/${team.id}`}
        className="group block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      >
        <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-amber-800 dark:hover:shadow-amber-900/20">
        <div className="relative h-36 overflow-hidden">
          {location?.coverImage ? (
            <img
              src={location.coverImage}
              alt={location.name ?? t("common.unknown")}
              loading="lazy"
              className="h-full w-full object-cover outline outline-1 outline-black/10 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 dark:outline-white/10"
            />
          ) : (
            <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br", gradient)}>
              <Mountain className="h-9 w-9 text-white/40" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="flex flex-1 flex-col p-4">
          {location?.name && (
            <div className="mb-1.5 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" aria-hidden="true" />
              <span className="truncate text-xs font-semibold text-foreground">
                {location.name}
                {diff && <span className="text-muted-foreground font-normal"><span className="mx-1">·</span>{t(diff.labelKey)}</span>}
              </span>
            </div>
          )}
          <h3 className="mb-3 line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-amber-700 dark:group-hover:text-amber-400">{team.title}</h3>
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {team.date}
            </span>
            {team.time && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {team.time}
              </span>
            )}
          </div>
          <div className="mt-auto">
            <TeamProgress
              current={team.currentMembers}
              max={team.maxMembers}
              status={team.status}
              showLabel={true}
              size="sm"
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
            <TeamLeaderMini leader={team.leader} size="sm" />
            <span className="flex items-center text-muted-foreground transition-[color,transform] duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 group-hover:text-amber-600 dark:group-hover:text-amber-400" aria-hidden="true">
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
        </article>
      </a>
    </li>
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
export function EmptyState({ onClear, hasActiveCriteria }: { onClear: () => void; hasActiveCriteria: boolean }) {
  const { t } = useI18n(["teams", "filter", "common"]);
  return (
    <div role="status" className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Mountain className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{t("teams.noResults")}</h3>
      <p className="mb-6 max-w-xs text-sm leading-relaxed text-muted-foreground">{t("teams.noResultsTip")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {hasActiveCriteria && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-muted-foreground transition-[background-color,border-color,color,transform] duration-150 hover:border-amber-300 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96]"
          >
            {t("teams.clearFilters")}
          </button>
        )}
        <a
          href="/teams/create"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-600 px-5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-150 hover:bg-amber-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96]"
        >
          <Flame className="h-4 w-4" aria-hidden="true" />
          {t("teams.createBtn")}
        </a>
      </div>
    </div>
  );
}

// ─── Pagination ─────────────────────────────────────────────────────
export function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
  const { t } = useI18n(["teams"]);
  if (total <= 1) return null;
  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label={t("teams.paginationLabel")}>
      {Array.from({ length: total }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onChange(page)}
          aria-current={page === current ? "page" : undefined}
          aria-label={t("teams.pageLabel", { page })}
          className={cn("h-10 w-10 rounded-full text-sm font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96]",
            page === current ? "bg-amber-600 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30" : "bg-card text-stone-500 dark:text-stone-400 border border-border hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400"
          )}>
          {page}
        </button>
      ))}
    </nav>
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
  const { t } = useI18n(["teams", "filter", "common", "enums"]);
  return (
    <div id="team-filter-panel" role="region" aria-label={t("filter.title")} className="mt-4 space-y-5 border-t border-border pt-4 pb-1 animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
      <div>
        <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-300"><CalendarDays className="h-4 w-4" aria-hidden="true" />{t("filter.dateRange")}</span>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "today", label: t("filter.dateQuickToday") },
            { key: "tomorrow", label: t("filter.dateQuickTomorrow") },
            { key: "weekend", label: t("filter.dateQuickWeekend") },
            { key: "7days", label: t("filter.dateQuick7Days") },
          ].map((opt) => {
            const isSelected = activeDateQuickType === opt.key;
            return (
              <button key={opt.key} type="button" onClick={() => onDateQuickSelect(opt.key)} aria-pressed={isSelected}
                className={cn(
                  "min-h-10 rounded-full border px-3 text-xs transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96]",
                  isSelected
                    ? "bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                    : "border-border bg-card text-stone-600 dark:text-stone-400 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400"
                )}>
                {opt.label}
              </button>
            );
          })}
          {(startDate || endDate) && (
            <button type="button" onClick={() => onDateQuickSelect("clear")}
              className="min-h-10 rounded-full border border-border px-3 text-xs text-stone-400 transition-[background-color,border-color,color,transform] duration-150 hover:bg-muted hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96] dark:text-stone-500 dark:hover:text-stone-300">
              {t("filter.clearBtn")}
            </button>
          )}
        </div>
      </div>
      <div>
        <span className="mb-2 block text-sm font-semibold text-stone-600 dark:text-stone-300">{t("filter.difficulty")}</span>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const isSelected = selectedDifficulty.includes(opt.id);
            return (
              <button key={opt.id} type="button" onClick={() => onDifficultyToggle(opt.id)} aria-pressed={isSelected}
                className={cn("min-h-10 rounded-full border px-3 text-xs transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96]",
                  isSelected ? opt.activeColor : "bg-card text-stone-600 dark:text-stone-400 border-border hover:border-stone-300 dark:hover:border-stone-600"
                )}>
                {t(opt.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
      {availableTags.length > 0 && (
        <div>
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-300"><Tag className="h-4 w-4" aria-hidden="true" />{t("filter.tags")}</span>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button key={tag.id} type="button" onClick={() => onTagToggle(tag.id)} aria-pressed={isSelected}
                  className={cn("min-h-10 rounded-full border px-3 text-xs transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96]",
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
        <button type="button" onClick={onClearAll} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm text-stone-400 transition-[background-color,color,transform] duration-150 hover:bg-muted hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96] dark:text-stone-500 dark:hover:text-stone-300">
          <X className="h-3.5 w-3.5" aria-hidden="true" />{t("filter.clearAll")}
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
  onSearchChange: (q: string) => void;
  onToggleFilters: () => void;
  renderFilterPanel: () => React.ReactNode;
}

export function TeamsHeader({
  searchQuery, showFilters, activeFiltersCount,
  onSearchChange, onToggleFilters, renderFilterPanel,
}: TeamsHeaderProps) {
  const { t } = useI18n(["teams", "filter", "common"]);
  return (
    <section className="relative border-b border-border bg-card pb-6 pt-20">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("teams.pageTitle")}</h1>
          <button
            type="button"
            onClick={onToggleFilters}
            aria-label={t("filter.title")}
            aria-expanded={showFilters}
            aria-controls="team-filter-panel"
            className={cn("relative inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96]",
              showFilters || activeFiltersCount > 0 ? "bg-amber-50 border-amber-300 text-amber-700 shadow-sm" : "bg-card border-border text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600"
            )}>
            <Filter className="h-4 w-4" aria-hidden="true" />
            <span className="hidden text-sm font-medium sm:inline">{t("filter.title")}</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">{activeFiltersCount}</span>
            )}
          </button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="team-search" className="sr-only">{t("teams.searchAriaLabel")}</label>
          <input
            id="team-search"
            name="q"
            type="search"
            autoComplete="off"
            placeholder={t("teams.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn("w-full rounded-xl border border-border bg-muted py-3 pl-12 pr-12 text-foreground placeholder-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-400/15")}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={t("teams.clearSearchAriaLabel")}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 active:scale-[0.96] dark:hover:bg-stone-800"
            >
              <X className="h-4 w-4 text-stone-400 dark:text-stone-500" aria-hidden="true" />
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
    <section className="mt-14 border-t border-border pt-10">
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-muted/40 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="max-w-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
            {t("teams.ctaBadge")}
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {t("teams.ctaTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("teams.ctaDesc")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <a
            href="/teams/create"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-150 hover:bg-amber-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96]"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            {t("teams.createBtn")}
          </a>
          <a
            href="/locations"
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96]"
          >
            {t("teams.exploreLink")}
          </a>
        </div>
      </div>
    </section>
  );
}
