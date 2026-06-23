import { ArrowRight, Users, Compass, MapPin, Calendar } from "lucide-react";
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
        {/* 标题区域重设计 */}
        <div className="flex flex-col items-center text-center mb-16">
          {/* 大图标 */}
          <div className="mb-6 relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Compass className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Users className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* 标签 */}
          <span className="inline-block mb-4 px-4 py-1.5 text-xs font-semibold rounded-full uppercase tracking-widest bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
            {t("home.recentTeams")}
          </span>

          {/* 大标题 */}
          <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            {t("teams.pageTitle")}
          </h2>

          {/* 副标题 */}
          <p className="text-muted-foreground max-w-3xl leading-relaxed text-xl mb-8">
            {t("teams.pageSubtitle")}
          </p>

          {/* 统计数据 */}
          <div className="flex items-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-foreground">1,200+</div>
                <div className="text-sm text-muted-foreground">{t("home.activeUsers") || "活跃用户"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-foreground">350+</div>
                <div className="text-sm text-muted-foreground">{t("home.activeTeams") || "活跃队伍"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 网格布局优化 - 3列 */}
        {teamsLoading ? (
          /* 加载状态 - 骨架屏 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        ) : teams.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mb-6">
              <Users className="w-12 h-12 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">
              {t("home.noTeams") || "暂无活跃队伍"}
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              {t("home.noTeamsDescription") || "目前还没有活跃的队伍，成为第一个创建队伍的人吧！"}
            </p>
            <a href="/teams/create">
              <button className="group bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 inline-flex items-center gap-3 shadow-lg hover:shadow-xl hover:scale-105">
                <MapPin className="w-5 h-5" />
                {t("home.createFirstTeam") || "创建第一个队伍"}
              </button>
            </a>
          </div>
        ) : (
          /* 正常状态 - 队伍列表 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.slice(0, 6).map((team, index) => (
              <TeamCard key={team.id} team={team} featured={index === 0} />
            ))}
          </div>
        )}

        {/* CTA 按钮优化 */}
        <div className="text-center mt-16">
          <a href="/teams">
            <button className="group relative bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 inline-flex items-center gap-3 shadow-lg hover:shadow-xl hover:scale-105">
              {t("common.viewAll")}
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}
