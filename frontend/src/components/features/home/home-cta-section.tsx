import { Sparkles, Users, ArrowRight, Check } from "lucide-react";
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
      className={`py-24 sm:py-32 section-hidden ${ctaInView ? "section-visible" : ""}`}
      style={{
        background: effectiveIsDark
          ? "linear-gradient(160deg, #1c1608 0%, #12100d 50%, #1a1510 100%)"
          : "linear-gradient(180deg, #fef3c7 0%, #faf8f5 50%, #f5f0e8 100%)",
      }}>
      <div className="max-w-4xl mx-auto px-4 text-center">
        {/* 1. 标题区域优化 - 大图标和动画 */}
        <div className="mb-8 relative">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 mb-6 shadow-2xl animate-float">
            <Users className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Badge with icon */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] mb-6" style={{ background: "#fffbeb", border: "1px solid rgba(217,119,6,0.2)" }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#D97706" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#D97706" }}>{t("home.cta.title")}</span>
        </div>

        {/* 2. 主标题 - 增大字号到 56px */}
        <h2 className="font-bold leading-tight mb-6 text-foreground" style={{ fontSize: "56px", letterSpacing: "-1px" }}>
          {t("home.cta.subtitle")}
        </h2>

        {/* 3. 副标题优化 - 添加统计数据和图标 */}
        <div className="flex items-center justify-center gap-6 mb-12">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-lg text-muted-foreground">
              <strong className="text-foreground">200+</strong> 伙伴已找到同行的人
            </span>
          </div>
        </div>

        {/* 4. 按钮样式优化 - 增强渐变和动画 */}
        <div className="flex flex-row gap-4 justify-center items-center">
          {/* Primary button with enhanced gradient and animation */}
          <a href="/teams/create"
            className="group relative inline-flex items-center gap-3 px-10 py-5 font-bold rounded-[32px] text-white text-lg transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
              boxShadow: "0 8px 24px rgba(217,119,6,0.4)"
            }}>
            <Users className="w-5 h-5" />
            {t("home.cta.createTeamBtn")}
            <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </a>
          {/* Secondary button with optimized border and hover */}
          <a href="/teams"
            className="inline-flex items-center gap-2 px-8 py-5 font-semibold rounded-[32px] text-foreground text-lg transition-all duration-300 bg-white/80 backdrop-blur border-2 border-amber-200 hover:border-amber-400 hover:bg-white">
            {t("home.cta.viewAllTeamsLink")}
            <ArrowRight className="h-5 w-5" style={{ color: "#D97706" }} />
          </a>
        </div>
      </div>
    </section>
  );
}
