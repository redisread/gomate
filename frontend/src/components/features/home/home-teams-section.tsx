import { ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { useHomeData } from "./use-home-data";
import { TeamCard } from "./home-team-card";

type HomeData = ReturnType<typeof useHomeData>;

export function HomeTeamsSection({ data }: { data: HomeData }) {
  const { teams, teamsRef, teamsInView } = data;
  const { t } = useI18n();

  return (
    <section id="teams" ref={teamsRef}
      className={`py-20 bg-background section-hidden ${teamsInView ? "section-visible" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-widest bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">{t("home.recentTeams")}</span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("teams.pageTitle")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-lg">{t("teams.pageSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {teams.map((team) => <TeamCard key={team.id} team={team} />)}
        </div>

        <div className="text-center mt-10">
          <a href="/teams">
            <button className="border border-border hover:bg-accent text-foreground hover:text-brand px-7 py-3 rounded-xl text-sm font-medium transition-all duration-150 inline-flex items-center gap-2">
              {t("common.viewAll")}<ArrowRight className="h-4 w-4" />
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}
