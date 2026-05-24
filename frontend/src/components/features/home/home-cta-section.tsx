import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeCtaSection({ data }: { data: HomeData }) {
  const { isLoggedIn, isDark, ctaRef, ctaInView } = data;
  const { t } = useI18n(["home"]);

  // SSR 默认使用亮色模式，hydration 完成后客户端主题会自动同步
  const effectiveIsDark = isDark;

  return (
    <section ref={ctaRef}
      className={`py-16 sm:py-20 lg:py-24 section-hidden ${ctaInView ? "section-visible" : ""}`}
      style={{
        background: effectiveIsDark
          ? "linear-gradient(160deg, #1c1608 0%, #12100d 50%, #1a1510 100%)"
          : "linear-gradient(160deg, #FFFBEB 0%, #faf8f5 50%, #f5f0e8 100%)",
      }}>
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#D97706" }}>{t("home.cta.title")}</p>

        <h2 className="font-bold leading-tight mb-5 text-foreground" style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>
          {t("home.cta.subtitle")}
        </h2>

        <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          {t("home.cta.description", { count: 200 })}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isLoggedIn && (
            <a href="/register"
              className="inline-block px-8 py-3.5 font-semibold rounded-full text-white text-base transition-all duration-150"
              style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)", boxShadow: "0 4px 18px rgba(217,119,6,0.38)" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 26px rgba(217,119,6,0.50)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 4px 18px rgba(217,119,6,0.38)"; }}>
              {t("home.cta.joinBtn")}
            </a>
          )}
          <a href="/teams"
            className="inline-block px-8 py-3.5 font-semibold rounded-full text-base text-foreground transition-all duration-150 border-2"
            style={{ borderColor: "rgba(217,119,6,0.35)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(217,119,6,0.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>
            {t("home.cta.browseTeamsBtn")}
          </a>
        </div>
      </div>
    </section>
  );
}
