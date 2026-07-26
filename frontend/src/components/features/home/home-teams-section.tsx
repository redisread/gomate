import { ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { TeamCard } from "./home-team-card";
import { TeamCardSkeleton } from "./home-team-card-skeleton";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeTeamsSection({ data }: { data: HomeData }) {
  const { teams, teamsLoading, teamsRef, teamsInView } = data;
  const { t } = useI18n(["home", "teams", "common"]);

  // 条件渲染：teams.length === 0 时整区不渲染（spec §5）
  if (!teamsLoading && teams.length === 0) {
    return null;
  }

  return (
    <section id="teams" ref={teamsRef}
      className={`py-16 sm:py-20 lg:py-24 bg-background section-hidden ${teamsInView ? "section-visible" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title area */}
        <div className="flex flex-col items-center text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            {t("teams.pageTitle")}
          </h2>
          {/* task #180 a11y：teams subtitle muted 16-18px 挂门禁 */}
          <p className="text-stone-700 dark:text-stone-300 max-w-2xl leading-relaxed text-base sm:text-lg mb-2">
            {t("teams.pageSubtitle")}
          </p>
        </div>

        {/* Grid */}
        {teamsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.slice(0, 6).map((team, index) => (
              <div
                key={team.id}
                className="opacity-0 animate-fade-in-up"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'forwards',
                }}
              >
                <TeamCard team={team} featured={index === 0} />
              </div>
            ))}
          </div>
        )}

        {/* View all button */}
        <div className="text-center mt-14">
          <a href="/teams">
            <button className="group inline-flex items-center gap-2 px-7 py-3.5 border border-border rounded-2xl text-base font-semibold text-foreground transition-all duration-200 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 hover:shadow-warm-sm active:scale-[0.98]">
              {t("common.viewAll")}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}
