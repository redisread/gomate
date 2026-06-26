import { Mountain, Search, X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeHero({ data }: { data: HomeData }) {
  const { isDark, animate, search, handleSearch } = data;
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

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-24 pb-16">
        <span className={`inline-flex items-center gap-1.5 mb-7 px-4 py-1.5 text-sm font-medium rounded-full border ${animate.badge}`}
          style={{ background: effectiveIsDark ? "rgba(217,119,6,0.15)" : "rgba(217,119,6,0.08)", borderColor: effectiveIsDark ? "rgba(217,119,6,0.3)" : "rgba(217,119,6,0.22)", color: effectiveIsDark ? "#FCD34D" : "#92400E" }}>
          <Mountain className="h-3.5 w-3.5" />{t("content.hero.badge")}
        </span>

        <h1 className={`font-bold leading-[1.08] mb-6 ${animate.title}`} style={{ fontSize: "clamp(2.8rem, 7.5vw, 5.2rem)" }}>
          <span className="text-foreground block">{t("content.hero.titleLine1")}</span>
          <span className="block text-gradient-brand">{t("content.hero.titleLine2")}</span>
        </h1>

        <div className="flex justify-center">
          <p className={`text-lg md:text-xl text-muted-foreground mb-10 w-full max-w-xl leading-relaxed text-center ${animate.subtitle}`}>{t("content.hero.description")}</p>
        </div>

        <div className={`relative max-w-2xl mx-auto mb-8 group ${animate.search}`}>
          <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none transition-colors duration-200 text-muted-foreground"
            style={{ color: search.isFocused ? "#D97706" : undefined }} />
          <input type="text" placeholder={t("common.searchPlaceholder")} value={search.value}
            onChange={(e) => search.setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(search.value); }}
            onFocus={() => search.setFocused(true)} onBlur={() => search.setFocused(false)}
            className="w-full pl-11 sm:pl-14 pr-28 sm:pr-32 py-3 sm:py-4 bg-card/95 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground text-sm sm:text-base transition-all duration-250 focus:outline-none"
            style={{ boxShadow: search.isFocused ? "0 6px 28px rgba(217,119,6,0.20), 0 0 0 3px rgba(217,119,6,0.12)" : "0 4px 20px rgba(30,24,18,0.08)", backdropFilter: "blur(8px)" }} />
          {search.value && (
            <button onClick={search.clear} className="absolute right-20 sm:right-28 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 animate-spin-in">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => handleSearch(search.value)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl text-white transition-colors duration-150 ${search.isButtonBouncing ? "animate-bounce-in" : ""}`}
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
    </section>
  );
}
