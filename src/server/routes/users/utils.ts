import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { createDb } from "../../db";
import * as schema from "../../db/schema";
import { getTeamLifecycle } from "../../lib/team-lifecycle";
import { parseUserExtra } from "../../lib/user-extra";
import { activeTeamMemberCount } from "../../lib/team-participant-count";

type Db = ReturnType<typeof createDb>;
type UserRow = typeof schema.users.$inferSelect;

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

export function toSelfUser(user: UserRow) {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    bio: user.bio,
    gender: user.gender,
    birthday: iso(user.birthday),
    role: user.role,
    status: user.status,
    extra: parseUserExtra(user.extra),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toPublicUser(user: UserRow) {
  const extra = parseUserExtra(user.extra);
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    image: user.image,
    bio: user.bio,
    extra: {
      level: extra.level,
      completedHikes: extra.completedHikes,
      wechat: null,
      city: extra.city,
    },
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getUserStats(db: Db, userId: string) {
  const [created] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.teams)
    .where(eq(schema.teams.leaderId, userId));
  const [joined] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.userId, userId));
  const [completed] = await db
    .select({ count: sql<number>`count(distinct ${schema.teams.id})` })
    .from(schema.teams)
    .leftJoin(
      schema.teamMembers,
      and(
        eq(schema.teamMembers.teamId, schema.teams.id),
        eq(schema.teamMembers.userId, userId),
      ),
    )
    .where(
      and(
        or(
          eq(schema.teams.leaderId, userId),
          eq(schema.teamMembers.userId, userId),
        ),
        isNull(schema.teams.cancelledAt),
        sql`${schema.teams.formedAt} is not null`,
        lte(schema.teams.endAt, new Date()),
      ),
    );
  return {
    createdTeams: Number(created?.count ?? 0),
    joinedTeams: Number(joined?.count ?? 0),
    completedTeams: Number(completed?.count ?? 0),
  };
}

export async function getUserOngoingTeams(db: Db, userId: string) {
  const participantCount = activeTeamMemberCount(schema.teams.id);
  const rows = await db
    .select({
      id: schema.teams.id,
      title: schema.teams.title,
      activityType: schema.teams.activityType,
      startAt: schema.teams.startAt,
      endAt: schema.teams.endAt,
      maxParticipants: schema.teams.maxParticipants,
      recruitmentStatus: schema.teams.recruitmentStatus,
      formedAt: schema.teams.formedAt,
      cancelledAt: schema.teams.cancelledAt,
      activeParticipantCount: participantCount,
      locationId: schema.locations.id,
      locationName: schema.locations.name,
      locationCoverImageUrl: schema.locations.coverImageUrl,
    })
    .from(schema.teams)
    .innerJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
    .leftJoin(
      schema.teamMembers,
      and(
        eq(schema.teamMembers.teamId, schema.teams.id),
        eq(schema.teamMembers.userId, userId),
        isNull(schema.teamMembers.leftAt),
      ),
    )
    .where(
      and(
        or(
          eq(schema.teams.leaderId, userId),
          eq(schema.teamMembers.userId, userId),
        ),
        isNull(schema.teams.cancelledAt),
        gt(schema.teams.endAt, new Date()),
      ),
    )
    .orderBy(schema.teams.startAt)
    .limit(8);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    activityType: row.activityType,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    maxParticipants: row.maxParticipants,
    activeParticipantCount: Number(row.activeParticipantCount ?? 0),
    recruitmentStatus: row.recruitmentStatus,
    lifecycle: getTeamLifecycle({
      startAt: row.startAt,
      endAt: row.endAt,
      formedAt: row.formedAt,
      cancelledAt: row.cancelledAt,
    }),
    location: {
      id: row.locationId,
      name: row.locationName,
      coverImageUrl: row.locationCoverImageUrl,
    },
  }));
}
