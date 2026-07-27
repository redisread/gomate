import * as React from "react";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchCurrentUser } from "@/lib/api";
import type { useHomeData } from "./use-home-data";
import { LocationCard } from "./home-location-card";
import type { SessionUser } from "@/lib/types";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeLocationsSection({ data }: { data: HomeData }) {
  const { locations, isLoading, locationsRef, locationsInView } = data;
  const { t } = useI18n(["home", "locations", "common"]);
  const [userCity, setUserCity] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (u) setUserCity((u as unknown as SessionUser).city ?? null);
    }).catch(() => {});
  }, []);

  const locationsUrl = userCity ? `/locations?cityId=${encodeURIComponent(userCity)}` : "/locations";

  return (
    <section id="locations" ref={locationsRef}
      className={`py-12 sm:py-16 lg:py-20 bg-background section-hidden ${locationsInView ? "section-visible" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-widest bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">{t("home.featuredLocations")}</span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("locations.pageTitle")}</h2>
          <div className="flex justify-center">
            {/* task #180 a11y：subtitle muted 18px 挂门禁；stone-700 dark:stone-300 = ~7.5:1/8:1 */}
            <p className="text-center text-stone-700 dark:text-stone-300 w-full max-w-xl leading-relaxed text-lg">{t("locations.pageSubtitle")}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location, index) => <LocationCard key={location.id} location={location} index={index} />)}
            </div>

            {/* Round 3 §A：探索地点「查看全部」出口 — 复用 teams viewAll 按钮结构 */}
            <div className="text-center mt-14">
              <a href={locationsUrl} className="group inline-flex items-center gap-2 px-7 py-3.5 border border-border rounded-2xl text-base font-semibold text-foreground transition-all duration-200 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 hover:shadow-warm-sm active:scale-[0.98]">
                {t("common.viewAll")}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>
          </>
        )}

      </div>
    </section>
  );
}
