import { ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { LocationCard } from "./home-location-card";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeLocationsSection({ data }: { data: HomeData }) {
  const { locations, isLoading, locationsRef, locationsInView, userCity, cityMatch } = data;

  // Round 3 §A：探索地点「查看全部」出口（与 showCityChip 同条件时带 cityId）
  const showViewAllCity = userCity && cityMatch && cityMatch !== "fallback" && locations[0]?.cityName;
  const locationsUrl = showViewAllCity ? `/locations?cityId=${encodeURIComponent(userCity)}` : "/locations";
  const { t } = useI18n(["home", "locations", "common"]);

  // P1 city 个性化 #193 T3: 标题右侧城市 chip（仅已设 city + exact/mixed 可识别城市名时）
  const showCityChip = userCity && cityMatch && cityMatch !== "fallback" && locations[0]?.cityName;
  const cityChipName = showCityChip ? locations[0].cityName : null;

  return (
    <section id="locations" ref={locationsRef}
      className={`py-12 sm:py-16 lg:py-20 bg-background section-hidden ${locationsInView ? "section-visible" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground inline-flex items-center gap-3 justify-center">
            {t("locations.pageTitle")}
            {cityChipName && (
              <span
                className="inline-flex items-center text-base font-normal text-stone-500 dark:text-stone-400"
                data-testid="locations-city-chip"
              >
                {t("home.locations.cityChip", { city: cityChipName })}
              </span>
            )}
          </h2>
          {/* #213 B路线：cityMatch=fallback 时显示降级提示（用户有 city 但该城市无地点） */}
          {userCity && cityMatch === "fallback" && locations.length > 0 && (
            <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-400">
              {t("home.locations.fallbackHint")}
            </p>
          )}
        </div>

        {isLoading ? (
          <>
            {/* Mobile/tablet skeleton */}
            <div className="md:hidden flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[88px] rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
            {/* Desktop skeleton */}
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Mobile/tablet: compact list */}
            <div className="md:hidden flex flex-col gap-2">
              {locations.map((location, index) => <LocationCard key={location.id} location={location} index={index} compact />)}
            </div>
            {/* Desktop: 3-col grid */}
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
