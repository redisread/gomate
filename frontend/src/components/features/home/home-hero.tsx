import { ArrowRight, CalendarDays, Compass, MapPin, Search, Users, X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeHero({ data, isMember = false }: { data: HomeData; isMember?: boolean }) {
  const { animate, search, handleSearch } = data;
  const { t } = useI18n(["common", "content", "home", "locations"]);
  const featuredLocation = data.locations[0];
  const featuredTeam = data.teams[0];

  return (
    <section className={`home-hero-shell relative isolate overflow-hidden border-b border-border/70 bg-background ${isMember ? "home-hero-member" : ""}`}>
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_28%),radial-gradient(circle_at_8%_82%,color-mix(in_oklab,var(--warm)_8%,transparent),transparent_24%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:items-center lg:gap-16 lg:px-8 lg:pb-24">
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

          <form
            role="search"
            aria-label={t("common.search")}
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch(search.value);
            }}
            className={`home-search relative mt-8 max-w-2xl ${animate.search}`}
          >
            <label htmlFor="home-location-search" className="sr-only">{t("common.searchPlaceholder")}</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="home-location-search"
              type="search"
              placeholder={t("common.searchPlaceholder")}
              value={search.value}
              onChange={(event) => search.setValue(event.target.value)}
              onFocus={() => search.setFocused(true)}
              onBlur={() => search.setFocused(false)}
              className="w-full rounded-2xl border border-border bg-card/95 py-4 pl-12 pr-28 text-base text-foreground shadow-warm-sm outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15"
              style={{ boxShadow: search.isFocused ? "0 8px 32px color-mix(in oklab, var(--primary) 18%, transparent)" : undefined, backdropFilter: "blur(8px)" }}
            />
            {search.value && (
              <button
                type="button"
                onClick={search.clear}
                aria-label={t("common.clear")}
                className="absolute right-24 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.96]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="btn-brand-offset absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-150 motion-reduce:transition-none hover:bg-amber-800 active:scale-[0.96]"
            >
              {t("common.search")}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
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
          <div className="home-route-card relative aspect-[0.92] overflow-hidden rounded-[2rem] bg-secondary shadow-warm-xl ring-1 ring-black/5 dark:ring-white/10">
            {featuredLocation?.coverImage ? (
              <img
                src={featuredLocation.coverImage}
                alt={featuredLocation.name}
                loading="eager"
                decoding="async"
                // @ts-expect-error lowercase `fetchpriority` is the HTML DOM attribute name; React warns about `fetchPriority`
                fetchpriority="high"
                className="h-full w-full object-cover outline outline-1 outline-black/10 transition-transform duration-150 hover:scale-[1.02] motion-reduce:transition-none dark:outline-white/10"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,color-mix(in_oklab,var(--primary)_34%,transparent),transparent_34%),linear-gradient(145deg,var(--brand-muted),var(--secondary))]">
                <Compass className="h-24 w-24 text-primary/40" strokeWidth={1.1} aria-hidden="true" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden="true" />

            <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3 text-white">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                {t("common.explore")}
              </span>
              {featuredLocation?.address && (
                <span className="inline-flex max-w-[55%] items-center gap-1.5 truncate rounded-full bg-black/25 px-3 py-1.5 text-xs backdrop-blur-md">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {featuredLocation.address}
                </span>
              )}
            </div>

            <div className="absolute inset-x-5 bottom-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">GoMate</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {featuredLocation?.name ?? t("common.exploreLocations")}
              </h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {featuredLocation?.address ?? t("locations.defaultCity")}
              </p>
            </div>
          </div>

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
