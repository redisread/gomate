import type { Team } from "@/contracts";
import {
  formatTeamSchedule,
  formatTeamStart,
  getTeamDisplayStatus,
} from "@/lib/team-display";

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/** Explicit projection keeps member-only and profile fields out of the renderer. */
export function createPosterContent(
  team: Team,
  locale: string,
  origin: string,
  t: Translate,
) {
  const timeZone = team.location?.region?.timezone ?? "UTC";
  const start = formatTeamStart(team, locale, timeZone);
  const schedule = formatTeamSchedule(team, locale, timeZone);
  return {
    title: team.title,
    location: team.location?.name ?? t("teams.poster.locationUnavailable"),
    coverUrl: team.location?.coverImageUrl ?? null,
    activity: t(`enums.locationType.${team.activityType}`),
    capacity: t("teams.poster.capacity", { count: team.maxParticipants }),
    status: t(`teams.poster.status.${getTeamDisplayStatus(team)}`),
    date: start.date,
    weekday: schedule.weekday,
    startTime: start.time,
    endTime: schedule.end,
    timeZone: schedule.timeZone,
    endLabel: t("teams.poster.expectedEnd"),
    scanLabel: t("teams.poster.scan"),
    note: t("teams.poster.snapshotNote"),
    url: new URL(
      `${locale === "en" ? "/en" : ""}/teams/${encodeURIComponent(team.id)}`,
      origin,
    ).href,
  };
}

export type TeamPosterContent = ReturnType<typeof createPosterContent>;
