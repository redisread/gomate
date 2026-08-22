import { ArrowUpRight, Compass, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { LocationCoverImage } from "@/components/ui/lazy-image";
import type { Location } from "@/lib/types";
import { selectGuestFeaturedLocations } from "./guest-featured-locations";

const CARD_STYLES = [
  {
    wrapper:
      "-ml-10 rotate-[-3deg] lg:absolute lg:left-1 lg:top-10 lg:ml-0 lg:h-[27rem] lg:w-[18rem] lg:-rotate-[4deg] lg:z-10",
    surface: "bg-primary-50 dark:bg-primary/15",
    title: "text-2xl sm:text-3xl lg:text-2xl",
  },
  {
    wrapper:
      "rotate-[1deg] lg:absolute lg:left-1/2 lg:top-1 lg:h-[31rem] lg:w-[21rem] lg:-translate-x-1/2 lg:rotate-0 lg:z-30",
    surface: "bg-secondary dark:bg-secondary/70",
    title: "text-3xl sm:text-4xl",
  },
  {
    wrapper:
      "-ml-10 rotate-[3deg] lg:absolute lg:right-1 lg:top-10 lg:ml-0 lg:h-[27rem] lg:w-[18rem] lg:rotate-[4deg] lg:z-20",
    surface: "bg-brand-subtle dark:bg-brand-subtle/70",
    title: "text-2xl sm:text-3xl lg:text-2xl",
  },
] as const;

export function HomeLocationStack({ locations }: { locations: Location[] }) {
  const { t } = useI18n(["home", "common", "locations"]);
  const featuredLocations = selectGuestFeaturedLocations(locations);

  if (featuredLocations.length === 0) {
    return (
      <div
        className="flex h-[27rem] w-full items-center justify-center rounded-[2rem] bg-[radial-gradient(circle_at_50%_35%,color-mix(in_oklab,var(--primary)_34%,transparent),transparent_34%),linear-gradient(145deg,var(--brand-muted),var(--secondary))] shadow-warm-xl ring-1 ring-black/5 dark:ring-white/10 lg:h-[34rem]"
        data-testid="home-location-stack-empty"
      >
        <div className="text-center text-primary/60">
          <Compass className="mx-auto h-20 w-20" strokeWidth={1.1} aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold">{t("common.exploreLocations")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" data-testid="home-location-stack">
      <div
        className="relative -mx-4 flex h-[29rem] items-center overflow-x-auto px-4 pb-4 pt-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:block lg:h-[34rem] lg:overflow-visible lg:px-0"
        aria-label={t("home.heroLocations.listLabel")}
      >
        {featuredLocations.map((location, index) => {
          const style = CARD_STYLES[index];
          const address = location.address || location.region?.name || t("locations.defaultRegion");

          return (
            <a
              key={location.id}
              href={`/locations/${location.id}`}
              className={`group relative h-[26rem] w-[78vw] max-w-[22rem] shrink-0 snap-center rounded-[2rem] transition-[transform,box-shadow] duration-300 ease-out focus-visible:z-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transition-none ${style.wrapper}`}
              data-testid="home-location-stack-card"
            >
              <article
                className={`relative h-full overflow-hidden rounded-[2rem] border border-foreground/10 shadow-warm-xl ring-1 ring-black/5 transition-[transform,box-shadow] duration-300 group-hover:-translate-y-2 group-hover:shadow-brand-glow-lg dark:ring-white/10 ${style.surface}`}
              >
                <LocationCoverImage
                  src={location.coverImageUrl}
                  alt=""
                  priority
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/5" aria-hidden="true" />

                <span className="absolute left-4 top-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-1.5 truncate rounded-full bg-black/30 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {location.region?.name}
                </span>

                <div className="absolute inset-x-5 bottom-5 text-white">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/70">GoMate</p>
                  <h2 className={`mt-2 font-bold tracking-tight drop-shadow-sm ${style.title}`}>{location.name}</h2>
                  <p className="mt-2 flex items-center gap-2 truncate text-sm text-white/80">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {address}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/85">
                    {t("common.viewDetail")}
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
              </article>
            </a>
          );
        })}
      </div>

      <p className="mt-1 text-center text-xs text-muted-foreground lg:hidden">{t("home.heroLocations.swipeHint")}</p>
    </div>
  );
}
