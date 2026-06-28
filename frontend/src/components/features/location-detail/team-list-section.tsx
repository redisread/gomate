import { Users, ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { Team } from "@/lib/types";
import { TeamCard } from "./team-card";

interface TeamListSectionProps {
  teams: Team[];
  locationId: string;
}

export function TeamListSection({ teams, locationId }: TeamListSectionProps) {
  const { t } = useI18n(["locations", "common"]);
  const MAX_DISPLAY_TEAMS = 3;
  const displayedTeams = teams.slice(0, MAX_DISPLAY_TEAMS);
  const hasMore = teams.length > MAX_DISPLAY_TEAMS;

  return (
    <div className="bg-card rounded-xl border border-stone-100 dark:border-stone-800 p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-emerald-400 flex-shrink-0" />
            {t('locations.detailWaiting')}
          </h2>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 pl-3">
            {teams.length > 0
              ? `${teams.length} ${t('locations.teamsWaitingDesc')}`
              : t('locations.detailNoTeamsDesc')}
          </p>
        </div>
        <a
          href={`/teams/create?locationId=${locationId}`}
          className="text-xs text-amber-600 hover:text-amber-700 font-semibold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          {t('locations.detailCreateTeam')}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {teams.length === 0 ? (
        <EmptyTeamsState locationId={locationId} />
      ) : (
        <>
          <div className="space-y-4">
            {displayedTeams.map((team: Team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
              <a href={`/teams?locationId=${locationId}`} className="block">
                <button className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] flex items-center justify-center gap-1.5 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700">
                  {t("common.viewAllTeams").replace("{count}", String(teams.length))}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyTeamsState({ locationId }: { locationId: string }) {
  const { t } = useI18n(["locations", "common"]);
  return (
    <div className="flex flex-col items-center py-10">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-amber-100/80 dark:bg-amber-900/40 flex items-center justify-center">
            <Users
              className="h-6 w-6 text-amber-400 motion-reduce:animate-none"
              style={{ animation: "float 3s ease-in-out infinite" }}
            />
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-200 dark:bg-amber-800" />
        <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 rounded-full bg-amber-200 dark:bg-amber-800" />
      </div>

      <p className="text-stone-500 dark:text-stone-400 text-sm text-center max-w-xs leading-relaxed mb-5">
        {t('locations.detailNoTeamsDesc')}
      </p>

      <a href={`/teams/create?locationId=${locationId}`}>
        <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold transition-all duration-200 shadow-[0_6px_16px_rgba(217,119,6,0.22)] hover:shadow-[0_8px_20px_rgba(217,119,6,0.28)] active:scale-[0.97]">
          <Users className="h-4 w-4" />
          {t('locations.detailNoTeamsBtn')}
        </button>
      </a>
    </div>
  );
}
