export type TeamLifecycle =
  | "cancelled"
  | "pending"
  | "formed"
  | "in_progress"
  | "completed"
  | "expired_unformed";

type Timestamp = Date | number;

export interface TeamLifecycleFields {
  cancelledAt: Timestamp | null;
  formedAt: Timestamp | null;
  startAt: Timestamp;
  endAt: Timestamp;
}

export interface TeamRecruitmentFields extends TeamLifecycleFields {
  recruitmentStatus: "open" | "closed";
  maxParticipants: number;
}

function timestampMs(value: Timestamp): number {
  return value instanceof Date ? value.getTime() : value;
}

export function getTeamLifecycle(
  team: TeamLifecycleFields,
  now: Timestamp = Date.now(),
): TeamLifecycle {
  if (team.cancelledAt !== null) return "cancelled";

  const nowMs = timestampMs(now);
  const startAt = timestampMs(team.startAt);
  const endAt = timestampMs(team.endAt);

  if (team.formedAt === null) {
    return startAt > nowMs ? "pending" : "expired_unformed";
  }

  if (startAt > nowMs) return "formed";
  return endAt <= nowMs ? "completed" : "in_progress";
}

export function isTeamRecruitable(
  team: TeamRecruitmentFields,
  activeParticipantCount: number,
  now: Timestamp = Date.now(),
): boolean {
  return (
    team.recruitmentStatus === "open" &&
    team.cancelledAt === null &&
    timestampMs(team.startAt) > timestampMs(now) &&
    activeParticipantCount < team.maxParticipants
  );
}
