import { ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { HomeDepartureStack } from "./home-departure-stack";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeHero({ data }: { data: HomeData }) {
  const { animate } = data;
  const { t } = useI18n(["home"]);

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
