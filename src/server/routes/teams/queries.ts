import { TeamQuerySchema } from "./contracts";
import {
  TeamResponseSchema,
  TeamListResponseSchema,
  MyTeamStatusSchema,
} from "@/contracts/team-api";
import {
  createApiApp,
  createRoute,
  jsonResponse,
  errorResponses,
  z,
} from "../../lib/openapi";
import type {
  ActivityType,
  RecruitmentStatus,
  TeamLifecycle,
} from "@/contracts";
import { isActivityType } from "@/lib/activity-types";
import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  like,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";
import { getActiveSession } from "../../lib/active-session";
import { logger } from "../../lib/logger";
import { activeTeamParticipantCount } from "../../lib/team-participant-count";
import {
  decodeContentCursor,
  encodeContentCursor,
} from "../../lib/content-cursor";
import { toTeamResponse } from "./utils";
import { lifecycleCondition } from "../../lib/team-lifecycle-query";

const queries = createApiApp();

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

function parseLimit(
  value: string | undefined,
  fallback: number,
  max: number,
): number | null {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= max ? parsed : null;
}

function splitIds(value: string | undefined): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 50);
}

function parseDateBoundary(
  value: string | undefined,
  endOfDay: boolean,
): Date | null | undefined {
  if (!value) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (dateOnly && endOfDay) parsed.setUTCHours(23, 59, 59, 999);
  return parsed;
}

const activeParticipantCount = activeTeamParticipantCount(schema.teams.id);

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
    .innerJoin(
      schema.locations,
      eq(schema.locations.id, schema.teams.locationId),
    )
    .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
    .where(where)
    .orderBy(asc(schema.teams.startAt), asc(schema.teams.id))
    .limit(limit);
}

queries.openapi(
  createRoute({
    description:
      "可匿名读取。支持地区、地点、活动类型、招募状态、生命周期、关键词、标签及开始日期区间筛选；先筛选再分页，按开始时间和 ID 升序排列。limit 默认 12、范围 1–100，日期上下界均包含。返回 teams、total、nextCursor，游标须原样传回。",
    method: "get",
    path: "/",
    operationId: "teamsList",
    tags: ["队伍"],
    summary: "分页查询队伍",
    "x-audience": "public",

    request: { query: TeamQuerySchema },

    responses: {
      200: jsonResponse(
        TeamListResponseSchema,
        "请求成功，响应字段见下方结构。",
      ),
      ...errorResponses(400, 500),
    },
  }),
  async (c) => {
    try {
      const db = createDb(c.env.DB);
      if (
        c.req.query("page") !== undefined ||
        c.req.query("pageSize") !== undefined
      ) {
        return c.json(
          APIErrors.badRequest("page pagination is not supported; use cursor"),
          400,
        );
      }
      const limit = parseLimit(c.req.query("limit"), 12, 100);
      if (limit === null) {
        return c.json(
          APIErrors.badRequest("limit must be an integer between 1 and 100"),
          400,
        );
      }
      const encodedCursor = c.req.query("cursor");
      const regionId = c.req.query("regionId")?.trim();
      const locationId = c.req.query("locationId")?.trim();
      const activityType = c.req.query("activityType")?.trim() as
        | ActivityType
        | undefined;
      const recruitmentStatus = c.req.query("recruitmentStatus")?.trim() as
        | RecruitmentStatus
        | undefined;
      const lifecycle = c.req.query("lifecycle")?.trim() as
        | TeamLifecycle
        | undefined;
      const search = c.req.query("search")?.trim().slice(0, 100);
      const tagIds = splitIds(c.req.query("tagIds"));
      const startAtFrom = parseDateBoundary(
        c.req.query("startDateFrom"),
        false,
      );
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
      if (activityType)
        conditions.push(eq(schema.teams.activityType, activityType));
      if (recruitmentStatus)
        conditions.push(eq(schema.teams.recruitmentStatus, recruitmentStatus));
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
        .innerJoin(
          schema.locations,
          eq(schema.locations.id, schema.teams.locationId),
        )
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

      const tags = await loadTagsByTeam(
        db,
        rows.map(({ team }) => team.id),
      );
      const teams = rows.map((row) =>
        toTeamResponse({
          ...row,
          activeParticipantCount: Number(row.activeParticipantCount),
          tags: tags.get(row.team.id) ?? [],
          meetingPointVisible: false,
          contactVisible: false,
        }),
      );
      const last = rows.at(-1)?.team;

      return c.json(
        {
          success: true as const,
          teams,
          total: Number(total),
          nextCursor:
            hasMore && last
              ? encodeContentCursor({ t: last.startAt.getTime(), id: last.id })
              : null,
        },
        200,
      );
    } catch (error) {
      logger.error("teams_list_failed", error);
      return c.json(APIErrors.internalError("获取队伍列表失败"), 500);
    }
  },
);

queries.openapi(
  createRoute({
    description:
      "可匿名调用。返回 leader（队长）、member（有效成员）或 null；匿名访问 status 为 null，不再提供申请状态。此结果用于展示，后续写接口仍实时检查权限。",
    method: "get",
    path: "/{id}/my-status",
    operationId: "teamsMyStatus",
    tags: ["队伍"],
    summary: "读取我与队伍的关系",
    "x-audience": "public",

    request: { params: z.object({ id: z.string() }) },

    responses: {
      200: jsonResponse(MyTeamStatusSchema, "请求成功，响应字段见下方结构。"),
      ...errorResponses(404, 500),
    },
  }),
  async (c) => {
    try {
      const session = await getActiveSession(c.env, c.req.raw.headers);
      if (!session)
        return c.json({ success: true as const, status: null }, 200);

      const teamId = c.req.valid("param").id;
      const userId = session.user.id;
      const db = createDb(c.env.DB);
      const team = await db.query.teams.findFirst({
        where: eq(schema.teams.id, teamId),
      });
      if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
      if (team.leaderId === userId) {
        return c.json(
          {
            success: true as const,
            status: "leader" as const,
          },
          200,
        );
      }

      const member = await db.query.teamMembers.findFirst({
        where: and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.userId, userId),
          isNull(schema.teamMembers.leftAt),
        ),
      });
      return c.json(
        { success: true as const, status: member ? ("member" as const) : null },
        200,
      );
    } catch (error) {
      logger.error("team_membership_status_get_failed", error);
      return c.json(APIErrors.internalError("获取队伍成员状态失败"), 500);
    }
  },
);

queries.openapi(
  createRoute({
    description:
      "可匿名读取。返回队伍、地点、地区、标签及成员信息；集合地点和联系方式只向队长或当前有效成员展示，其他访问者得到隐藏后的字段。写入权限仍由服务端实时复核。",
    method: "get",
    path: "/{id}",
    operationId: "teamsGet",
    tags: ["队伍"],
    summary: "读取队伍详情",
    "x-audience": "public",

    request: { params: z.object({ id: z.string() }) },

    responses: {
      200: jsonResponse(TeamResponseSchema, "请求成功，响应字段见下方结构。"),
      ...errorResponses(404, 500),
    },
  }),
  async (c) => {
    try {
      const teamId = c.req.valid("param").id;
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
        .innerJoin(
          schema.locations,
          eq(schema.locations.id, schema.teams.locationId),
        )
        .innerJoin(
          schema.region,
          eq(schema.region.id, schema.locations.regionId),
        )
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
          .innerJoin(
            schema.users,
            eq(schema.users.id, schema.teamMembers.userId),
          )
          .where(
            and(
              eq(schema.teamMembers.teamId, teamId),
              isNull(schema.teamMembers.leftAt),
              ne(schema.teamMembers.userId, row.team.leaderId),
            ),
          )
          .orderBy(
            asc(schema.teamMembers.joinedAt),
            asc(schema.teamMembers.userId),
          ),
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

      const meetingPointVisible =
        userId === row.team.leaderId || Boolean(viewerMembership);
      return c.json(
        {
          success: true as const,
          team: toTeamResponse({
            ...row,
            activeParticipantCount: Number(row.activeParticipantCount),
            participants: participantRows.map(({ member, user }) => ({
              ...member,
              user,
            })),
            tags: tags.get(teamId) ?? [],
            meetingPointVisible,
            contactVisible: meetingPointVisible,
          }),
        },
        200,
      );
    } catch (error) {
      logger.error("team_get_failed", error);
      return c.json(APIErrors.internalError("获取队伍详情失败"), 500);
    }
  },
);

export default queries;
