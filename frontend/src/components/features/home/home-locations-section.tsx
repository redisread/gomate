import { ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { LocationCard } from "./home-location-card";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeLocationsSection({ data }: { data: HomeData }) {
  const { locations, isLoading, pagination, currentPage, locationsRef, locationsInView, setCurrentPage, fetchLocations } = data;
  const { t } = useI18n(["home", "locations", "common"]);

  return (
    <section id="locations" ref={locationsRef}
      className={`py-20 bg-background section-hidden ${locationsInView ? "section-visible" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-widest bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">{t("home.featuredLocations")}</span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("locations.pageTitle")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-lg">{t("locations.pageSubtitle")}</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => <LocationCard key={location.id} location={location} />)}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => { setCurrentPage(page); fetchLocations(page); }}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-all duration-150 ${page === currentPage ? "bg-brand text-brand-foreground shadow-brand-glow" : "bg-muted text-muted-foreground hover:bg-accent hover:text-brand"}`}>
                {page}
              </button>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <a href="/locations">
            <button className="border border-border hover:bg-accent text-foreground hover:text-brand px-7 py-3 rounded-xl text-sm font-medium transition-all duration-150 inline-flex items-center gap-2">
              {t("common.viewAll")}<ArrowRight className="h-4 w-4" />
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}
