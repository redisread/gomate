import { ArrowUpRight, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { LocationCoverImage } from "@/components/ui/lazy-image";
import type { Location } from "@/lib/types";

const CARD_STYLES = [
  "bg-primary-50 dark:bg-primary/10 md:-rotate-2 md:hover:rotate-0",
  "bg-secondary dark:bg-secondary/70 md:rotate-[1.5deg] md:hover:rotate-0",
  "bg-brand-subtle dark:bg-brand-subtle/70 md:-rotate-1 md:hover:rotate-0",
] as const;

export function HomeLocationsSection({ locations }: { locations: Location[] }) {
  const { t } = useI18n(["home", "common"]);
  const featuredLocations = locations.slice(0, 3);

  if (featuredLocations.length === 0) return null;

  return (
    <section
      id="featured-locations"
      className="overflow-hidden border-b border-border/70 bg-secondary/30 py-16 sm:py-20 lg:py-24"
      data-testid="home-featured-locations"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-6 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="home-section-kicker mb-4 text-xs font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">
              {t("home.featuredLocations.kicker")}
            </p>
            <h2 className="max-w-xl text-4xl font-bold tracking-[-0.04em] text-foreground sm:text-5xl">
              {t("home.featuredLocations.title")}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-700 dark:text-stone-300 sm:text-lg">
              {t("home.featuredLocations.description")}
            </p>
          </div>

          <a
            href="/locations"
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-amber-800 transition-colors hover:text-amber-600 dark:text-amber-300 dark:hover:text-amber-200"
          >
            {t("home.featuredLocations.viewAll")}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {featuredLocations.map((location, index) => {
            const summary = location.subtitle?.trim() || location.description;

            return (
              <a
                key={location.id}
                href={`/locations/${location.id}`}
                className={`group block rounded-[1.75rem] transition-transform duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transition-none ${CARD_STYLES[index]}`}
                data-testid="home-location-card"
              >
                <article className="h-full overflow-hidden rounded-[1.75rem] border border-foreground/10 bg-card shadow-warm-lg ring-1 ring-black/5 transition-[box-shadow,transform] duration-300 group-hover:-translate-y-1 group-hover:shadow-warm-xl dark:ring-white/10">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <LocationCoverImage
                      src={location.coverImage}
                      alt=""
                      priority={index === 0}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" aria-hidden="true" />
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {location.cityName}
                    </span>
                    <span className="absolute bottom-4 left-4 right-4 text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl">
                      {location.name}
                    </span>
                  </div>

                  <div className={`flex min-h-44 flex-col p-5 sm:p-6 ${CARD_STYLES[index].split(" ")[0]}`}>
                    <p className="line-clamp-2 text-sm leading-6 text-stone-700 dark:text-stone-200">
                      {summary}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-sm font-semibold text-foreground">
                      <span className="truncate text-stone-700 dark:text-stone-200">{location.address || location.cityName}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-amber-800 dark:text-amber-300">
                        {t("common.viewDetail")}
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </article>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
