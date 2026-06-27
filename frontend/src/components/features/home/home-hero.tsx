import { Mountain, Search, X, Map, Users, Shield } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeHero({ data }: { data: HomeData }) {
  const { animate, search, handleSearch } = data;
  const { t } = useI18n(["home", "common", "content"]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50/50 dark:from-stone-950 dark:via-stone-950 dark:to-amber-950/20" />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-24 pb-16">
        <span className={`inline-flex items-center gap-1.5 mb-7 px-4 py-1.5 text-sm font-medium rounded-full border ${animate.badge} bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-300`}>
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
          <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none transition-colors duration-200 text-muted-foreground" />
          <input type="text" placeholder={t("common.searchPlaceholder")} value={search.value}
            onChange={(e) => search.setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(search.value); }}
            onFocus={() => search.setFocused(true)} onBlur={() => search.setFocused(false)}
            className="w-full pl-11 sm:pl-14 pr-28 sm:pr-32 py-3 sm:py-4 bg-card/95 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground text-sm sm:text-base transition-all duration-250 focus:outline-none focus:ring-4 focus:ring-amber-400/15 focus:border-amber-400"
            style={{ boxShadow: search.isFocused ? "0 6px 28px rgba(217,119,6,0.20)" : "0 4px 20px rgba(30,24,18,0.08)", backdropFilter: "blur(8px)" }} />
          {search.value && (
            <button onClick={search.clear} className="absolute right-20 sm:right-28 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 animate-spin-in">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => handleSearch(search.value)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl text-white transition-colors duration-150 bg-amber-600 hover:bg-amber-700 shadow-brand-glow ${search.isButtonBouncing ? "animate-bounce-in" : ""}`}>
            {t("common.search")}
          </button>
        </div>

        <div className={`flex flex-col sm:flex-row gap-3 justify-center mb-14 ${animate.cta}`}>
          <a href="/locations"
            className="inline-block px-8 py-3.5 text-white font-semibold rounded-full text-base transition-all duration-150 bg-amber-600 hover:bg-amber-700 shadow-brand-glow hover:shadow-brand-glow-lg hover:-translate-y-0.5">
            {t("content.hero.exploreBtn")}
          </a>
          <a href="/teams"
            className="inline-block px-8 py-3.5 font-semibold rounded-full border-2 text-base text-foreground transition-all duration-150 border-amber-300/60 dark:border-amber-700/60 hover:bg-amber-50 dark:hover:bg-amber-950/20">
            {t("content.hero.findTeamBtn")}
          </a>
        </div>

        <div className={`flex flex-wrap justify-center gap-6 ${animate.stats}`}>
          {[
            { icon: Map, title: t("content.hero.statRoutes"), desc: t("content.hero.statRoutesDesc") },
            { icon: Users, title: t("content.hero.statPlayers"), desc: t("content.hero.statPlayersDesc") },
            { icon: Shield, title: t("content.hero.statSafety"), desc: t("content.hero.statSafetyDesc") },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-br from-card/80 to-amber-50/60 dark:to-amber-950/30 border border-amber-200/40 dark:border-amber-900/40" style={{ backdropFilter: "blur(8px)" }}>
                <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
