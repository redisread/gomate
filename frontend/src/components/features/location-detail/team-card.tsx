import * as React from "react";
import { CalendarDays, ArrowRight } from "lucide-react";
import type { Team } from "@/lib/types";
import { getTeamDisplayStatus } from "@/lib/team-display";
import { TeamProgress, TeamUrgencyLabel, TeamLeaderMini } from "@/components/features/teams/shared";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const dateInfo = React.useMemo(() => {
    const start = new Date(team.startAt);
    if (Number.isNaN(start.getTime())) return null;
    const month = start.getUTCMonth() + 1;
    const day = start.getUTCDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      month: monthNames[month - 1] ?? `${month}`,
      day: String(day),
      full: team.startAt,
    };
  }, [team.startAt]);
  const displayStatus = getTeamDisplayStatus(team);

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <div className="rounded-xl bg-stone-50/70 p-4 transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-amber-50/60 hover:shadow-[0_4px_20px_rgba(217,119,6,0.12)] dark:bg-stone-900/60 dark:hover:bg-amber-950/20">
        <div className="flex items-start gap-3 mb-3">
          {dateInfo ? (
              <div className="flex-shrink-0 w-12 overflow-hidden rounded-xl shadow-sm transition-[transform,box-shadow] duration-200 group-hover:shadow-md">
              <div className="bg-amber-700 dark:bg-amber-500 group-hover:bg-amber-800 dark:group-hover:bg-amber-400 py-0.5 text-center transition-colors">
                <span className="text-3xs font-bold text-white dark:text-stone-950 tracking-widest uppercase">
                  {dateInfo.month}
                </span>
              </div>
              <div className="bg-card py-1.5 text-center">
                <span className="text-2xl font-black text-foreground leading-none">
                  {dateInfo.day}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-stone-50 dark:bg-stone-900 flex items-center justify-center border border-stone-100 dark:border-stone-800">
              <CalendarDays className="h-5 w-5 text-stone-300 dark:text-stone-600" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors text-sm leading-snug line-clamp-2 mb-1">
              {team.title}
            </h3>
            <TeamLeaderMini leader={team.leader} size="sm" />
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
            <TeamUrgencyLabel
              status={displayStatus}
              activeParticipantCount={team.activeParticipantCount}
              maxParticipants={team.maxParticipants}
              startAt={team.startAt}
              variant="badge"
            />
            <ArrowRight className="h-3.5 w-3.5 text-stone-400 dark:text-stone-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150" />
          </div>
        </div>

        <TeamProgress
          current={team.activeParticipantCount}
          max={team.maxParticipants}
          status={displayStatus}
          showLabel={true}
          size="sm"
        />
      </div>
    </a>
  );
}
