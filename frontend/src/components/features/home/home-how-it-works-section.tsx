import { Compass, Footprints, UsersRound } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

const STEPS = [
  { icon: Compass, key: "discover" },
  { icon: UsersRound, key: "team" },
  { icon: Footprints, key: "go" },
] as const;

export function HomeHowItWorksSection() {
  const { t } = useI18n(["home"]);

  return (
    <section className="home-how-it-works border-y border-border/70 bg-secondary/45 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="home-section-kicker">{t("home.howItWorks.kicker")}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("home.howItWorks.title")}</h2>
          <p className="mt-4 text-base leading-7 text-stone-700 dark:text-stone-300">{t("home.howItWorks.description")}</p>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5 lg:mt-12">
          {STEPS.map(({ icon: Icon, key }, index) => (
            <li key={key} className="home-step-card relative rounded-[1.35rem] border border-border bg-card p-6 shadow-card sm:p-7">
              <span className="home-step-number" aria-hidden="true">0{index + 1}</span>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-brand">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-foreground">{t(`home.howItWorks.steps.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700 dark:text-stone-300">{t(`home.howItWorks.steps.${key}.description`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
