"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, MapPin, Search } from "lucide-react";

import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import type { Location } from "@/lib/types";

interface TeamLocationPickerProps {
  value: string;
  selectedLocation: Location | null;
  locations: Location[];
  loading: boolean;
  error: boolean;
  onSearch: (query: string) => void;
  onRetry: () => void;
  onSelect: (locationId: string) => void;
}

export function TeamLocationPicker({
  value,
  selectedLocation,
  locations,
  loading,
  error,
  onSearch,
  onRetry,
  onSelect,
}: TeamLocationPickerProps) {
  const { t } = useI18n(["teams"]);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const close = React.useCallback((restoreFocus = false) => {
    setOpen(false);
    setQuery("");
    setHighlightIndex(-1);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [close, open]);

  React.useEffect(() => {
    if (highlightIndex < 0) return;
    const option = listRef.current?.children[highlightIndex] as HTMLElement | undefined;
    option?.scrollIntoView?.({ block: "nearest" });
  }, [highlightIndex]);

  const selectLocation = (locationId: string) => {
    onSelect(locationId);
    close(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) =>
        current < locations.length - 1 ? current + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) =>
        current > 0 ? current - 1 : locations.length - 1,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (highlightIndex >= 0) {
        const location = locations[highlightIndex];
        if (location) selectLocation(location.id);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name="locationId" value={value} />
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        data-testid="create-team-location"
        aria-label={t("teams.formLabel.location")}
        aria-required="true"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="create-team-location-options"
        onClick={() => {
          if (open) {
            close();
            return;
          }
          setQuery("");
          onSearch("");
          setOpen(true);
          setHighlightIndex(-1);
        }}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-xl border bg-muted px-4 text-left text-sm text-foreground",
          "transition-[background-color,border-color,box-shadow] duration-200",
          "hover:border-primary/50 focus-visible:outline-none focus-visible:border-primary focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-primary/10",
        )}
      >
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className={cn("min-w-0 flex-1 truncate", !selectedLocation && "text-muted-foreground")}>
          {selectedLocation?.name ?? t("teams.formPlaceholder.location")}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-xl shadow-stone-950/10">
          <label className="flex min-h-11 items-center gap-2 rounded-xl bg-muted px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{t("teams.locationSearchLabel")}</span>
            <input
              ref={searchRef}
              type="search"
              data-testid="create-team-location-search"
              maxLength={100}
              value={query}
              aria-label={t("teams.locationSearchLabel")}
              aria-controls="create-team-location-options"
              aria-activedescendant={
                highlightIndex >= 0
                  ? `create-team-location-option-${locations[highlightIndex]?.id}`
                  : undefined
              }
              aria-autocomplete="list"
              placeholder={t("teams.locationSearchPlaceholder")}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                setHighlightIndex(-1);
                onSearch(nextQuery);
              }}
              onKeyDown={handleKeyDown}
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
            />
            {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />}
          </label>

          <div
            ref={listRef}
            id="create-team-location-options"
            role="listbox"
            aria-label={t("teams.locationResultsLabel")}
            className="mt-2 max-h-64 overflow-y-auto overscroll-contain py-1"
          >
            {loading ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground" role="status">
                {t("teams.locationsLoading")}
              </p>
            ) : error ? (
              <div className="px-3 py-6 text-center">
                <p className="text-sm text-muted-foreground" role="alert">
                  {t("teams.locationsLoadError")}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 min-h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {t("teams.retry")}
                </button>
              </div>
            ) : locations.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground" role="status">
                {t("teams.locationNoResults")}
              </p>
            ) : (
              locations.map((location, index) => {
                const selected = location.id === value;
                return (
                  <button
                    key={location.id}
                    id={`create-team-location-option-${location.id}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectLocation(location.id)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors duration-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                      selected || index === highlightIndex
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{location.name}</span>
                      {location.region?.name && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {location.region.name}
                        </span>
                      )}
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
