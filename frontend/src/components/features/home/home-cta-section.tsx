import { Sparkles, Users, ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeCtaSection({ data }: { data: Omit<HomeData, "isLoggedIn"> & { isLoggedIn?: boolean } }) {
  const { isDark, ctaRef, ctaInView } = data;
  const { t } = useI18n(["home"]);

  // SSR 默认使用亮色模式，hydration 完成后客户端主题会自动同步
  const effectiveIsDark = isDark;

  return (
    <section ref={ctaRef}
      className={`py-20 sm:py-24 lg:py-28 section-hidden ${ctaInView ? "section-visible" : ""}`}
      style={{
        background: effectiveIsDark
          ? "linear-gradient(160deg, #1c1608 0%, #12100d 50%, #1a1510 100%)"
          : "linear-gradient(180deg, #fef3c7 0%, #faf8f5 50%, #f5f0e8 100%)",
      }}>
      <div className="max-w-4xl mx-auto px-4 text-center">
        {/* Badge with icon */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] mb-6" style={{ background: "#fffbeb", border: "1px solid rgba(217,119,6,0.2)" }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#D97706" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#D97706" }}>{t("home.cta.title")}</span>
        </div>

        {/* Main title - 48px, bold, tight letter spacing */}
        <h2 className="font-bold leading-tight mb-5 text-foreground" style={{ fontSize: "48px", letterSpacing: "-0.5px" }}>
          {t("home.cta.subtitle")}
        </h2>

        {/* Subtitle - 18px, gray, centered */}
        <div className="flex justify-center">
          <p className="text-muted-foreground text-lg mb-10 w-full max-w-xl text-center leading-relaxed" style={{ fontSize: "18px" }}>
            {t("home.cta.description", { count: 200 })}
          </p>
        </div>

        {/* Dual buttons */}
        <div className="flex flex-row gap-4 justify-center items-center">
          {/* Primary button with users icon */}
          <a href="/teams/create"
            className="inline-flex items-center gap-2 px-7 py-3.5 font-semibold rounded-[28px] text-white text-base transition-all duration-150"
            style={{ background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)", boxShadow: "0 4px 16px rgba(217,119,6,0.35)" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px rgba(217,119,6,0.45)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 4px 16px rgba(217,119,6,0.35)"; }}>
            <Users className="h-4 w-4" />
            {t("home.cta.createTeamBtn")}
          </a>
          {/* Secondary button with arrow */}
          <a href="/teams"
            className="inline-flex items-center gap-2 px-6 py-3.5 font-semibold rounded-[28px] text-foreground text-base transition-all duration-150 bg-white border border-border hover:bg-accent"
            style={{ borderColor: "rgba(217,119,6,0.3)" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateX(2px)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateX(0)"; }}>
            {t("home.cta.viewAllTeamsLink")}
            <ArrowRight className="h-4 w-4" style={{ color: "#D97706" }} />
          </a>
        </div>
      </div>
    </section>
  );
}
