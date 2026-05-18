import { Mountain, Search, X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeHero({ data }: { data: HomeData }) {
  const { isDark, animate, parallaxY, search, handleSearch } = data;
  const { t } = useI18n(["home", "common", "content"]);

  // SSR 默认使用亮色模式，hydration 完成后客户端主题会自动同步
  const effectiveIsDark = isDark;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{
        background: effectiveIsDark
          ? "linear-gradient(160deg, #1a1510 0%, rgba(217,119,6,0.04) 38%, #12100d 65%, #1a1510 100%)"
          : "linear-gradient(160deg, #FEF3C7 0%, rgba(255,122,101,0.06) 38%, #faf8f5 65%, #f5f0e8 100%)",
      }} />

      <div className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(217,119,6,0.13) 0%, transparent 68%)", transform: `translateY(${parallaxY * 0.8}px)` }} aria-hidden="true" />
      <div className="absolute -bottom-28 -right-28 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,122,101,0.10) 0%, transparent 68%)", transform: `translateY(${-parallaxY * 0.6}px)` }} aria-hidden="true" />
      <div className="absolute top-1/3 right-1/4 w-[220px] h-[220px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(252,211,77,0.16) 0%, transparent 70%)", transform: `translateY(${parallaxY * 1.2}px)` }} aria-hidden="true" />

      <svg className="absolute bottom-0 left-0 right-0 w-full pointer-events-none"
        style={{ opacity: 0.12, transform: `translateY(${parallaxY * 0.5}px)` }}
        viewBox="0 0 1440 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="none">
        <path d="M0 260L100 200L200 230L320 160L440 210L560 130L680 185L800 95L920 150L1040 55L1160 110L1280 35L1440 90V260H0Z" fill="#D97706" />
        <path d="M0 260L160 220L300 250L460 190L600 240L760 165L900 215L1060 145L1200 195L1360 130L1440 170V260H0Z" fill="#92400E" opacity="0.65" />
      </svg>

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-24 pb-16">
        <span className={`inline-flex items-center gap-1.5 mb-7 px-4 py-1.5 text-sm font-medium rounded-full border ${animate.badge}`}
          style={{ background: effectiveIsDark ? "rgba(217,119,6,0.15)" : "rgba(217,119,6,0.08)", borderColor: effectiveIsDark ? "rgba(217,119,6,0.3)" : "rgba(217,119,6,0.22)", color: effectiveIsDark ? "#FCD34D" : "#92400E" }}>
          <Mountain className="h-3.5 w-3.5" />{t("content.hero.badge")}
        </span>

        <h1 className={`font-bold leading-[1.08] mb-6 ${animate.title}`} style={{ fontSize: "clamp(2.8rem, 7.5vw, 5.2rem)" }}>
          <span className="text-foreground block">{t("content.hero.titleLine1")}</span>
          <span className="block text-gradient-brand">{t("content.hero.titleLine2")}</span>
        </h1>

        <p className={`text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed ${animate.subtitle}`}>{t("content.hero.description")}</p>

        <div className={`relative max-w-2xl mx-auto mb-8 group ${animate.search}`}>
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none transition-colors duration-200 text-muted-foreground"
            style={{ color: search.isFocused ? "#D97706" : undefined }} />
          <input type="text" placeholder={t("common.searchPlaceholder")} value={search.value}
            onChange={(e) => search.setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(search.value); }}
            onFocus={() => search.setFocused(true)} onBlur={() => search.setFocused(false)}
            className="w-full pl-14 pr-32 py-4 bg-card/95 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground text-base transition-all duration-250 focus:outline-none"
            style={{ boxShadow: search.isFocused ? "0 6px 28px rgba(217,119,6,0.20), 0 0 0 3px rgba(217,119,6,0.12)" : "0 4px 20px rgba(30,24,18,0.08)", backdropFilter: "blur(8px)" }} />
          {search.value && (
            <button onClick={search.clear} className="absolute right-[5.5rem] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 animate-spin-in">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => handleSearch(search.value)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2 text-sm font-semibold rounded-xl text-white transition-colors duration-150 ${search.isButtonBouncing ? "animate-bounce-in" : ""}`}
            style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)", boxShadow: "0 2px 10px rgba(217,119,6,0.30)" }}>
            {t("common.search")}
          </button>
        </div>

        <div className={`flex flex-col sm:flex-row gap-3 justify-center mb-14 ${animate.cta}`}>
          <a href="/locations"
            className="inline-block px-8 py-3.5 text-white font-semibold rounded-full text-base transition-all duration-150"
            style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)", boxShadow: "0 4px 18px rgba(217,119,6,0.35)" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 28px rgba(217,119,6,0.45)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 4px 18px rgba(217,119,6,0.35)"; }}>
            {t("content.hero.exploreBtn")}
          </a>
          <a href="/teams"
            className="inline-block px-8 py-3.5 font-semibold rounded-full border-2 text-base text-foreground transition-all duration-150 hover:bg-brand/5"
            style={{ borderColor: "rgba(217,119,6,0.35)" }}>
            {t("content.hero.findTeamBtn")}
          </a>
        </div>

        <div className={`flex flex-wrap justify-center gap-6 ${animate.stats}`}>
          {[
            { icon: "🗺️", title: t("content.hero.statRoutes"), desc: t("content.hero.statRoutesDesc") },
            { icon: "👥", title: t("content.hero.statPlayers"), desc: t("content.hero.statPlayersDesc") },
            { icon: "✨", title: t("content.hero.statSafety"), desc: t("content.hero.statSafetyDesc") },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-br from-card/80 to-amber-50/60 dark:to-amber-950/30 border border-amber-200/40 dark:border-amber-900/40" style={{ backdropFilter: "blur(8px)" }}>
              <span className="text-2xl">{item.icon}</span>
              <div>
                <div className="text-sm font-semibold text-foreground">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute left-8 top-1/3 hidden lg:flex flex-col gap-3" aria-hidden="true">
        {[{ icon: "🏔️", label: t("home.floatingLabels.mountain1"), delay: "0s" }, { icon: "🌊", label: t("home.floatingLabels.mountain2"), delay: "-2s" }].map((item) => (
          <div key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-gradient-to-br from-card/95 to-amber-50/80 dark:to-amber-950/60 border border-amber-200/50 dark:border-amber-900/50 animate-float-up"
            style={{ boxShadow: "0 8px 24px rgba(217,119,6,0.12), 0 2px 8px rgba(0,0,0,0.06)", backdropFilter: "blur(12px)", animationDelay: item.delay }}>
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-base">{item.icon}</span>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="absolute right-8 top-1/3 hidden lg:flex flex-col gap-3" aria-hidden="true">
        {[{ icon: "👥", label: t("home.floatingLabels.teamJoined").replace("{count}", "3"), delay: "-1s" }, { icon: "🎒", label: t("home.floatingLabels.dayDepart").replace("{day}", t("home.floatingLabels.saturdayLabel")), delay: "-3.5s" }].map((item) => (
          <div key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-gradient-to-br from-card/95 to-amber-50/80 dark:to-amber-950/60 border border-amber-200/50 dark:border-amber-900/50 animate-float-down"
            style={{ boxShadow: "0 8px 24px rgba(217,119,6,0.12), 0 2px 8px rgba(0,0,0,0.06)", backdropFilter: "blur(12px)", animationDelay: item.delay }}>
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-base">{item.icon}</span>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
