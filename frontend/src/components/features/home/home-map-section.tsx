import { Compass } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { ChinaMap } from "./china-map";

export function HomeMapSection() {
  const { t } = useI18n(["home", "common"]);

  return (
    <section id="map" className="bg-background py-16 sm:py-20 lg:py-24" data-testid="home-map-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">
            <Compass className="h-4 w-4" aria-hidden="true" />
            {t("common.explore")}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("home.discoveryMap.title")}</h2>
          <p className="mt-4 text-base leading-7 text-stone-700 dark:text-stone-300">{t("home.discoveryMap.description")}</p>
        </div>

        <div className="home-map-frame rounded-[1.5rem] bg-card p-2 shadow-warm-xl ring-1 ring-black/5 dark:ring-white/10">
          <ChinaMap />
        </div>
      </div>
    </section>
  );
}
