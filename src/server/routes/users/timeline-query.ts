import { and, desc, eq, isNull, lt, or, type SQL } from "drizzle-orm";
import type { createDb } from "../../db";
import * as schema from "../../db/schema";
import {
  encodeContentCursor,
  type ContentCursor,
} from "../../lib/content-cursor";
import { getTeamLifecycle } from "../../lib/team-lifecycle";
import { activeTeamParticipantCount } from "../../lib/team-participant-count";
type TeamSummaryRow = Awaited<
  ReturnType<typeof buildCreatedTeamsPageQuery>
>[number];

function teamSummary(row: TeamSummaryRow) {
  return {
    id: row.id,
    locationId: row.locationId,
    leaderId: row.leaderId,
    activityType: row.activityType,
    title: row.title,
    description: row.description,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    maxParticipants: row.maxParticipants,
    activeParticipantCount: Number(row.activeParticipantCount),
    requirements: row.requirements,
    recruitmentStatus: row.recruitmentStatus,
    formedAt: row.formedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    lifecycle: getTeamLifecycle(row),
    isFull: Number(row.activeParticipantCount) >= row.maxParticipants,
    meetingPoint: row.meetingPoint,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    location: {
      id: row.locationId,
      name: row.locationName,
      coverImageUrl: row.locationCoverImageUrl,
    },
  };
}

const participantCount = activeTeamParticipantCount(schema.teams.id);

const teamSummarySelection = {
  id: schema.teams.id,
  locationId: schema.teams.locationId,
  leaderId: schema.teams.leaderId,
  activityType: schema.teams.activityType,
  title: schema.teams.title,
  description: schema.teams.description,
  startAt: schema.teams.startAt,
  endAt: schema.teams.endAt,
  maxParticipants: schema.teams.maxParticipants,
  requirements: schema.teams.requirements,
  recruitmentStatus: schema.teams.recruitmentStatus,
  formedAt: schema.teams.formedAt,
  cancelledAt: schema.teams.cancelledAt,
  meetingPoint: schema.teams.meetingPoint,
  createdAt: schema.teams.createdAt,
  updatedAt: schema.teams.updatedAt,
  activeParticipantCount: participantCount,
  locationName: schema.locations.name,
  locationCoverImageUrl: schema.locations.coverImageUrl,
};

function descendingTeamCursor(cursor: ContentCursor | null): SQL | undefined {
  if (!cursor) return undefined;
  const cursorDate = new Date(cursor.t);
  return or(
    lt(schema.teams.createdAt, cursorDate),
    and(eq(schema.teams.createdAt, cursorDate), lt(schema.teams.id, cursor.id)),
  );
}

export function buildCreatedTeamsPageQuery(
  db: ReturnType<typeof createDb>,
  userId: string,
  cursor: ContentCursor | null,
  limit: number,
) {
  return db
    .select(teamSummarySelection)
    .from(schema.teams)
    .innerJoin(
      schema.locations,
      eq(schema.locations.id, schema.teams.locationId),
    )
    .where(and(eq(schema.teams.leaderId, userId), descendingTeamCursor(cursor)))
    .orderBy(desc(schema.teams.createdAt), desc(schema.teams.id))
    .limit(limit);
}

export function buildJoinedTeamsPageQuery(
  db: ReturnType<typeof createDb>,
  userId: string,
  cursor: ContentCursor | null,
  limit: number,
) {
  return db
    .select(teamSummarySelection)
    .from(schema.teams)
    .innerJoin(
      schema.locations,
      eq(schema.locations.id, schema.teams.locationId),
    )
    .innerJoin(
      schema.teamMembers,
      and(
        eq(schema.teamMembers.teamId, schema.teams.id),
        eq(schema.teamMembers.userId, userId),
        isNull(schema.teamMembers.leftAt),
      ),
    )
    .where(descendingTeamCursor(cursor))
    .orderBy(desc(schema.teams.createdAt), desc(schema.teams.id))
    .limit(limit);
}

export function toTimelinePage(rows: TeamSummaryRow[], limit: number) {
  const teams = rows.slice(0, limit);
  const last = teams.at(-1);
  return {
    success: true as const,
    teams: teams.map(teamSummary),
    nextCursor:
      rows.length > limit && last
        ? encodeContentCursor({ t: last.createdAt.getTime(), id: last.id })
        : null,
  };
}
