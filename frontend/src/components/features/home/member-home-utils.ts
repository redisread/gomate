import type { Team } from "@/lib/types";

const ACTIVE_TEAM_STATUSES = new Set(["recruiting", "full", "formed", "ongoing"]);

function getTeamStartTime(team: Team): number {
  const startValue = team.startTime || `${team.date}T${team.time || "00:00"}:00+08:00`;
  const timestamp = new Date(startValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

export function mergeMemberTeams(createdTeams: Team[], joinedTeams: Team[]): Team[] {
  return Array.from(new Map([...createdTeams, ...joinedTeams].map((team) => [team.id, team])).values());
}

export function selectNextMemberTeam(createdTeams: Team[], joinedTeams: Team[], now = new Date()): Team | null {
  const activeTeams = mergeMemberTeams(createdTeams, joinedTeams).filter((team) => ACTIVE_TEAM_STATUSES.has(team.status));
  const currentOngoing = activeTeams.find((team) => String(team.status) === "ongoing");
  if (currentOngoing) return currentOngoing;

  const nowTimestamp = now.getTime();
  return activeTeams
    .filter((team) => getTeamStartTime(team) >= nowTimestamp)
    .sort((left, right) => getTeamStartTime(left) - getTeamStartTime(right))[0] ?? null;
}
