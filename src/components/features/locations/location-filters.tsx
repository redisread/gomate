import { Card as SwCard } from "@/components/starwind-react/card";
import { Button as SwButton } from "@/components/starwind-react/button";
import * as React from "react";
import { Check, RotateCcw } from "lucide-react";
import type { Region } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { getQuickRegions, getRegionDisplayName } from "@/components/shared/quick-city-options";
import { CityPicker } from "./city-picker";

const chipClass = "relative inline-flex min-h-11 min-w-11 max-w-full shrink-0 items-center justify-center rounded-xl pl-6 pr-3 text-sm font-medium ring-1 ring-inset transition-[background-color,color,transform] duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:active:scale-100";
const chipState = (selected: boolean) => selected ? "bg-accent text-accent-foreground ring-primary/40" : "bg-card text-muted-foreground ring-border/60 hover:bg-muted hover:text-foreground";
const checkClass = "absolute left-2 size-3 shrink-0";

function FilterRail({ selectedKey, testId, children }: { selectedKey: string; testId?: string; children: React.ReactNode }) {
  const railRef = React.useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const measure = React.useCallback(() => {
    const rail = railRef.current;
    if (rail) setHasMore(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2);
  }, []);
  React.useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const selected = rail.querySelector<HTMLElement>('[data-selected="true"]');
    if (selected && window.matchMedia("(max-width: 639px)").matches) {
      rail.scrollLeft = Math.max(0, selected.offsetLeft - rail.offsetLeft - (rail.clientWidth - selected.offsetWidth) / 2);
    }
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [selectedKey, measure]);
  return (
    <div className="relative min-w-0 flex-1">
      <div ref={railRef} data-testid={testId} onScroll={measure} className="filter-rail flex gap-1.5 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible">{children}</div>
      {hasMore && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent sm:hidden" />}
    </div>
  );
}

export function LocationFilters({ regions, popularTags, selectedRegionId, selectedTags, showRegionDropdown, onRegionSelect, onTagToggle, onClear, onOpenChange }: {
  regions: Region[];
  popularTags: { id: string; name: string }[];
  selectedRegionId: string;
  selectedTags: string[];
  showRegionDropdown: boolean;
  onRegionSelect: (id: string) => void;
  onTagToggle: (id: string) => void;
  onClear: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n(["locations"]);
  const quickRegions = React.useMemo(() => {
    const hot = getQuickRegions(regions, 6);
    const selected = regions.find((region) => region.id === selectedRegionId);
    return selected && !hot.some((region) => region.id === selected.id) ? [...hot, selected] : hot;
  }, [regions, selectedRegionId]);
  const tags = React.useMemo(() => {
    const visible = popularTags.slice(0, 8);
    return [...visible, ...popularTags.filter((tag) => selectedTags.includes(tag.id) && !visible.some((item) => item.id === tag.id))];
  }, [popularTags, selectedTags]);
  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20" data-testid="locations-filters">
      <div className="px-3 py-2 sm:px-4 sm:py-3">
        <div role="group" aria-label={t("locations.cityLabel")} className="flex min-w-0 items-start gap-2">
          <span className="flex min-h-13 w-14 shrink-0 items-center text-xs font-semibold text-foreground/70">{t("locations.cityLabel")}</span>
          <FilterRail selectedKey={selectedRegionId} testId="locations-city-options">
            <SwButton variant="plain" size="inherit" type="button" aria-pressed={!selectedRegionId} data-selected={!selectedRegionId} onClick={() => onRegionSelect("")} className={cn(chipClass, chipState(!selectedRegionId))}>
              <Check className={cn(checkClass, selectedRegionId && "invisible")} aria-hidden="true" />{t("locations.anyCity")}
            </SwButton>
            {quickRegions.map((region) => (
              <SwButton variant="plain" size="inherit" key={region.id} type="button" aria-pressed={selectedRegionId === region.id} data-selected={selectedRegionId === region.id} onClick={() => onRegionSelect(region.id)} className={cn(chipClass, chipState(selectedRegionId === region.id))}>
                <Check className={cn(checkClass, selectedRegionId !== region.id && "invisible")} aria-hidden="true" /><span className="min-w-0 truncate" title={getRegionDisplayName(region)}>{getRegionDisplayName(region)}</span>
              </SwButton>
            ))}
          </FilterRail>
          <div className="shrink-0 pt-1">
            <CityPicker regions={regions} selectedRegionId={selectedRegionId} open={showRegionDropdown} onOpenChange={onOpenChange} onSelect={onRegionSelect} />
          </div>
        </div>
        {tags.length > 0 && (
          <div role="group" aria-label={t("locations.tagsLabel")} aria-describedby="locations-interest-hint" className="mt-2 flex min-w-0 items-start gap-2 border-t border-border/60 pt-2">
            <span className="flex min-h-13 w-14 shrink-0 items-center text-xs font-semibold text-foreground/70">{t("locations.tagsLabel")}</span>
            <FilterRail selectedKey={selectedTags.join(",")} testId="locations-tag-options">
              {tags.map((tag) => (
                <SwButton variant="plain" size="inherit" key={tag.id} type="button" aria-pressed={selectedTags.includes(tag.id)} onClick={() => onTagToggle(tag.id)} className={cn(chipClass, chipState(selectedTags.includes(tag.id)))}>
                  <Check className={cn(checkClass, !selectedTags.includes(tag.id) && "invisible")} aria-hidden="true" /><span className="min-w-0 truncate" title={tag.name}>{tag.name}</span>
                </SwButton>
              ))}
            </FilterRail>
          </div>
        )}
      </div>
      <SwCard className="block gap-0 py-0 ring-0 flex min-h-11 items-center justify-between gap-2 rounded-b-2xl border-t border-border/60 bg-card/60 px-3 sm:px-4">
        <p id="locations-interest-hint" className="text-xs text-muted-foreground">{t("locations.interestHint")}</p>
        <SwButton variant="plain" size="inherit" type="button" onClick={onClear} disabled={!selectedRegionId && selectedTags.length === 0}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
          <RotateCcw className="size-3.5 shrink-0" aria-hidden="true" />{t("locations.clearFilter")}
        </SwButton>
      </SwCard>
    </div>
  );
}
