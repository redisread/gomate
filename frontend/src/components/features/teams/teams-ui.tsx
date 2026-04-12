import * as React from "react";
import {
  Users, Mountain, UserCircle, ChevronRight, Flame, Lock,
  Flag, CheckCircle2, MapPin, Calendar, Clock, Filter,
  CalendarDays, Tag, X, Search,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";
import {
  DIFFICULTY_CONFIG, DIFFICULTY_OPTIONS,
  getCardGradient, getProgressGradient,
} from "@/lib/constants";
import { statusConfig } from "./constants";

// ─── MemberProgress ────────────────────────────────────────────────
export function MemberProgress({ current, max, showUrgency = true }: { current: number; max: number; showUrgency?: boolean }) {
  const pct = Math.min((current / max) * 100, 100);
  const remaining = max - current;
  const isFull = current >= max;
  const isUrgent = remaining <= 2 && !isFull;
  const isWarning = remaining <= 3 && !isFull;

  const getUrgencyStyle = () => {
    if (isFull) return { text: "text-stone-400 dark:text-stone-500", badge: "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400", label: "已满员" };
    if (isUrgent) return { text: "text-red-600", badge: "bg-red-50 text-red-600 ring-1 ring-red-200", label: `🔥 即将满员 仅剩 ${remaining} 人！` };
    if (isWarning) return { text: "text-amber-600", badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", label: `仅剩 ${remaining} 个名额！` };
    return { text: "text-amber-600", badge: "bg-amber-50/50 text-amber-700", label: `还剩 ${remaining} 个名额` };
  };

  const style = getUrgencyStyle();

  return (
    <div className="space-y-2">
      {showUrgency && (
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold", style.text)}>
            {isFull ? (
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{current}/{max} 人</span>
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
  const cfg = statusConfig[status] ?? {
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
export function TeamCard({ team }: { team: Team }) {
  const location = (team as any).location;
  const diff = location?.difficulty ? DIFFICULTY_CONFIG[location.difficulty as keyof typeof DIFFICULTY_CONFIG] : null;
  const leaderName = team.leader?.nickname || team.leader?.name || "领队";
  const gradient = getCardGradient(team.id);

  return (
    <a href={`/teams/${team.id}`} className="group block">
      <article className={cn("bg-card rounded-3xl border border-border overflow-hidden transition-all duration-300 hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-100/40 dark:hover:border-amber-800 dark:hover:shadow-amber-900/20 hover:-translate-y-1.5")}>
        <div className="relative h-40 overflow-hidden">
          {location?.coverImage ? (
            <img src={location.coverImage} alt={location.name ?? "封面"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", gradient)}>
              <Mountain className="h-10 w-10 text-white/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 right-3"><StatusBadge status={team.status} /></div>
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
          <div className="mb-3"><MemberProgress current={team.currentMembers} max={team.maxMembers} /></div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 min-w-0">
              {team.leader?.avatar ? (
                <img src={team.leader.avatar} alt={leaderName} className="w-5 h-5 rounded-full object-cover ring-1 ring-stone-100 dark:ring-stone-700" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center"><UserCircle className="h-4 w-4 text-stone-400 dark:text-stone-500" /></div>
              )}
              <span className="text-xs text-stone-400 dark:text-stone-500 truncate">{leaderName}</span>
            </div>
            <span className="text-xs text-stone-400 dark:text-stone-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-0.5">
              详情<ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </article>
    </a>
  );
}

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
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-stone-100 dark:bg-stone-800/80" />
        <div className="absolute inset-3 rounded-full bg-stone-100 dark:bg-stone-800" />
        <div className="absolute inset-6 rounded-full bg-stone-200 dark:bg-stone-700/60" />
        <Mountain className="relative h-10 w-10 text-stone-400 dark:text-stone-500 z-10" />
      </div>
      <h3 className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-2">{copy.teams.noResults}</h3>
      <p className="text-stone-400 dark:text-stone-500 text-sm text-center max-w-xs leading-relaxed mb-6">{copy.teams.noResultsTip}</p>
      <div className="flex items-center gap-3">
        <button onClick={onClear} className="px-5 py-2.5 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 text-stone-600 dark:text-stone-400 rounded-full text-sm font-medium transition-colors">
          {copy.teams.clearFilters}
        </button>
        <a href="/teams/create">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-colors">
            <Flame className="h-4 w-4" />{copy.teams.createBtn}
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
  onDateQuickSelect: (type: string) => void;
  onDifficultyToggle: (id: string) => void;
  onTagToggle: (tagId: string) => void;
  onClearAll: () => void;
}

export function FilterPanel({
  startDate, endDate, selectedDifficulty, availableTags, selectedTags, activeFiltersCount,
  onDateQuickSelect, onDifficultyToggle, onTagToggle, onClearAll,
}: FilterPanelProps) {
  return (
    <div className="mt-4 pt-4 pb-1 border-t border-border space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div>
        <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 mb-2 block flex items-center gap-2"><CalendarDays className="h-4 w-4" />{copy.filter.dateRange}</span>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "today", label: copy.filter.dateQuickToday },
            { key: "tomorrow", label: copy.filter.dateQuickTomorrow },
            { key: "weekend", label: copy.filter.dateQuickWeekend },
            { key: "7days", label: copy.filter.dateQuick7Days },
          ].map((opt) => (
            <button key={opt.key} onClick={() => onDateQuickSelect(opt.key)}
              className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-stone-600 dark:text-stone-400 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 transition-colors">
              {opt.label}
            </button>
          ))}
          {(startDate || endDate) && (
            <button onClick={() => onDateQuickSelect("clear")}
              className="px-3 py-1.5 text-xs rounded-full border border-border text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
              清除
            </button>
          )}
        </div>
      </div>
      <div>
        <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 mb-2 block">{copy.filter.difficulty}</span>
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
          <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 mb-2 block flex items-center gap-2"><Tag className="h-4 w-4" />{copy.filter.tags}</span>
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
          <X className="h-3.5 w-3.5" />{copy.filter.clearAll}
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
  return (
    <section className="relative pt-20 pb-6 border-b border-border bg-card">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{copy.teams.pageTitle}</h1>
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
          <input type="text" placeholder="搜索地点或关键词" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} aria-label="搜索队伍"
            className={cn("w-full pl-12 pr-10 py-3 rounded-xl text-foreground placeholder-muted-foreground bg-muted border border-border transition-all duration-200 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15")}
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} aria-label="清除搜索" className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
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
  return (
    <div className="relative mt-16 text-center rounded-3xl border border-border/80 p-10 overflow-hidden bg-gradient-to-br from-amber-50/60 dark:from-amber-950/20 via-card dark:via-card to-amber-50/40 dark:to-amber-950/10">
      <svg className="absolute right-0 bottom-0 opacity-[0.06] w-64 h-32 pointer-events-none" viewBox="0 0 256 128" aria-hidden="true">
        <path d="M0,128 L50,50 L100,90 L160,20 L210,70 L256,40 L256,128 Z" fill="currentColor" className="text-amber-700" />
      </svg>
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5"><Mountain className="h-7 w-7 text-amber-600" /></div>
        <h2 className="text-2xl font-bold text-foreground mb-3">{copy.teams.ctaTitle}</h2>
        <p className="text-stone-500 dark:text-stone-400 mb-7 max-w-sm mx-auto leading-relaxed">{copy.teams.ctaDesc}</p>
        <a href="/teams/create">
          <button className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-3.5 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-amber-200/60">
            <Flame className="h-4 w-4" />{copy.teams.createBtn}
          </button>
        </a>
      </div>
    </div>
  );
}
