import * as React from "react";
import { animate as animateElement } from "motion/mini";
import { ArrowRight, MapPin, RotateCcw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { getRegionDisplayName } from "@/components/shared/quick-city-options";
import type { MapPoint } from "./use-map-data";

interface Props {
  point: MapPoint | null;
  animate: boolean;
  candidates: MapPoint[];
  loading: boolean;
  failed: boolean;
  unavailable: boolean;
  emptyProvince: string | null;
  onSelect: (point: MapPoint) => void;
  onRetry: () => void;
  onNavigate: () => void;
}

export function MapPreview({
  point,
  animate,
  candidates,
  loading,
  failed,
  unavailable,
  emptyProvince,
  onSelect,
  onRetry,
  onNavigate,
}: Props) {
  const { t } = useI18n(["home", "locations", "common"]);
  return (
    <div
      data-testid="map-preview"
      role="region"
      aria-label={t("home.discoveryMap.previewLabel")}
      className="min-h-36 border-t border-border bg-card p-4 sm:min-h-28 sm:p-5"
      aria-busy={loading}
    >
      {failed ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          role="alert"
        >
          <p className="text-sm text-foreground">
            {t("home.discoveryMap.loadFailed")}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("home.discoveryMap.retry")}
          </button>
        </div>
      ) : candidates.length > 1 ? (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            {t("home.discoveryMap.chooseLocation")}
          </p>
          <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto sm:max-h-11">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => onSelect(candidate)}
                className="min-h-11 rounded-xl bg-secondary px-4 py-2 text-start text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {candidate.name}{" "}
                <span className="font-normal text-muted-foreground">
                  · {getRegionDisplayName(candidate.region)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <PreviewText
            animate={animate}
            selected={Boolean(point)}
            title={
              point
                ? point.name
                : loading
                  ? t("common.loading")
                  : unavailable
                    ? t("home.discoveryMap.locationUnavailable")
                    : emptyProvince
                      ? t("home.mapFocusedEmptyTitle", {
                          province: emptyProvince,
                        })
                      : t("home.discoveryMap.previewHint")
            }
            subtitle={
              point
                ? `${point.provinceName ? `${point.provinceName} · ` : ""}${getRegionDisplayName(point.region)}`
                : emptyProvince
                  ? t("home.mapFocusedEmptyDesc")
                  : t("home.discoveryMap.previewDescription")
            }
          />
          {point && (
            <a
              href={`/locations/${encodeURIComponent(point.id)}`}
              onClick={onNavigate}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform duration-150 motion-safe:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none sm:self-auto"
            >
              {t("home.discoveryMap.viewLocation")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

interface TextContent {
  title: string;
  subtitle: string;
  selected: boolean;
}
const layoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

function PreviewText({
  title,
  subtitle,
  selected,
  animate,
}: TextContent & { animate: boolean }) {
  const current = React.useRef<HTMLDivElement>(null);
  const old = React.useRef<HTMLDivElement>(null);
  const last = React.useRef<TextContent>({ title, subtitle, selected });
  const [outgoing, setOutgoing] = React.useState<TextContent | null>(null);
  const entering = React.useRef<ReturnType<typeof animateElement> | null>(null);
  const leaving = React.useRef<ReturnType<typeof animateElement> | null>(null);
  const revision = React.useRef(0);
  const outgoingStyle = React.useRef({ opacity: "1", transform: "none" });

  layoutEffect(() => {
    const previous = last.current;
    last.current = { title, subtitle, selected };
    if (previous.title === title && previous.subtitle === subtitle) return;
    const element = current.current;
    if (!element) return;
    const interrupted = entering.current?.state === "running";
    const style = getComputedStyle(element);
    const start = interrupted
      ? { opacity: style.opacity, transform: style.transform }
      : { opacity: "0", transform: "translateY(4px)" };
    outgoingStyle.current = {
      opacity: style.opacity,
      transform: style.transform,
    };
    entering.current?.stop();
    leaving.current?.stop();
    revision.current += 1;
    if (
      !animate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof element.animate !== "function"
    ) {
      element.style.opacity = "1";
      element.style.transform = "none";
      setOutgoing(null);
      return;
    }
    setOutgoing(previous);
    entering.current = animateElement(
      element,
      {
        opacity: [Number(start.opacity), 1],
        transform: [start.transform, "translateY(0)"],
      },
      { duration: 0.18, ease: [0.2, 0, 0, 1] },
    );
  }, [title, subtitle, selected, animate]);

  layoutEffect(() => {
    if (!outgoing || !old.current) return;
    const version = revision.current;
    const animation = animateElement(
      old.current,
      {
        opacity: [Number(outgoingStyle.current.opacity), 0],
        transform: [outgoingStyle.current.transform, "translateY(-4px)"],
      },
      { duration: 0.16, ease: "easeOut" },
    );
    leaving.current = animation;
    void Promise.resolve(animation)
      .then(() => {
        if (revision.current === version) setOutgoing(null);
      })
      .catch(() => {
        /* A newer selection owns the outgoing layer after cancellation. */
      });
    return () => animation.stop();
  }, [outgoing]);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => {
      if (!media.matches) return;
      revision.current += 1;
      entering.current?.stop();
      leaving.current?.stop();
      if (current.current) {
        current.current.style.opacity = "1";
        current.current.style.transform = "none";
      }
      setOutgoing(null);
    };
    media.addEventListener("change", stop);
    return () => {
      media.removeEventListener("change", stop);
      revision.current += 1;
      entering.current?.stop();
      leaving.current?.stop();
    };
  }, []);

  const renderText = (content: TextContent) => (
    <>
      <p
        className={`flex items-start gap-2 font-semibold text-foreground transition-none ${content.selected ? "text-base" : "text-sm"}`}
      >
        {content.selected && (
          <MapPin
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
        )}
        {content.title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground transition-none">
        {content.subtitle}
      </p>
    </>
  );
  return (
    <div className="relative min-w-0 flex-1">
      <div ref={current} aria-live="polite" aria-atomic="true">
        {renderText({ title, subtitle, selected })}
      </div>
      {outgoing && (
        <div
          ref={old}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0"
        >
          {renderText(outgoing)}
        </div>
      )}
    </div>
  );
}
