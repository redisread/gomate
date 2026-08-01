import { Search, X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeHero({ data }: { data: HomeData }) {
  const { animate, search, handleSearch } = data;
  const { t } = useI18n(["common", "content"]);

  return (
    <section className="relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50/50 dark:from-stone-950 dark:via-stone-950 dark:to-amber-950/20" />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto py-12 sm:py-16">
        <h1 className={`font-bold leading-[1.08] mb-4 ${animate.title}`} style={{ fontSize: "clamp(2.8rem, 7.5vw, 5.2rem)" }}>
          <span className="text-foreground block">{t("content.hero.titleLine1")}</span>
          <span className="block text-gradient-brand">{t("content.hero.titleLine2")}</span>
        </h1>

        <div className="flex justify-center">
          {/* task #180 a11y：muted-foreground (var(--muted-foreground)) on var(--background) = ~3.7:1，小字体挂门禁；改 stone-700/dark:stone-300 = ~7.5:1/8:1 */}
          <p className={`text-lg md:text-xl text-stone-700 dark:text-stone-300 mb-8 w-full max-w-xl leading-relaxed text-center ${animate.subtitle}`}>{t("content.hero.description")}</p>
        </div>

        <div className={`relative max-w-2xl mx-auto group ${animate.search}`}>
          <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none transition-colors duration-200 text-muted-foreground" />
          <input type="text" placeholder={t("common.searchPlaceholder")} value={search.value}
            onChange={(e) => search.setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(search.value); }}
            onFocus={() => search.setFocused(true)} onBlur={() => search.setFocused(false)}
            className="w-full pl-11 sm:pl-14 pr-28 sm:pr-32 py-3 sm:py-4 bg-card/95 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground text-sm sm:text-base transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-250 focus:outline-none focus:ring-4 focus:ring-amber-400/15 focus:border-amber-400"
            style={{ boxShadow: search.isFocused ? "0 6px 28px color-mix(in oklab, var(--primary) 20%, transparent)" : "0 4px 20px color-mix(in oklab, var(--foreground) 8%, transparent)", backdropFilter: "blur(8px)" }} />
          {search.value && (
            <button onClick={search.clear} className="absolute right-20 sm:right-28 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 animate-spin-in">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => handleSearch(search.value)}
            /* task #180 a11y：amber-600 (var(--primary)) on white = ~3.3:1 挂门禁；amber-700 (oklch(0.555 0.146 49)) = ~5.5:1 稳过 */
            className={`absolute right-3 top-1/2 -translate-y-1/2 px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl text-white transition-colors duration-150 bg-amber-700 hover:bg-amber-800 shadow-brand-glow ${search.isButtonBouncing ? "animate-bounce-in" : ""}`}>
            {t("common.search")}
          </button>
        </div>
      </div>
    </section>
  );
}
