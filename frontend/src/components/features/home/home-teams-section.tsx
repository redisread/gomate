import { ArrowRight, Users, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { TeamCard } from "./home-team-card";
import { TeamCardSkeleton } from "./home-team-card-skeleton";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeTeamsSection({ data }: { data: HomeData }) {
  const { teams, teamsLoading, teamsRef, teamsInView } = data;
  const { t } = useI18n(["home", "teams", "common"]);

  return (
    <section id="teams" ref={teamsRef}
      className={`py-16 sm:py-20 lg:py-24 bg-background section-hidden ${teamsInView ? "section-visible" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title area */}
        <div className="flex flex-col items-center text-center mb-12">
          <span className="inline-block mb-4 px-4 py-1.5 text-xs font-semibold rounded-full uppercase tracking-widest bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
            {t("home.recentTeams")}
          </span>
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
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-5">
              <Users className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              {t("home.noTeams") || "暂无活跃队伍"}
            </h3>
            {/* task #180 a11y：empty state desc muted 挂门禁 */}
            <p className="text-stone-700 dark:text-stone-300 text-center max-w-md mb-6">
              {t("home.noTeamsDescription") || "目前还没有活跃的队伍，成为第一个创建队伍的人吧！"}
            </p>
            <a href="/teams/create">
              {/* task #180 a11y：amber-600 (#D97706) on white = ~3.2:1 挂门禁；amber-700 + white = ~5.5:1 */}
              <button className="group bg-amber-700 hover:bg-amber-800 text-white px-7 py-3.5 rounded-2xl text-base font-semibold transition-all duration-200 inline-flex items-center gap-2.5 hover:shadow-lg hover:shadow-amber-200/40 active:scale-[0.98]">
                <MapPin className="w-5 h-5" />
                {t("home.createFirstTeam") || "创建第一个队伍"}
              </button>
            </a>
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
