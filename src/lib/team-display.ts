import type { Team } from "@/contracts";

export type TeamDisplayStatus =
  | "recruiting"
  | "full"
  | "closed"
  | "formed"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "expired_unformed";

function validDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getTeamDurationMinutes(team: Pick<Team, "startAt" | "endAt">): number {
  const start = validDate(team.startAt)?.getTime();
  const end = validDate(team.endAt)?.getTime();
  if (start === undefined || end === undefined || end < start) return 0;
  return Math.round((end - start) / 60_000);
}

export function formatTeamStart(
  team: Pick<Team, "startAt">,
  locale?: string,
  timeZone?: string,
): { date: string; time: string } {
  const start = validDate(team.startAt);
  if (!start) return { date: "", time: "" };

  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(start);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}/${value("month")}/${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

export function getTeamDisplayStatus(
  team: Pick<Team, "lifecycle" | "recruitmentStatus" | "isFull">,
): TeamDisplayStatus {
  switch (team.lifecycle) {
    case "cancelled":
      return "cancelled";
    case "completed":
      return "completed";
    case "in_progress":
      return "ongoing";
    case "formed":
      return "formed";
    case "expired_unformed":
      return "expired_unformed";
    case "pending":
      if (team.isFull) return "full";
      return team.recruitmentStatus === "open" ? "recruiting" : "closed";
  }
}

export function isTeamJoinable(
  team: Pick<Team, "lifecycle" | "recruitmentStatus" | "isFull">,
): boolean {
  return team.lifecycle === "pending" && team.recruitmentStatus === "open" && !team.isFull;
}

export function isTeamActive(team: Pick<Team, "lifecycle">): boolean {
  return team.lifecycle === "pending" || team.lifecycle === "formed" || team.lifecycle === "in_progress";
}
