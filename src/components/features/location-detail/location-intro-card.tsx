import { Card as SwCard } from "@/components/starwind-react/card";
import { Button as SwButton } from "@/components/starwind-react/button";
import * as React from "react";
import {
  ChevronDown,
  MapPin,
  Navigation,
  Check,
  Copy,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { openExternalLink } from "@/lib/open-external";
import { cn } from "@/lib/utils";
import type { Location } from "@/lib/types";

export function LocationIntroCard({
  location,
  address,
}: {
  location: Location;
  address?: string;
}) {
  const { t } = useI18n(["locations", "enums", "common", "locationDetail"]);
  const [expanded, setExpanded] = React.useState(false);
  const [isOverflow, setIsOverflow] = React.useState(false);
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "error">(
    "idle",
  );
  const descRef = React.useRef<HTMLParagraphElement>(null);
  const descriptionId = React.useId();
  const hasValidCoordinates =
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    !(location.latitude === 0 && location.longitude === 0);

  React.useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    const measure = () =>
      setIsOverflow(
        el.scrollHeight > parseFloat(getComputedStyle(el).lineHeight) * 4 + 2,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [location.description]);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };
  const seasons: Record<string, string> = {
    spring: t("enums.season.spring"),
    春季: t("enums.season.spring"),
    summer: t("enums.season.summer"),
    夏季: t("enums.season.summer"),
    autumn: t("enums.season.autumn"),
    秋季: t("enums.season.autumn"),
    winter: t("enums.season.winter"),
    冬季: t("enums.season.winter"),
  };
  const bestSeasons = location.extra.hiking?.bestSeasons ?? [];

  return (
    <section
      aria-labelledby="location-intro-title"
      className="min-w-0 space-y-6"
    >
      <div>
        <h2
          id="location-intro-title"
          className="mb-5 text-section-h2 text-foreground"
        >
          {t("locations.locationIntro")}
        </h2>
        <p
          id={descriptionId}
          ref={descRef}
          className={cn(
            "whitespace-pre-line break-words text-base leading-8 text-muted-foreground",
            !expanded && "line-clamp-4",
          )}
        >
          {location.description}
        </p>
        {isOverflow && (
          <SwButton variant="plain" size="inherit"
            type="button"
            aria-expanded={expanded}
            aria-controls={descriptionId}
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-accent-foreground hover:underline underline-offset-4"
          >
            {t(expanded ? "common.collapse" : "common.expandAll")}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-4 w-4 transition-transform duration-150 motion-reduce:transition-none",
                expanded && "rotate-180",
              )}
            />
          </SwButton>
        )}
      </div>
      {(address || bestSeasons.length > 0) && (
        <SwCard className="block gap-0 py-0 ring-0 space-y-6 rounded-3xl bg-card p-5 shadow-card sm:p-6">
          {address && (
            <div className="flex items-start gap-3">
              <MapPin
                aria-hidden="true"
                className="mt-1 h-5 w-5 shrink-0 text-accent-foreground"
              />
              <div className="min-w-0 flex-1">
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {t("locationDetail.address")}
                </h3>
                <p className="break-words text-sm leading-7 text-muted-foreground">
                  {address}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {hasValidCoordinates && (
                    <SwButton variant="plain" size="inherit"
                      type="button"
                      onClick={() =>
                        openExternalLink(
                          `https://uri.amap.com/navigation?to=${location.longitude},${location.latitude},${encodeURIComponent(location.name)}&callnative=0`,
                        )
                      }
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
                    >
                      <Navigation aria-hidden="true" className="h-4 w-4" />
                      {t("locations.navigateTooltip")}
                    </SwButton>
                  )}
                  <SwButton variant="plain" size="inherit"
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-muted px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    <span
                      aria-hidden="true"
                      className="relative h-4 w-4 shrink-0"
                    >
                      <Copy
                        className={cn(
                          "absolute inset-0 h-4 w-4 transition-[opacity,scale,filter] duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
                          copyState === "copied"
                            ? "scale-[0.25] opacity-0 blur-[4px]"
                            : "scale-100 opacity-100 blur-none",
                        )}
                      />
                      <Check
                        className={cn(
                          "absolute inset-0 h-4 w-4 transition-[opacity,scale,filter] duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
                          copyState === "copied"
                            ? "scale-100 opacity-100 blur-none"
                            : "scale-[0.25] opacity-0 blur-[4px]",
                        )}
                      />
                    </span>
                    {t("common.copyAddress")}
                  </SwButton>
                </div>
                <p
                  role="status"
                  className={cn(
                    "text-sm leading-6 text-muted-foreground",
                    copyState !== "idle" && "mt-2",
                  )}
                >
                  {copyState === "copied"
                    ? t("locationDetail.copied")
                    : copyState === "error"
                      ? t("locationDetail.copyFailed")
                      : ""}
                </p>
              </div>
            </div>
          )}
          {bestSeasons.length > 0 && (
            <div className="flex items-start gap-3">
              <Sparkles
                aria-hidden="true"
                className="mt-1 h-5 w-5 shrink-0 text-accent-foreground"
              />
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {t("locationDetail.seasons")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {bestSeasons.map((season) => (
                    <span
                      key={season}
                      className="rounded-lg bg-warm-subtle px-3 py-1 text-sm text-foreground"
                    >
                      {seasons[season] ?? season}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SwCard>
      )}
    </section>
  );
}
