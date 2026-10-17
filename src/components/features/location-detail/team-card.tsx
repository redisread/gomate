import { CalendarDays, ArrowUpRight } from "lucide-react";
import type { Team } from "@/lib/types";
import { useI18n } from "@/hooks/useI18n";
import { getTeamDisplayStatus } from "@/lib/team-display";
import {
  TeamProgress,
  TeamUrgencyLabel,
  TeamLeaderMini,
} from "@/components/features/teams/shared";

export function TeamCard({ team }: { team: Team }) {
  const { locale } = useI18n(["teams", "common"]);
  const start = new Date(team.startAt);
  const validDate = !Number.isNaN(start.getTime());
  const displayStatus = getTeamDisplayStatus(team);
  return (
    <a
      href={`/teams/${team.id}`}
      className="group block rounded-2xl bg-card p-4 shadow-card transition-[background-color,box-shadow] duration-150 hover:bg-warm-subtle hover:shadow-card-hover sm:p-5"
    >
      <div className="flex gap-4">
        <div className="flex w-14 shrink-0 flex-col items-center justify-center border-e border-dashed border-border pe-4 sm:w-16">
          {validDate ? (
            <time
              dateTime={team.startAt}
              aria-label={start.toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              className="text-center tabular-nums"
            >
              <span className="block text-xs font-semibold text-accent-foreground">
                {start.toLocaleDateString(locale, { month: "short" })}
              </span>
              <span className="mt-1 block text-3xl font-bold leading-none text-foreground">
                {start.getDate()}
              </span>
            </time>
          ) : (
            <CalendarDays
              aria-hidden="true"
              className="h-6 w-6 text-muted-foreground"
            />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <h3 className="min-w-0 flex-1 break-words text-base font-semibold leading-6 text-foreground group-hover:text-accent-foreground">
              {team.title}
            </h3>
            <ArrowUpRight
              aria-hidden="true"
              className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TeamLeaderMini leader={team.leader} size="sm" />
            <TeamUrgencyLabel
              status={displayStatus}
              activeParticipantCount={team.activeParticipantCount}
              maxParticipants={team.maxParticipants}
              startAt={team.startAt}
              variant="badge"
            />
          </div>
          <TeamProgress
            current={team.activeParticipantCount}
            max={team.maxParticipants}
            status={displayStatus}
            showLabel
            size="sm"
          />
        </div>
      </div>
    </a>
  );
}
