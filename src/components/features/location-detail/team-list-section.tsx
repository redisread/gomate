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
    <section className="rounded-2xl bg-card p-5 shadow-warm-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="h-5 w-1 flex-shrink-0 rounded-full bg-emerald-400" />
            {t('locations.detailWaiting')}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-500 mt-0.5 pl-3">
            {teams.length > 0
              ? `${teams.length} ${t('locations.teamsWaitingDesc')}`
              : t('locations.detailNoTeamsDesc')}
          </p>
        </div>
        {/* 有队伍时 header 提供「再发起一个」快捷入口；空态收敛到下方唯一 CTA，
            避免「召集伙伴出发」在详情页出现 3 次（UX 审计发现） */}
        {teams.length > 0 && (
          <a
            href={`/teams/create?locationId=${locationId}`}
            className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-semibold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            {t('locations.detailCreateTeam')}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
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
            <div className="mt-5 border-t border-stone-100 pt-5 dark:border-stone-800">
              <a
                href={`/teams?locationId=${locationId}`}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-semibold text-amber-700 transition-[transform,background-color,border-color] duration-150 hover:border-amber-300 hover:bg-amber-100 active:scale-[0.96] dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:border-amber-700 dark:hover:bg-amber-900/40"
              >
                {t("common.viewAllTeams").replace("{count}", String(teams.length))}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function EmptyTeamsState({ locationId }: { locationId: string }) {
  const { t } = useI18n(["locations", "common"]);
  return (
    <div className="flex flex-col items-center py-6 sm:py-8">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
        <Users className="h-5 w-5 text-amber-500" />
      </div>

      <p className="mb-4 max-w-xs text-center text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        {t('locations.detailNoTeamsDesc')}
      </p>

      <a
        href={`/teams/create?locationId=${locationId}`}
        className="hidden items-center gap-2 rounded-full bg-amber-700 px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition-[transform,background-color,box-shadow] duration-200 hover:bg-amber-800 hover:shadow-warm-md active:scale-[0.96] dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 sm:inline-flex"
      >
        <Users className="h-4 w-4" />
        {t('locations.detailNoTeamsBtn')}
      </a>
    </div>
  );
}
