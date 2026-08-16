import * as React from "react";
import { CalendarDays, Check, ChevronDown, MapPin, Search } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Region } from "@/lib/types";
import { getQuickRegions, TEAM_DATE_OPTIONS } from "./teams-filter-options";

const QUICK_REGION_LIMIT = 6;

interface TeamsQuickFiltersProps {
  regions: Region[];
  selectedRegionId: string;
  activeDateQuickType: string | null;
  hasDateFilter: boolean;
  regionsLoading: boolean;
  regionsError: boolean;
  onRegionSelect: (regionId: string) => void;
  onDateQuickSelect: (type: string) => void;
  onRetryRegions: () => void;
}

function QuickChip({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium",
        "transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.96]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
        selected
          ? "bg-amber-600 text-white shadow-sm shadow-amber-900/10 dark:bg-amber-500 dark:text-stone-950"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-100",
      )}
    >
      {children}
    </button>
  );
}

function RegionPicker({
  regions,
  selectedRegionId,
  regionsLoading,
  regionsError,
  onRegionSelect,
  onRetryRegions,
}: Pick<TeamsQuickFiltersProps, "regions" | "selectedRegionId" | "regionsLoading" | "regionsError" | "onRegionSelect" | "onRetryRegions">) {
  const { t } = useI18n(["teams", "common"]);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filteredRegions = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return regions;
    return regions.filter((region) =>
      region.name.includes(keyword)
      || region.nameEn?.toLowerCase().includes(keyword)
      || region.code?.toLowerCase().includes(keyword),
    );
  }, [regions, query]);

  React.useEffect(() => {
    if (highlightIndex < 0) return;
    const option = listRef.current?.children[highlightIndex] as HTMLElement | undefined;
    option?.scrollIntoView?.({ block: "nearest" });
  }, [highlightIndex]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) => current < filteredRegions.length - 1 ? current + 1 : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => current > 0 ? current - 1 : filteredRegions.length - 1);
    } else if (event.key === "Enter" && highlightIndex >= 0) {
      event.preventDefault();
      const region = filteredRegions[highlightIndex];
      if (region) {
        onRegionSelect(region.id);
        setOpen(false);
        setQuery("");
        setHighlightIndex(-1);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative shrink-0" onKeyDown={handleKeyDown}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="teams-region-picker"
        onClick={() => {
          setOpen((value) => !value);
          setHighlightIndex(-1);
        }}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-stone-100 px-3.5 text-sm font-medium text-stone-600 transition-[transform,background-color,color] duration-150 hover:bg-stone-200 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.96] dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-100"
      >
        {t("teams.moreCities")}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div
          id="teams-region-picker"
          className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-2xl bg-popover p-2 shadow-xl shadow-stone-950/10 ring-1 ring-stone-900/10 dark:ring-white/10"
        >
          <label className="flex min-h-11 items-center gap-2 rounded-xl bg-muted px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{t("teams.citySearchPlaceholder")}</span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlightIndex(-1);
              }}
              placeholder={t("teams.citySearchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          {regionsLoading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("teams.citiesLoading")}</p>
          ) : regionsError ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">{t("teams.citiesLoadError")}</p>
              <button type="button" onClick={onRetryRegions} className="mt-3 min-h-10 rounded-full bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                {t("teams.retry")}
              </button>
            </div>
          ) : (
            <div ref={listRef} role="listbox" aria-label={t("common.regionList")} className="mt-2 max-h-64 overflow-y-auto overscroll-contain py-1">
              {filteredRegions.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("common.noRegionsFound")}</p>
              ) : filteredRegions.map((region, index) => {
              const selected = region.id === selectedRegionId;
              return (
                <button
                  key={region.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onRegionSelect(region.id);
                    setOpen(false);
                    setQuery("");
                    setHighlightIndex(-1);
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-[background-color,color] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500",
                    selected || index === highlightIndex ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "text-foreground hover:bg-muted",
                  )}
                >
                  <span className="min-w-0">
                    <span className="font-medium">{region.name}</span>
                    {region.nameEn && <span className="ml-2 text-xs text-muted-foreground">{region.nameEn}</span>}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />}
                </button>
              );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TeamsQuickFilters({
  regions,
  selectedRegionId,
  activeDateQuickType,
  hasDateFilter,
  regionsLoading,
  regionsError,
  onRegionSelect,
  onDateQuickSelect,
  onRetryRegions,
}: TeamsQuickFiltersProps) {
  const { t } = useI18n(["teams", "filter"]);
  const hotRegions = React.useMemo(() => getQuickRegions(regions, QUICK_REGION_LIMIT), [regions]);
  const selectedRegion = regions.find((region) => region.id === selectedRegionId);
  const quickRegions = selectedRegion && !hotRegions.some((region) => region.id === selectedRegion.id)
    ? [...hotRegions.slice(0, QUICK_REGION_LIMIT - 1), selectedRegion]
    : hotRegions;

  return (
    <div className="mt-5 space-y-4" aria-label={t("teams.quickFiltersLabel")}>
      <div role="group" aria-label={t("filter.city")} className="grid gap-2.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="h-4 w-4 text-amber-600" aria-hidden="true" />
          {t("teams.departureCity")}
        </p>
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <QuickChip selected={!selectedRegionId} onClick={() => onRegionSelect("")}>{t("teams.allCities")}</QuickChip>
            {quickRegions.map((region) => (
              <QuickChip key={region.id} selected={selectedRegionId === region.id} onClick={() => onRegionSelect(region.id)}>
                {region.name}
              </QuickChip>
            ))}
          </div>
          {(regionsLoading || regionsError || regions.length > quickRegions.length) && (
            <RegionPicker
              regions={regions}
              selectedRegionId={selectedRegionId}
              regionsLoading={regionsLoading}
              regionsError={regionsError}
              onRegionSelect={onRegionSelect}
              onRetryRegions={onRetryRegions}
            />
          )}
        </div>
      </div>

      <div role="group" aria-label={t("filter.dateRange")} className="grid gap-2.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-amber-600" aria-hidden="true" />
          {t("teams.departureTime")}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <QuickChip selected={!hasDateFilter} onClick={() => onDateQuickSelect("clear")}>{t("teams.anyTime")}</QuickChip>
          {TEAM_DATE_OPTIONS.map((option) => (
            <QuickChip
              key={option.key}
              selected={activeDateQuickType === option.key}
              onClick={() => onDateQuickSelect(activeDateQuickType === option.key ? "clear" : option.key)}
            >
              {t(option.labelKey)}
            </QuickChip>
          ))}
        </div>
      </div>
    </div>
  );
}
