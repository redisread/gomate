import { ArrowRight, CalendarDays, Users } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { HomeLocationStack } from "./home-location-stack";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeHero({ data, isMember = false }: { data: HomeData; isMember?: boolean }) {
  const { animate } = data;
  const { t } = useI18n(["common", "content", "home", "locations"]);
  const featuredTeam = data.teams[0];

  return (
    <section className={`home-hero-shell relative isolate overflow-hidden border-b border-border/70 bg-background ${isMember ? "home-hero-member" : ""}`}>
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_28%),radial-gradient(circle_at_8%_82%,color-mix(in_oklab,var(--warm)_8%,transparent),transparent_24%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:items-center lg:gap-16 lg:px-8 lg:pb-24">
        <div className="max-w-2xl">
          <div className={`home-hero-kicker mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary-50/70 px-3 py-1.5 text-xs font-semibold tracking-wide text-amber-800 dark:bg-primary/10 dark:text-amber-300 ${animate.subtitle}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {isMember ? t("home.memberHero.kicker") : t("common.tagline")}
          </div>

          <h1 className={`home-hero-title max-w-xl text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[1.02] tracking-[-0.055em] text-foreground ${animate.title}`}>
            <span className="block">{isMember ? t("home.memberHero.titleLine1") : t("content.hero.titleLine1")}</span>
            <span className="block text-gradient-brand">{isMember ? t("home.memberHero.titleLine2") : t("content.hero.titleLine2")}</span>
          </h1>

          <p className={`mt-6 max-w-xl text-base leading-8 text-stone-700 dark:text-stone-300 sm:text-lg ${animate.subtitle}`}>
            {isMember ? t("home.memberHero.description") : t("content.hero.description")}
          </p>

          <div className={`mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-stone-700 dark:text-stone-300 ${animate.cta}`}>
            <a href={isMember ? "/my-teams" : "/locations"} className="group inline-flex items-center gap-1.5 transition-colors duration-150 hover:text-amber-700 dark:hover:text-amber-300">
              {isMember ? t("common.myTeams") : t("common.exploreLocations")}
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
            <a href={isMember ? "/teams/create" : "/teams"} className="group inline-flex items-center gap-1.5 transition-colors duration-150 hover:text-amber-700 dark:hover:text-amber-300">
              {isMember ? t("common.exploreCreate") : t("common.exploreTeams")}
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className={`relative mx-auto w-full max-w-xl lg:mx-0 ${animate.search}`}>
          <HomeLocationStack locations={data.locations} />

          {featuredTeam && (
            <a href={`/teams/${featuredTeam.id}`} className="group absolute -bottom-6 left-4 right-4 flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-warm-xl ring-1 ring-black/5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-brand-glow-lg dark:ring-white/10 sm:left-auto sm:right-[-1.5rem] sm:w-[min(20rem,calc(100%-2rem))]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{featuredTeam.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {featuredTeam.date}{featuredTeam.time ? ` · ${featuredTeam.time}` : ""}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
