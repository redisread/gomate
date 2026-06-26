import { Search, Users, Compass } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { RefObject } from "react";

export function HomeHowItWorksSection({ sectionRef, isInView }: { sectionRef: RefObject<HTMLDivElement>; isInView: boolean }) {
  const { t } = useI18n(["home"]);

  const steps = [
    { step: "01", icon: <Search className="h-7 w-7" />, emoji: "🗺️", title: t("home.howItWorks.discoverTitle"), desc: t("home.howItWorks.discoverDesc"), color: "#D97706", bg: "rgba(217,119,6,0.08)", href: "/locations", cta: t("home.howItWorks.discoverCta") },
    { step: "02", icon: <Users className="h-7 w-7" />, emoji: "👥", title: t("home.howItWorks.findTeamTitle"), desc: t("home.howItWorks.findTeamDesc"), color: "#ff7a65", bg: "rgba(255,122,101,0.08)", href: "/teams", cta: t("home.howItWorks.findTeamCta") },
    { step: "03", icon: <Compass className="h-7 w-7" />, emoji: "🎒", title: t("home.howItWorks.departTitle"), desc: t("home.howItWorks.departDesc"), color: "#92400E", bg: "rgba(146,64,14,0.08)", href: "/teams/create", cta: t("home.howItWorks.departCta") },
  ];

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
          {steps.map((item) => (
            <div key={item.step} className="rounded-2xl p-7 bg-card flex flex-col"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)", transition: "transform 0.25s ease, box-shadow 0.25s ease" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-5px)"; el.style.boxShadow = `0 14px 36px rgba(30,24,18,0.10), 0 0 0 2px ${item.color}22`; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: item.bg }}>{item.emoji}</div>
                <span className="text-5xl font-black leading-none select-none" style={{ color: item.bg.replace("0.08", "0.18") }}>{item.step}</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center" style={{ color: item.color }}>{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5 text-center">{item.desc}</p>
              <a href={item.href}>
                <button className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                  style={{ background: item.bg, color: item.color }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = item.color; el.style.color = "#fff"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = item.bg; el.style.color = item.color; }}>
                  {item.cta}
                </button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
