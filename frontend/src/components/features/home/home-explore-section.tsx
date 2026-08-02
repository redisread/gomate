"use client";

import { ArrowRight, Compass } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { ChinaMap } from "./china-map";

export function HomeExploreSection() {
  const { t } = useI18n(["common", "home", "locations"]);

  return (
    <section className="bg-secondary/35 py-16 sm:py-20 lg:py-24" data-testid="home-explore-section">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(240px,0.42fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:px-8">
        <div className="max-w-md">
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">
            <Compass className="h-4 w-4" aria-hidden="true" />
            {t("common.explore")}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("locations.pageTitle")}
          </h2>
          <p className="mt-4 text-base leading-7 text-stone-700 dark:text-stone-300">
            {t("locations.pageSubtitle")}
          </p>
          <a
            href="/locations"
            className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-[background-color,transform,box-shadow] duration-150 hover:bg-amber-800 hover:text-white hover:shadow-warm-md active:scale-[0.96]"
          >
            {t("common.exploreLocations")}
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
        </div>

        <div className="rounded-[2rem] bg-card p-2 shadow-warm-xl ring-1 ring-black/5 dark:ring-white/10">
          <ChinaMap />
        </div>
      </div>
    </section>
  );
}
