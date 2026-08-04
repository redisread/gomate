import { ArrowRight, Compass, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { LocationCard } from "./home-location-card";
import { ChinaMap } from "./china-map";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeLocationsSection({ data, showMap = false }: { data: HomeData; showMap?: boolean }) {
  const { locations, isLoading, locationsRef, locationsInView, userCity, cityMatch } = data;
  const showViewAllCity = userCity && cityMatch && cityMatch !== "fallback" && locations[0]?.cityName;
  const locationsUrl = showViewAllCity ? `/locations?cityId=${encodeURIComponent(userCity)}` : "/locations";
  const { t } = useI18n(["home", "locations", "common"]);

  const showCityChip = userCity && cityMatch && cityMatch !== "fallback" && locations[0]?.cityName;
  const cityChipName = showCityChip ? locations[0].cityName : null;

  return (
    <section
      id="locations"
      ref={locationsRef}
      className={`bg-background py-16 sm:py-20 lg:py-24 section-hidden ${locationsInView ? "section-visible" : ""}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("locations.pageTitle")}</h2>
            {cityChipName && (
              <span className="inline-flex items-center text-sm font-medium text-stone-600 dark:text-stone-400" data-testid="locations-city-chip">
                {t("home.locations.cityChip", { city: cityChipName })}
              </span>
            )}
          </div>
          <p className="mt-3 text-base leading-7 text-stone-700 dark:text-stone-300">{t("locations.pageSubtitle")}</p>
          {userCity && cityMatch === "fallback" && locations.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t("home.locations.fallbackHint")}</p>
            </div>
          )}
        </div>

        {isLoading ? (
          <>
            <div className="md:hidden flex flex-col gap-2" aria-busy="true" aria-label={t("common.loading")}>
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[88px] rounded-xl bg-muted animate-pulse" />)}
            </div>
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label={t("common.loading")}>
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          </>
        ) : locations.length === 0 ? (
          <div className="home-empty-state rounded-[1.5rem] border border-dashed border-primary/35 bg-primary-50/50 px-6 py-10 text-center dark:bg-primary/10">
            <Compass className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">{t("home.discoveryEmpty.title")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-700 dark:text-stone-300">{t("home.discoveryEmpty.description")}</p>
            <a href="/locations" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-primary hover:text-white">
              {t("common.exploreLocations")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <>
            <div className="md:hidden flex flex-col gap-2">
              {locations.map((location, index) => <LocationCard key={location.id} location={location} index={index} compact />)}
            </div>
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location, index) => (
                <div key={location.id} className={index === 0 ? "lg:col-span-2" : ""}>
                  <LocationCard location={location} index={index} />
                </div>
              ))}
            </div>
            <div className="text-center mt-14">
              <a href={locationsUrl} className="group inline-flex items-center gap-2 px-7 py-3.5 border border-border rounded-2xl text-base font-semibold text-foreground transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 hover:shadow-warm-sm active:scale-[0.96]">
                {t("common.viewAll")}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>
          </>
        )}

        {showMap && (
          <div className="mt-16 border-t border-border/70 pt-16 sm:mt-20 sm:pt-20">
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(220px,0.38fr)_minmax(0,1fr)] lg:gap-14">
              <div className="max-w-md">
                <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  {t("common.explore")}
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("home.discoveryMap.title")}</h3>
                <p className="mt-4 text-base leading-7 text-stone-700 dark:text-stone-300">{t("home.discoveryMap.description")}</p>
                <a href="/locations" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-colors hover:bg-primary hover:text-white">
                  {t("common.exploreLocations")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <div className="home-map-frame rounded-[1.5rem] bg-card p-2 shadow-warm-xl ring-1 ring-black/5 dark:ring-white/10">
                <ChinaMap />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
