import { Button as SwButton } from "@/components/starwind-react/button";
import { Input as SwInput } from "@/components/starwind-react/input";
import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/hooks/useI18n";
import type { Region } from "@/lib/types";
import { getRegionDisplayName } from "@/components/shared/quick-city-options";
import { cn } from "@/lib/utils";

export function CityPicker({ regions, selectedRegionId, open, onOpenChange, onSelect }: {
  regions: Region[];
  selectedRegionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n(["locations", "common"]);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const options = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = regions.filter((region) => [getRegionDisplayName(region), region.name, region.nameEn, region.slug, region.code].some((value) => value?.toLowerCase().includes(keyword)));
    return [
      ...(!keyword ? [{ id: "", name: t("locations.anyCity") }] : []),
      ...filtered.map((region) => ({ id: region.id, name: getRegionDisplayName(region) })),
    ];
  }, [regions, query, t]);
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  const select = (regionId: string) => { onSelect(regionId); close(); };

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(-1);
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - Math.min(448, window.innerHeight - 32))),
        left: Math.max(16, Math.min(rect.right - 320, window.innerWidth - 336)),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  React.useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  return (
    <>
      <SwButton variant="plain" size="inherit" ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`} onClick={() => onOpenChange(!open)}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-card px-2.5 text-xs font-medium text-foreground/70 transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none sm:text-sm">
        {t("locations.moreCities")}<ChevronDown className={cn("size-3.5 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
      </SwButton>
      <Modal open={open} onClose={close} labelledBy={`${id}-title`} initialFocusRef={searchRef} returnFocusRef={triggerRef}
        overlayClassName="flex items-end justify-center sm:block" backdropClassName="bg-foreground/25 sm:bg-foreground/10"
        panelClassName="flex max-h-[min(28rem,calc(100dvh-2rem))] w-full flex-col overflow-hidden rounded-t-2xl bg-popover pb-[env(safe-area-inset-bottom)] text-popover-foreground shadow-warm-lg sm:fixed sm:left-[var(--city-left)] sm:top-[var(--city-top)] sm:w-80 sm:rounded-2xl sm:pb-0"
        panelStyle={{ "--city-top": `${position.top}px`, "--city-left": `${position.left}px` } as React.CSSProperties}
        data-testid="locations-city-picker">
        <div id={`${id}-dialog`} className="flex min-h-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-2 px-4 pt-2">
            <h2 id={`${id}-title`} className="text-sm font-semibold">{t("locations.chooseCity")}</h2>
            <SwButton variant="plain" size="inherit" type="button" onClick={close} aria-label={t("common.close")} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X className="size-4" aria-hidden="true" />
            </SwButton>
          </header>
          <div className="relative mx-4 mb-3 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <SwInput ref={searchRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); }}
              role="combobox" aria-label={t("locations.searchCities")} aria-expanded="true" aria-controls={`${id}-list`} aria-autocomplete="list" aria-describedby={`${id}-help`}
              aria-activedescendant={activeIndex >= 0 && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
              placeholder={t("locations.searchCities")} className="min-h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const direction = event.key === "ArrowDown" ? 1 : -1;
                  setActiveIndex((index) => {
                    if (!options.length) return -1;
                    if (index < 0) return direction > 0 ? 0 : options.length - 1;
                    return (index + direction + options.length) % options.length;
                  });
                } else if (event.key === "Enter" && options[activeIndex]) {
                  event.preventDefault();
                  select(options[activeIndex].id);
                }
              }} />
            <p id={`${id}-help`} className="sr-only">{t("locations.citySearchHelp")}</p>
          </div>
          <div ref={listRef} id={`${id}-list`} role="listbox" aria-label={t("locations.cityLabel")} className="min-h-0 overflow-y-auto overscroll-contain px-2 pb-2">
            {options.map((option, index) => (
              <div key={option.id} id={`${id}-option-${index}`} role="option" aria-selected={option.id === selectedRegionId} tabIndex={-1}
                onClick={() => select(option.id)} onPointerDown={(event) => event.preventDefault()} onPointerMove={() => setActiveIndex(index)}
                className={cn("flex min-h-11 w-full items-center justify-between gap-2 cursor-pointer rounded-xl px-3 text-left text-sm transition-colors motion-reduce:transition-none", option.id === selectedRegionId ? "bg-accent font-medium text-accent-foreground" : "text-popover-foreground", activeIndex === index && "bg-muted ring-1 ring-inset ring-ring")}>
                {option.name}{option.id === selectedRegionId && <Check className="size-4" aria-hidden="true" />}
              </div>
            ))}
          </div>
          {options.length === 0 && <p role="status" className="px-4 pb-5 text-sm text-muted-foreground">{t("common.noRegionsFound")}</p>}
        </div>
      </Modal>
    </>
  );
}
