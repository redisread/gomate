import * as React from "react";
import { CalendarDays, Check, ChevronDown, MapPin, Search } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/types";
import { getQuickCities, TEAM_DATE_OPTIONS } from "./teams-filter-options";

const QUICK_CITY_LIMIT = 6;

interface TeamsQuickFiltersProps {
  cities: City[];
  selectedCityId: string;
  activeDateQuickType: string | null;
  hasDateFilter: boolean;
  citiesLoading: boolean;
  citiesError: boolean;
  onCitySelect: (cityId: string) => void;
  onDateQuickSelect: (type: string) => void;
  onRetryCities: () => void;
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

function CityPicker({
  cities,
  selectedCityId,
  citiesLoading,
  citiesError,
  onCitySelect,
  onRetryCities,
}: Pick<TeamsQuickFiltersProps, "cities" | "selectedCityId" | "citiesLoading" | "citiesError" | "onCitySelect" | "onRetryCities">) {
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

  const filteredCities = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return cities;
    return cities.filter((city) =>
      city.name.includes(keyword)
      || city.pinyin?.toLowerCase().includes(keyword)
      || city.province?.includes(keyword),
    );
  }, [cities, query]);

  React.useEffect(() => {
    if (highlightIndex < 0) return;
    const option = listRef.current?.children[highlightIndex] as HTMLElement | undefined;
    option?.scrollIntoView?.({ block: "nearest" });
  }, [highlightIndex]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) => current < filteredCities.length - 1 ? current + 1 : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => current > 0 ? current - 1 : filteredCities.length - 1);
    } else if (event.key === "Enter" && highlightIndex >= 0) {
      event.preventDefault();
      const city = filteredCities[highlightIndex];
      if (city) {
        onCitySelect(city.id);
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
        aria-controls="teams-city-picker"
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
          id="teams-city-picker"
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
          {citiesLoading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("teams.citiesLoading")}</p>
          ) : citiesError ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">{t("teams.citiesLoadError")}</p>
              <button type="button" onClick={onRetryCities} className="mt-3 min-h-10 rounded-full bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                {t("teams.retry")}
              </button>
            </div>
          ) : (
            <div ref={listRef} role="listbox" aria-label={t("common.cityList")} className="mt-2 max-h-64 overflow-y-auto overscroll-contain py-1">
              {filteredCities.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("common.noCitiesFound")}</p>
              ) : filteredCities.map((city, index) => {
              const selected = city.id === selectedCityId;
              return (
                <button
                  key={city.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onCitySelect(city.id);
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
                    <span className="font-medium">{city.name}</span>
                    {city.province && <span className="ml-2 text-xs text-muted-foreground">{city.province}</span>}
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
  cities,
  selectedCityId,
  activeDateQuickType,
  hasDateFilter,
  citiesLoading,
  citiesError,
  onCitySelect,
  onDateQuickSelect,
  onRetryCities,
}: TeamsQuickFiltersProps) {
  const { t } = useI18n(["teams", "filter"]);
  const hotCities = React.useMemo(() => getQuickCities(cities, QUICK_CITY_LIMIT), [cities]);
  const selectedCity = cities.find((city) => city.id === selectedCityId);
  const quickCities = selectedCity && !hotCities.some((city) => city.id === selectedCity.id)
    ? [...hotCities.slice(0, QUICK_CITY_LIMIT - 1), selectedCity]
    : hotCities;

  return (
    <div className="mt-5 space-y-4" aria-label={t("teams.quickFiltersLabel")}>
      <div role="group" aria-label={t("filter.city")} className="grid gap-2.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="h-4 w-4 text-amber-600" aria-hidden="true" />
          {t("teams.departureCity")}
        </p>
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <QuickChip selected={!selectedCityId} onClick={() => onCitySelect("")}>{t("teams.allCities")}</QuickChip>
            {quickCities.map((city) => (
              <QuickChip key={city.id} selected={selectedCityId === city.id} onClick={() => onCitySelect(city.id)}>
                {city.name}
              </QuickChip>
            ))}
          </div>
          {(citiesLoading || citiesError || cities.length > quickCities.length) && (
            <CityPicker
              cities={cities}
              selectedCityId={selectedCityId}
              citiesLoading={citiesLoading}
              citiesError={citiesError}
              onCitySelect={onCitySelect}
              onRetryCities={onRetryCities}
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
