import type { Team } from "@/lib/types";

function getTeamStartTime(team: Team): number {
  const timestamp = new Date(team.startAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function getTeamEndTime(team: Team): number {
  const timestamp = new Date(team.endAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

export function isTeamInProgress(team: Team, now = new Date()): boolean {
  const nowTimestamp = now.getTime();
  return getTeamStartTime(team) <= nowTimestamp && getTeamEndTime(team) > nowTimestamp;
}

export function mergeMemberTeams(createdTeams: Team[], joinedTeams: Team[]): Team[] {
  return Array.from(new Map([...createdTeams, ...joinedTeams].map((team) => [team.id, team])).values());
}

export function selectNextMemberTeam(createdTeams: Team[], joinedTeams: Team[], now = new Date()): Team | null {
  const activeTeams = mergeMemberTeams(createdTeams, joinedTeams).filter((team) =>
    team.lifecycle === "pending" || team.lifecycle === "formed" || team.lifecycle === "in_progress",
  );
  const currentOngoing = activeTeams
    .filter((team) => isTeamInProgress(team, now))
    .sort((left, right) => getTeamStartTime(right) - getTeamStartTime(left))[0];
  if (currentOngoing) return currentOngoing;

  const nowTimestamp = now.getTime();
  return activeTeams
    .filter((team) => getTeamStartTime(team) >= nowTimestamp)
    .sort((left, right) => getTeamStartTime(left) - getTeamStartTime(right))[0] ?? null;
}
