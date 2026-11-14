import type { CreateTeamInput } from "@/contracts/team-input";

export async function teamCreateFingerprint(input: CreateTeamInput): Promise<string> {
  // Schema parsing gives stable field order; dates, nullable text and tag sets
  // are normalized to the values actually persisted by the command.
  const canonical = JSON.stringify({
    locationId: input.locationId, activityType: input.activityType, title: input.title,
    description: input.description ?? null, meetingPoint: input.meetingPoint ?? null,
    startAt: Date.parse(input.startAt), endAt: Date.parse(input.endAt),
    maxParticipants: input.maxParticipants, requirements: input.requirements,
    recruitmentStatus: input.recruitmentStatus, tagIds: [...input.tagIds].sort(),
  });
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function readTeamCreateRequest(db: D1Database, userId: string, requestId: string) {
  return db.prepare("SELECT fingerprint, team_id FROM team_create_requests WHERE user_id=? AND request_id=?")
    .bind(userId, requestId).first<{ fingerprint: string; team_id: string }>();
}
