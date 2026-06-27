import { Search, Users, Compass, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { RefObject } from "react";

export function HomeHowItWorksSection({ sectionRef, isInView }: { sectionRef: RefObject<HTMLDivElement>; isInView: boolean }) {
  const { t } = useI18n(["home"]);

  const steps = [
    { step: "01", icon: MapPin, title: t("home.howItWorks.discoverTitle"), desc: t("home.howItWorks.discoverDesc"), href: "/locations", cta: t("home.howItWorks.discoverCta"), color: "amber" },
    { step: "02", icon: Users, title: t("home.howItWorks.findTeamTitle"), desc: t("home.howItWorks.findTeamDesc"), href: "/teams", cta: t("home.howItWorks.findTeamCta"), color: "orange" },
    { step: "03", icon: Compass, title: t("home.howItWorks.departTitle"), desc: t("home.howItWorks.departDesc"), href: "/teams/create", cta: t("home.howItWorks.departCta"), color: "amber" },
  ];

  const colorMap: Record<string, { bg: string; text: string; hoverBg: string; numText: string }> = {
    amber: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", hoverBg: "hover:bg-amber-600 hover:text-white", numText: "text-amber-600/15 dark:text-amber-400/15" },
    orange: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-300", hoverBg: "hover:bg-orange-600 hover:text-white", numText: "text-orange-600/15 dark:text-orange-400/15" },
  };

  return (
    <section ref={sectionRef} className={`py-16 sm:py-20 lg:py-24 section-hidden bg-muted/30 dark:bg-muted/10 ${isInView ? "section-visible" : ""}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-widest bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">{t("home.howItWorks.badge")}</span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("home.howItWorks.title")}</h2>
          <div className="flex justify-center">
            <p className="text-muted-foreground text-lg w-full max-w-xl leading-relaxed text-center">{t("home.howItWorks.subtitle")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((item) => {
            const Icon = item.icon;
            const c = colorMap[item.color] ?? colorMap.amber;
            return (
              <div key={item.step} className="rounded-2xl p-7 bg-card border border-border shadow-warm-sm flex flex-col transition-all duration-250 hover:shadow-warm-md hover:-translate-y-1">
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                    <Icon className={`h-7 w-7 ${c.text}`} />
                  </div>
                  <span className={`text-5xl font-black leading-none select-none ${c.numText}`}>{item.step}</span>
                </div>
                <h3 className={`text-xl font-bold mb-3 text-center ${c.text}`}>{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5 text-center">{item.desc}</p>
                <a href={item.href}>
                  <button className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${c.bg} ${c.text} ${c.hoverBg}`}>
                    {item.cta}
                  </button>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
