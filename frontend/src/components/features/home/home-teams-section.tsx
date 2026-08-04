import { ArrowRight, UsersRound } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { TeamCard } from "./home-team-card";
import { TeamCardSkeleton } from "./home-team-card-skeleton";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeTeamsSection({ data, isMember = false }: { data: HomeData; isMember?: boolean }) {
  const { teams, teamsLoading, teamsRef, teamsInView } = data;
  const { t } = useI18n(["home", "teams", "common"]);

  return (
    <section id="teams" ref={teamsRef}
      className={`bg-secondary/30 py-16 sm:py-20 lg:py-24 section-hidden ${teamsInView ? "section-visible" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title area */}
        <div className="mb-8 max-w-2xl sm:mb-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
            {t("teams.pageTitle")}
          </h2>
          <p className="mt-3 text-base leading-7 text-stone-700 dark:text-stone-300">{t("common.tagline")}</p>
        </div>

        {/* Grid */}
        {teamsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="home-empty-state rounded-[1.5rem] border border-dashed border-primary/35 bg-primary-50/50 px-6 py-10 text-center dark:bg-primary/10">
            <UsersRound className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">{t(isMember ? "home.teamsEmpty.memberTitle" : "home.teamsEmpty.guestTitle")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-700 dark:text-stone-300">{t("home.teamsEmpty.description")}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a href="/teams" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">
                {t("common.exploreTeams")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="/teams/create" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-primary hover:text-white">
                {t("common.exploreCreate")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
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
          <a href="/teams" className="group inline-flex items-center gap-2 rounded-2xl border border-border px-7 py-3.5 text-base font-semibold text-foreground transition-[transform,background-color,border-color,color,box-shadow] duration-200 hover:border-amber-300 hover:text-amber-700 hover:shadow-warm-sm active:scale-[0.96] dark:hover:border-amber-700 dark:hover:text-amber-400">
            {t("common.viewAll")}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
