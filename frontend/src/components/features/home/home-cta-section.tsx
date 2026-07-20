import { Sparkles } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeCtaSection({ data }: { data: Omit<HomeData, "isLoggedIn"> & { isLoggedIn?: boolean } }) {
  const { ctaRef, ctaInView } = data;
  const { t } = useI18n(["home"]);

  return (
    <section ref={ctaRef}
      className={`py-16 sm:py-20 lg:py-24 section-hidden bg-muted/30 dark:bg-muted/10 ${ctaInView ? "section-visible" : ""}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* 小徽章 */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-sm mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold uppercase tracking-widest">{t("home.cta.title")}</span>
        </div>

        {/* 适中标题 */}
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          {t("home.cta.subtitle")}
        </h2>

        {/* 简洁副标题 */}
        {/* task #180 a11y：cta subtitle muted 16px 挂门禁 */}
        <p className="text-stone-700 dark:text-stone-300 text-base mb-8">
          <strong className="text-foreground">200+</strong> 伙伴已找到同行的人
        </p>

        {/* 统一按钮样式 - rounded-lg */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* task #180 a11y：bg-primary (#D97706 amber-600) + primary-foreground (cream) = ~3.3:1 挂；amber-700 + white = ~5.5:1 稳过 */}
          <a href="/teams/create"
            className="px-6 py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition-colors">
            {t("home.cta.createTeamBtn")}
          </a>
          <a href="/teams"
            className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors">
            {t("home.cta.viewAllTeamsLink")}
          </a>
        </div>
      </div>
    </section>
  );
}
