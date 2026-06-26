import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { LocationCard } from "./home-location-card";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeLocationsSection({ data }: { data: HomeData }) {
  const { locations, isLoading, locationsRef, locationsInView } = data;
  const { t } = useI18n(["home", "locations", "common"]);

  return (
    <section id="locations" ref={locationsRef}
      className={`py-12 sm:py-16 lg:py-20 bg-background section-hidden ${locationsInView ? "section-visible" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-widest bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">{t("home.featuredLocations")}</span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("locations.pageTitle")}</h2>
          <div className="flex justify-center">
            <p className="text-center text-muted-foreground w-full max-w-xl leading-relaxed text-lg">{t("locations.pageSubtitle")}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location, index) => <LocationCard key={location.id} location={location} index={index} />)}
          </div>
        )}

      </div>
    </section>
  );
}
