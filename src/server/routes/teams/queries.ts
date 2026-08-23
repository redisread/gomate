import type { ActivityType, RecruitmentStatus, TeamLifecycle } from "@/contracts";
import { isActivityType } from "@/lib/activity-types";
import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";
import type { Env } from "../../lib/auth";
import { getActiveSession } from "../../lib/active-session";
import { logger } from "../../lib/logger";
import { activeTeamMemberCount } from "../../lib/team-participant-count";
import {
  decodeContentCursor,
  encodeContentCursor,
} from "../../lib/content-cursor";
import { toTeamResponse } from "./utils";

const queries = new Hono<{ Bindings: Env }>();

const RECRUITMENT_STATUSES = new Set<RecruitmentStatus>(["open", "closed"]);
const LIFECYCLES = new Set<TeamLifecycle>([
  "cancelled",
  "pending",
  "formed",
  "in_progress",
  "completed",
  "expired_unformed",
]);

type Db = ReturnType<typeof createDb>;

function parseLimit(value: string | undefined, fallback: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= max ? parsed : null;
}

function splitIds(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 50);
}

function parseDateBoundary(value: string | undefined, endOfDay: boolean): Date | null | undefined {
  if (!value) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (dateOnly && endOfDay) parsed.setUTCHours(23, 59, 59, 999);
  return parsed;
}

function lifecycleCondition(lifecycle: TeamLifecycle, now: Date): SQL {
  switch (lifecycle) {
    case "cancelled":
      return isNotNull(schema.teams.cancelledAt);
    case "pending":
      return and(
        isNull(schema.teams.cancelledAt),
        isNull(schema.teams.formedAt),
        gt(schema.teams.startAt, now),
      )!;
    case "formed":
      return and(
        isNull(schema.teams.cancelledAt),
        isNotNull(schema.teams.formedAt),
        gt(schema.teams.startAt, now),
      )!;
    case "in_progress":
      return and(
        isNull(schema.teams.cancelledAt),
        isNotNull(schema.teams.formedAt),
        lte(schema.teams.startAt, now),
        gt(schema.teams.endAt, now),
      )!;
    case "completed":
      return and(
        isNull(schema.teams.cancelledAt),
        isNotNull(schema.teams.formedAt),
        lte(schema.teams.endAt, now),
      )!;
    case "expired_unformed":
      return and(
        isNull(schema.teams.cancelledAt),
        isNull(schema.teams.formedAt),
        lte(schema.teams.startAt, now),
      )!;
  }
}

const activeParticipantCount = activeTeamMemberCount(schema.teams.id);

async function loadTagsByTeam(db: Db, teamIds: string[]) {
  const grouped = new Map<string, schema.Tag[]>();
  if (teamIds.length === 0) return grouped;

  const rows = await db
    .select({ teamId: schema.teamTags.teamId, tag: schema.tags })
    .from(schema.teamTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.teamTags.tagId))
    .where(inArray(schema.teamTags.teamId, teamIds))
    .orderBy(asc(schema.tags.name), asc(schema.tags.id));

  for (const row of rows) {
    const tags = grouped.get(row.teamId) ?? [];
    tags.push(row.tag);
    grouped.set(row.teamId, tags);
  }
  return grouped;
}

export function buildTeamPageQuery(
  db: Db,
  where: SQL | undefined,
  limit: number,
) {
  return db
    .select({
      team: schema.teams,
      leader: schema.users,
      location: schema.locations,
      region: schema.region,
      activeParticipantCount,
    })
    .from(schema.teams)
    .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
    .innerJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
    .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
    .where(where)
    .orderBy(asc(schema.teams.startAt), asc(schema.teams.id))
    .limit(limit);
}

queries.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);
    if (c.req.query("page") !== undefined || c.req.query("pageSize") !== undefined) {
      return c.json(
        APIErrors.badRequest("page pagination is not supported; use cursor"),
        400,
      );
    }
    const limit = parseLimit(c.req.query("limit"), 12, 100);
    if (limit === null) {
      return c.json(APIErrors.badRequest("limit must be an integer between 1 and 100"), 400);
    }
    const encodedCursor = c.req.query("cursor");
    const regionId = c.req.query("regionId")?.trim();
    const locationId = c.req.query("locationId")?.trim();
    const activityType = c.req.query("activityType")?.trim() as ActivityType | undefined;
    const recruitmentStatus = c.req.query("recruitmentStatus")?.trim() as RecruitmentStatus | undefined;
    const lifecycle = c.req.query("lifecycle")?.trim() as TeamLifecycle | undefined;
    const search = c.req.query("search")?.trim().slice(0, 100);
    const tagIds = splitIds(c.req.query("tagIds"));
    const startAtFrom = parseDateBoundary(c.req.query("startDateFrom"), false);
    const startAtTo = parseDateBoundary(c.req.query("startDateTo"), true);

    if (activityType && !isActivityType(activityType)) {
      return c.json(APIErrors.validationError("activityType 无效"), 400);
    }
    if (recruitmentStatus && !RECRUITMENT_STATUSES.has(recruitmentStatus)) {
      return c.json(APIErrors.validationError("recruitmentStatus 无效"), 400);
    }
    if (lifecycle && !LIFECYCLES.has(lifecycle)) {
      return c.json(APIErrors.validationError("lifecycle 无效"), 400);
    }
    if (startAtFrom === null || startAtTo === null) {
      return c.json(APIErrors.validationError("日期筛选格式无效"), 400);
    }

    const conditions: SQL[] = [];
    if (regionId) conditions.push(eq(schema.locations.regionId, regionId));
    if (locationId) conditions.push(eq(schema.teams.locationId, locationId));
    if (activityType) conditions.push(eq(schema.teams.activityType, activityType));
    if (recruitmentStatus) conditions.push(eq(schema.teams.recruitmentStatus, recruitmentStatus));
    if (lifecycle) conditions.push(lifecycleCondition(lifecycle, new Date()));
    if (search) conditions.push(like(schema.teams.title, `%${search}%`));
    if (startAtFrom) conditions.push(gte(schema.teams.startAt, startAtFrom));
    if (startAtTo) conditions.push(lte(schema.teams.startAt, startAtTo));

    if (tagIds.length > 0) {
      const taggedTeamIds = db
        .select({ teamId: schema.teamTags.teamId })
        .from(schema.teamTags)
        .where(inArray(schema.teamTags.tagId, tagIds));
      conditions.push(inArray(schema.teams.id, taggedTeamIds));
    }

    const baseWhere = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.teams)
      .innerJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
      .where(baseWhere);

    if (encodedCursor !== undefined) {
      const cursor = decodeContentCursor(encodedCursor);
      if (!cursor) {
        return c.json(APIErrors.badRequest("Invalid team cursor"), 400);
      }
      const cursorDate = new Date(cursor.t);
      conditions.push(
        or(
          gt(schema.teams.startAt, cursorDate),
          and(
            eq(schema.teams.startAt, cursorDate),
            gt(schema.teams.id, cursor.id),
          ),
        )!,
      );
    }

    const fetchedRows = await buildTeamPageQuery(
      db,
      conditions.length > 0 ? and(...conditions) : undefined,
      limit + 1,
    );
    const hasMore = fetchedRows.length > limit;
    const rows = fetchedRows.slice(0, limit);

    const tags = await loadTagsByTeam(db, rows.map(({ team }) => team.id));
    const teams = rows.map((row) => toTeamResponse({
      ...row,
      activeParticipantCount: Number(row.activeParticipantCount),
      tags: tags.get(row.team.id) ?? [],
      checklistVisible: false,
      contactVisible: false,
    }));
    const last = rows.at(-1)?.team;

    return c.json({
      success: true,
      teams,
      total: Number(total),
      nextCursor:
        hasMore && last
          ? encodeContentCursor({ t: last.startAt.getTime(), id: last.id })
          : null,
    });
  } catch (error) {
    logger.error("teams_list_failed", error);
    return c.json(APIErrors.internalError("获取队伍列表失败"), 500);
  }
});

queries.get("/:id/join-requests", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);
    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId !== session.user.id) {
      return c.json(APIErrors.forbidden("只有队长可以查看入队申请"), 403);
    }

    const rows = await db
      .select({ request: schema.teamJoinRequests, user: schema.users })
      .from(schema.teamJoinRequests)
      .innerJoin(schema.users, eq(schema.users.id, schema.teamJoinRequests.userId))
      .where(eq(schema.teamJoinRequests.teamId, teamId))
      .orderBy(asc(schema.teamJoinRequests.createdAt), asc(schema.teamJoinRequests.id));

    return c.json({
      success: true,
      joinRequests: rows.map(({ request, user }) => ({
        id: request.id,
        teamId: request.teamId,
        userId: request.userId,
        status: request.status,
        message: request.message,
        decidedByUserId: request.decidedByUserId,
        decidedAt: request.decidedAt?.toISOString() ?? null,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        user: {
          id: user.id,
          name: user.name,
          nickname: user.nickname,
          image: user.image,
        },
      })),
    });
  } catch (error) {
    logger.error("team_join_requests_list_failed", error);
    return c.json(APIErrors.internalError("获取入队申请失败"), 500);
  }
});

queries.get("/:id/my-status", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json({ success: true, status: null, joinRequest: null });

    const teamId = c.req.param("id");
    const userId = session.user.id;
    const db = createDb(c.env.DB);
    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId === userId) {
      return c.json({ success: true, status: "leader", joinRequest: null });
    }

    const [membership, joinRequest] = await Promise.all([
      db.query.teamMembers.findFirst({
        where: and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.userId, userId),
          isNull(schema.teamMembers.leftAt),
        ),
      }),
      db.query.teamJoinRequests.findFirst({
        where: and(
          eq(schema.teamJoinRequests.teamId, teamId),
          eq(schema.teamJoinRequests.userId, userId),
          eq(schema.teamJoinRequests.status, "pending"),
        ),
      }),
    ]);

    return c.json({
      success: true,
      status: membership ? "member" : joinRequest ? "pending" : null,
      joinRequest: joinRequest ? {
        id: joinRequest.id,
        status: joinRequest.status,
        message: joinRequest.message,
        createdAt: joinRequest.createdAt.toISOString(),
      } : null,
    });
  } catch (error) {
    logger.error("team_membership_status_get_failed", error);
    return c.json(APIErrors.internalError("获取队伍成员状态失败"), 500);
  }
});

queries.get("/:id", async (c) => {
  try {
    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);
    const rows = await db
      .select({
        team: schema.teams,
        leader: schema.users,
        location: schema.locations,
        region: schema.region,
        activeParticipantCount,
      })
      .from(schema.teams)
      .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
      .innerJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
      .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .where(eq(schema.teams.id, teamId))
      .limit(1);
    const row = rows[0];
    if (!row) return c.json(APIErrors.notFound("队伍不存在"), 404);

    const session = await getActiveSession(c.env, c.req.raw.headers);
    const userId = session?.user.id;
    const [participantRows, tags, viewerMembership] = await Promise.all([
      db
        .select({ member: schema.teamMembers, user: schema.users })
        .from(schema.teamMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.teamMembers.userId))
        .where(and(
          eq(schema.teamMembers.teamId, teamId),
          isNull(schema.teamMembers.leftAt),
          ne(schema.teamMembers.userId, row.team.leaderId),
        ))
        .orderBy(asc(schema.teamMembers.joinedAt), asc(schema.teamMembers.userId)),
      loadTagsByTeam(db, [teamId]),
      userId && userId !== row.team.leaderId
        ? db.query.teamMembers.findFirst({
            where: and(
              eq(schema.teamMembers.teamId, teamId),
              eq(schema.teamMembers.userId, userId),
              isNull(schema.teamMembers.leftAt),
            ),
          })
        : Promise.resolve(undefined),
    ]);

    const checklistVisible = userId === row.team.leaderId || Boolean(viewerMembership);
    return c.json({
      success: true,
      team: toTeamResponse({
        ...row,
        activeParticipantCount: Number(row.activeParticipantCount),
        participants: participantRows.map(({ member, user }) => ({ ...member, user })),
        tags: tags.get(teamId) ?? [],
        checklistVisible,
        contactVisible: checklistVisible,
      }),
    });
  } catch (error) {
    logger.error("team_get_failed", error);
    return c.json(APIErrors.internalError("获取队伍详情失败"), 500);
  }
});

export default queries;
