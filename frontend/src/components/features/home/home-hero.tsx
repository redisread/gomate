import { ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { HomeLocationStack } from "./home-location-stack";
import { HomeDepartureStack } from "./home-departure-stack";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeHero({ data, isMember = false }: { data: HomeData; isMember?: boolean }) {
  const { animate } = data;
  const { t } = useI18n(["common", "home"]);

  if (isMember) {
    return <LegacyMemberHero data={data} />;
  }

  return (
    <section className="home-hero-shell relative isolate overflow-hidden border-b border-border/70 bg-background">
      <div aria-hidden="true" className="absolute -left-72 -top-72 h-[38rem] w-[38rem] rounded-full border border-primary/15" />
      <div aria-hidden="true" className="absolute -right-52 top-20 h-[34rem] w-[34rem] rounded-full border border-primary/20" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:grid-cols-[minmax(0,0.92fr)_minmax(31rem,1.08fr)] lg:items-center lg:gap-14 lg:px-8 lg:pb-20">
        <div className="max-w-2xl">
          <div className={`home-hero-kicker mb-6 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-2 text-xs font-bold text-amber-900 dark:bg-primary/10 dark:text-amber-300 ${animate.subtitle}`}>
            <span className="h-2 w-2 rounded-full bg-warm shadow-[0_0_0_4px_color-mix(in_oklab,var(--warm)_14%,transparent)]" aria-hidden="true" />
            {t("home.guestHero.kicker")}
          </div>

          <h1 className={`home-hero-title max-w-2xl text-[clamp(2.75rem,7vw,5.25rem)] font-bold leading-[1.03] tracking-[-0.045em] text-foreground ${animate.title}`}>
            <span className="block">{t("home.guestHero.titleLine1")}</span>
            <span className="block text-primary">{t("home.guestHero.titleLine2")}</span>
          </h1>

          <p className={`mt-6 max-w-xl text-base leading-8 text-stone-700 dark:text-stone-300 sm:text-lg ${animate.subtitle}`}>
            {t("home.guestHero.description")}
          </p>

          <div className={`mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 ${animate.cta}`}>
            <a href="#guest-departures" className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-brand-glow transition-[transform,box-shadow] duration-150 active:scale-95 motion-reduce:transition-none sm:text-base">
              {t("home.guestHero.primaryCta")}
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
            </a>
            <a href="/login?redirect=/teams" className="inline-flex min-h-10 items-center text-sm font-semibold text-stone-700 hover:text-amber-800 dark:text-stone-300 dark:hover:text-amber-300">
              {t("home.guestHero.loginPrompt")}
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("home.guestHero.noLoginRequired")}</p>
        </div>

        <div className={`relative mx-auto w-full lg:mx-0 ${animate.search}`}>
          <HomeDepartureStack teams={data.teams} />
        </div>
      </div>
    </section>
  );
}

function LegacyMemberHero({ data }: { data: HomeData }) {
  const { t } = useI18n(["common", "home"]);

  return (
    <section className="relative isolate overflow-hidden border-b border-border/70 bg-background">
      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:items-center lg:gap-16 lg:px-8 lg:pb-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">{t("home.memberHero.kicker")}</p>
          <h1 className="mt-5 max-w-xl text-[clamp(2.75rem,7vw,5.25rem)] font-bold leading-[1.03] tracking-[-0.045em] text-foreground">
            <span className="block">{t("home.memberHero.titleLine1")}</span>
            <span className="block text-primary">{t("home.memberHero.titleLine2")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-stone-700 dark:text-stone-300 sm:text-lg">{t("home.memberHero.description")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5 text-sm font-bold">
            <a href="/my-teams" className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground transition-transform duration-150 active:scale-95">
              {t("common.myTeams")}
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true" />
            </a>
            <a href="/teams/create" className="inline-flex min-h-10 items-center text-stone-700 hover:text-amber-800 dark:text-stone-300 dark:hover:text-amber-300">{t("common.exploreCreate")}</a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:mx-0"><HomeLocationStack locations={data.locations} /></div>
      </div>
    </section>
  );
}
