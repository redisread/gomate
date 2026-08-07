import type { Team } from "@/lib/types";

const ACTIVE_TEAM_STATUSES = new Set(["recruiting", "full", "formed", "ongoing"]);

function getTeamStartTime(team: Team): number {
  const startValue = team.startTime || `${team.date}T${team.time || "00:00"}:00+08:00`;
  const timestamp = new Date(startValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function getTeamEndTime(team: Team): number {
  const startTime = getTeamStartTime(team);
  const durationMs = Math.max(0, team.durationMin ?? 0) * 60_000;
  return startTime + durationMs;
}

export function isTeamInProgress(team: Team, now = new Date()): boolean {
  const nowTimestamp = now.getTime();
  return getTeamStartTime(team) <= nowTimestamp && getTeamEndTime(team) > nowTimestamp;
}

export function mergeMemberTeams(createdTeams: Team[], joinedTeams: Team[]): Team[] {
  return Array.from(new Map([...createdTeams, ...joinedTeams].map((team) => [team.id, team])).values());
}

export function selectNextMemberTeam(createdTeams: Team[], joinedTeams: Team[], now = new Date()): Team | null {
  const activeTeams = mergeMemberTeams(createdTeams, joinedTeams).filter((team) => ACTIVE_TEAM_STATUSES.has(team.status));
  const currentOngoing = activeTeams
    .filter((team) => isTeamInProgress(team, now))
    .sort((left, right) => getTeamStartTime(right) - getTeamStartTime(left))[0];
  if (currentOngoing) return currentOngoing;

  const nowTimestamp = now.getTime();
  return activeTeams
    .filter((team) => getTeamStartTime(team) >= nowTimestamp)
    .sort((left, right) => getTeamStartTime(left) - getTeamStartTime(right))[0] ?? null;
}
