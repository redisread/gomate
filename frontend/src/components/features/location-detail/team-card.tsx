import * as React from "react";
import { CalendarDays, ArrowRight } from "lucide-react";
import type { Team } from "@/lib/types";
import { TeamProgress, TeamUrgencyLabel, TeamLeaderMini } from "@/components/features/teams/shared";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {

  const dateInfo = React.useMemo(() => {
    if (!team.date) return null;
    const parts = team.date.split("-");
    if (parts.length < 3) return null;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      month: monthNames[month - 1] ?? `${month}`,
      day: String(day),
      full: team.date,
    };
  }, [team.date]);

  return (
    <a href={`/teams/${team.id}`} className="block group">
      <div className="p-4 rounded-xl bg-card border border-stone-100 dark:border-stone-800 hover:border-amber-100 hover:shadow-[0_4px_20px_rgba(217,119,6,0.12)] hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-start gap-3 mb-3">
          {dateInfo ? (
            <div className="flex-shrink-0 w-12 rounded-xl overflow-hidden border border-stone-100 dark:border-stone-800 shadow-sm group-hover:shadow-md group-hover:border-amber-100 transition-all duration-200">
              <div className="bg-amber-500 group-hover:bg-amber-600 py-0.5 text-center transition-colors">
                <span className="text-[9px] font-bold text-white tracking-widest uppercase">
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
              status={team.status}
              currentMembers={team.currentMembers}
              maxMembers={team.maxMembers}
              date={team.date}
              variant="badge"
            />
            <ArrowRight className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all duration-150" />
          </div>
        </div>

        <TeamProgress
          current={team.currentMembers}
          max={team.maxMembers}
          status={team.status}
          showLabel={true}
          size="sm"
        />
      </div>
    </a>
  );
}
