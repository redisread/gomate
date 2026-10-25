import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ArrowUpRight, Compass, MapPin, Shuffle } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Location } from "@/lib/types";
import { useRandomLocation } from "./use-random-location";
import "./random-discovery.css";

function Photo({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-full w-full overflow-hidden bg-secondary">
      <Compass
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-primary/40"
      />
      {src && !failed && (
        <img
          src={src}
          alt=""
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
          className="relative h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export function HomeRandomDiscovery({ locations }: { locations: Location[] }) {
  const { t } = useI18n(["home"]);
  const { result, busy, failed, draw } = useRandomLocation();
  const place = result?.location;
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!busy || reduced) return;
    const timer = setInterval(() => setFrame((value) => (value + 1) % 6), 240);
    return () => clearInterval(timer);
  }, [busy, reduced]);
  const photos = locations
    .filter((location) => location.coverImageUrl)
    .slice(0, 6);
  return (
    <section
      aria-labelledby="random-discovery-title"
      data-testid="home-random-discovery"
      className="random-discovery"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="random-discovery-title"
          className="text-lg font-semibold text-foreground"
        >
          {t("home.randomDiscovery.title")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t("home.randomDiscovery.scope")}
        </span>
      </div>
      <div
        className="random-stage"
        data-busy={busy}
        data-revealed={Boolean(place)}
      >
        <div aria-hidden="true" className="random-wall">
          {Array.from({ length: 6 }, (_, index) => {
            const photo = photos.length
              ? photos[(index + frame) % photos.length]
              : undefined;
            return (
              <div key={index} className={`random-tile random-tile-${index}`}>
                <Photo
                  key={photo?.coverImageUrl ?? "empty"}
                  src={photo?.coverImageUrl ?? null}
                />
              </div>
            );
          })}
        </div>
        <div className="random-center">
          {place ? (
            <article
              key={place.id}
              className="random-result bg-background text-foreground shadow-card"
              data-testid="random-location-result"
            >
              <div className="h-48 sm:h-60">
                <Photo key={place.coverImageUrl} src={place.coverImageUrl} />
              </div>
              <div className="p-4">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {place.city}
                </p>
                <h3 className="mt-2 text-xl font-semibold break-words">
                  {place.name}
                </h3>
                <a
                  href={`/locations/${encodeURIComponent(place.id)}`}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {t("home.randomDiscovery.view")}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </article>
          ) : (
            <div className="rounded-2xl border border-border bg-background/95 px-6 py-8 text-center shadow-card">
              <Compass
                aria-hidden="true"
                className="mx-auto mb-4 h-10 w-10 text-primary"
              />
              <p className="text-xl font-semibold">
                {t(
                  result
                    ? "home.randomDiscovery.empty"
                    : "home.randomDiscovery.invitation",
                )}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {t("home.randomDiscovery.hint")}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="relative mt-5 text-center">
        <button
          type="button"
          onClick={draw}
          aria-disabled={busy}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground aria-disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <Shuffle aria-hidden="true" className="h-4 w-4" />
          {t(
            busy
              ? "home.randomDiscovery.selecting"
              : failed
                ? "home.randomDiscovery.retry"
                : place
                  ? "home.randomDiscovery.again"
                  : "home.randomDiscovery.draw",
          )}
        </button>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-3 min-h-10 text-sm text-muted-foreground"
        >
          {failed
            ? t("home.randomDiscovery.error")
            : busy
              ? t("home.randomDiscovery.selecting")
              : result?.total === 1
                ? t("home.randomDiscovery.onlyOne")
                : place
                  ? `${place.city} · ${place.name}`
                  : result
                    ? t("home.randomDiscovery.empty")
                    : t("home.randomDiscovery.fair")}
        </p>
      </div>
    </section>
  );
}
