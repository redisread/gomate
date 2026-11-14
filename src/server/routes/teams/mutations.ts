import { readTeamCreateRequest, teamCreateFingerprint } from "../../lib/team-create-request";
import { d1Changes } from "../../lib/d1-result";
import { teamCookieSecurity } from "./contracts";
import { teamSessionMiddleware } from "./session-middleware";
import { TeamResponseSchema, TeamSuccessSchema } from "@/contracts/team-api";
import {
  createApiApp,
  createRoute,
  jsonResponse,
  errorResponses,
  z,
} from "../../lib/openapi";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { createTeamSchema, teamCreateInputSchema, updateTeamSchema } from "@/contracts/team-input";
export { createTeamSchema, updateTeamSchema } from "@/contracts/team-input";
import { ACTIVITY_TYPES } from "@/contracts";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors, ErrorCode } from "../../lib/api-errors";
import { getActiveSession } from "../../lib/active-session";
import { mapDatabaseError } from "../../lib/database-errors";
import { generateId } from "../../lib/id";
import { logger } from "../../lib/logger";
import { parseUserExtra } from "../../lib/user-extra";
import { createTeamTagUpdateBatch } from "../../lib/team-tag-write";
import { activeTeamParticipantCount } from "../../lib/team-participant-count";
import { legacyJsonBody, validationHook } from "../../lib/openapi";
import { toTeamResponse } from "./utils";

const mutations = createApiApp();
const activityTypesJson = JSON.stringify(ACTIVITY_TYPES);

type Db = ReturnType<typeof createDb>;


function isConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /constraint|foreign key|unique|check failed/i.test(message);
}

async function readTeamResponse(
  db: Db,
  teamId: string,
  meetingPointVisible: boolean,
) {
  const activeCount = activeTeamParticipantCount(schema.teams.id);
  const rows = await db
    .select({
      team: schema.teams,
      leader: schema.users,
      location: schema.locations,
      region: schema.region,
      activeParticipantCount: activeCount,
    })
    .from(schema.teams)
    .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
    .innerJoin(
      schema.locations,
      eq(schema.locations.id, schema.teams.locationId),
    )
    .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
    .where(eq(schema.teams.id, teamId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const tagRows = await db
    .select({ tag: schema.tags })
    .from(schema.teamTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.teamTags.tagId))
    .where(eq(schema.teamTags.teamId, teamId));

  return toTeamResponse({
    ...row,
    activeParticipantCount: Number(row.activeParticipantCount),
    tags: tagRows.map(({ tag }) => tag),
    meetingPointVisible,
    contactVisible: meetingPointVisible,
  });
}

async function validateTagIds(db: Db, tagIds: string[]): Promise<boolean> {
  if (tagIds.length === 0) return true;
  const rows = await db
    .select({ id: schema.tags.id })
    .from(schema.tags)
    .where(inArray(schema.tags.id, tagIds));
  return rows.length === tagIds.length;
}

mutations.openapi(
  createRoute({
    description:
      "需要登录。地点必须公开可用，activityType 必须来自共享枚举。startAt 必须在未来，endAt 不得早于开始时间；人数上限 1–49 且包含队长。创建者成为队长，标签最多 20 个。requestId 为必填 UUID，同用户同身份同内容重放返回原队伍当前详情；内容不同或结果已删除返回 409。",
    method: "post",
    path: "/",
    operationId: "teamsCreate",
    tags: ["队伍"],
    summary: "创建队伍",
    "x-audience": "public",
    security: teamCookieSecurity,
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: teamCreateInputSchema } },
      },
    },
    middleware: [
      teamSessionMiddleware((error) => {
        logger.error("team_create_failed", error);
        return APIErrors.internalError("创建队伍失败");
      }),
      legacyJsonBody("输入无效"),
    ] as const,
    responses: {
      201: jsonResponse(TeamResponseSchema, "请求成功，响应字段见下方结构。"),
      ...errorResponses(400, 401, 409, 422, 500),
    },
  }),
  async (c) => {
    try {
      const session = c.get("session");

      const parsed = c.req.valid("json");

      const db = createDb(c.env.DB);
      const fingerprint = await teamCreateFingerprint(parsed);
      const prior = await readTeamCreateRequest(c.env.DB, session.user.id, parsed.requestId);
      if (prior) {
        if (prior.fingerprint !== fingerprint) return c.json(APIErrors.conflict("创建请求内容已变化，请先核对原队伍"), 409);
        const team = await readTeamResponse(db, prior.team_id, true);
        if (!team) return c.json(APIErrors.conflict("原队伍已删除，不能重放创建请求"), 409);
        return c.json({ success: true as const, team }, 201);
      }
      const validated = createTeamSchema.safeParse(parsed);
      if (!validated.success) return c.json(APIErrors.validationError("开始时间须在未来，结束时间不能早于开始时间"), 400);
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, session.user.id),
      });
      if (!user) return c.json(APIErrors.unauthorized("用户不存在"), 401);
      if (!parseUserExtra(user.extra).wechat) {
        return c.json(APIErrors.badRequest("请先填写微信号才能创建队伍"), 400);
      }
      if (!(await validateTagIds(db, parsed.tagIds))) {
        return c.json(
          APIErrors.validationError("tagIds 包含不存在的标签"),
          422,
        );
      }

      const teamId = generateId();
      const now = Date.now();
      const data = parsed;
      const createTeam = c.env.DB.prepare(
        `
      INSERT INTO teams (
        id, location_id, leader_id, activity_type, title, description,
        start_at, end_at, max_participants, requirements,
        recruitment_status, formed_at, cancelled_at, meeting_point,
        created_at, updated_at
      )
      SELECT ?, location.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?
      FROM locations AS location
      WHERE location.id = ?
        AND location.status = 'published'
        AND ? IN (SELECT value FROM json_each(?))
        AND NOT EXISTS (SELECT 1 FROM team_create_requests WHERE user_id = ? AND request_id = ?)
    `,
      ).bind(
        teamId,
        session.user.id,
        data.activityType,
        data.title,
        data.description ?? null,
        Date.parse(data.startAt),
        Date.parse(data.endAt),
        data.maxParticipants,
        JSON.stringify(data.requirements),
        data.recruitmentStatus,
        data.meetingPoint ?? null,
        now,
        now,
        data.locationId,
        data.activityType,
        activityTypesJson,
        session.user.id,
        parsed.requestId,
      );
      const tagStatements = data.tagIds.map((tagId) =>
        c.env.DB.prepare(
          `
      INSERT INTO team_tags (team_id, tag_id, created_at)
      SELECT ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM teams WHERE id = ?)
    `,
        ).bind(teamId, tagId, now, teamId),
      );

      const recordRequest = c.env.DB.prepare(`
        INSERT INTO team_create_requests(user_id,request_id,fingerprint,team_id,created_at)
        SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM teams WHERE id=?)
      `).bind(session.user.id, parsed.requestId, fingerprint, teamId, now, teamId);
      const results = await c.env.DB.batch([createTeam, ...tagStatements, recordRequest]);
      const committed = await readTeamCreateRequest(c.env.DB, session.user.id, parsed.requestId);
      if (committed && committed.fingerprint !== fingerprint) return c.json(APIErrors.conflict("创建请求内容已变化，请先核对原队伍"), 409);
      if (!committed && d1Changes(results[0]) !== 1) {
        return c.json(
          APIErrors.validationError("地点不存在、未发布或活动类型不可用"),
          422,
        );
      }

      const team = await readTeamResponse(db, committed?.team_id ?? teamId, true);
      if (!team) return c.json(APIErrors.conflict("原队伍已删除，不能重放创建请求"), 409);
      return c.json({ success: true as const, team }, 201);
    } catch (error) {
      if (isConstraintError(error)) {
        const mapped = mapDatabaseError(error);
        return c.json(mapped.body, mapped.status);
      }
      logger.error("team_create_failed", error);
      return c.json(APIErrors.internalError("创建队伍失败"), 500);
    }
  },
  validationHook("输入无效", "flatten"),
);

mutations.openapi(
  createRoute({
    description:
      "仅队长可操作，队伍必须尚未开始、未成团且未取消。只修改提交字段；人数上限不能低于当前有效人数，修改时间、地点和活动类型仍需满足创建约束。expectedVersion 为必填读取版本；陈旧版本或并发状态变化返回 409，未提交字段保持原值。",
    method: "put",
    path: "/{id}",
    operationId: "teamsUpdate",
    tags: ["队伍"],
    summary: "编辑未开始的队伍",
    "x-audience": "public",
    security: teamCookieSecurity,
    request: {
      params: z.object({ id: z.string() }),
      body: {
        required: true,
        content: { "application/json": { schema: updateTeamSchema } },
      },
    },
    middleware: [
      teamSessionMiddleware((error) => {
        logger.error("team_update_failed", error);
        return APIErrors.internalError("更新队伍失败");
      }),
      legacyJsonBody("输入无效"),
    ] as const,
    responses: {
      200: jsonResponse(TeamResponseSchema, "请求成功，响应字段见下方结构。"),
      ...errorResponses(400, 401, 403, 404, 409, 422, 500),
    },
  }),
  async (c) => {
    try {
      const session = c.get("session");

      const parsed = c.req.valid("json");
      if (Object.keys(parsed).length === 1) {
        return c.json(APIErrors.validationError("至少提供一个更新字段"), 400);
      }

      const teamId = c.req.valid("param").id;
      const db = createDb(c.env.DB);
      const existing = await db.query.teams.findFirst({
        where: eq(schema.teams.id, teamId),
      });
      if (!existing) return c.json(APIErrors.notFound("队伍不存在"), 404);
      if (existing.leaderId !== session.user.id) {
        return c.json(APIErrors.forbidden("只有队长可以修改队伍"), 403);
      }

      if (existing.version !== parsed.expectedVersion) return c.json(APIErrors.conflict("队伍已被修改，请重新读取后确认"), 409);
      const data = parsed;
      const locationId = data.locationId ?? existing.locationId;
      const activityType = data.activityType ?? existing.activityType;
      const startAt = data.startAt ? new Date(data.startAt) : existing.startAt;
      const endAt = data.endAt ? new Date(data.endAt) : existing.endAt;

      if (startAt.getTime() <= Date.now()) {
        return c.json(APIErrors.validationError("startAt 必须在未来"), 400);
      }
      if (endAt.getTime() < startAt.getTime()) {
        return c.json(APIErrors.validationError("endAt 不能早于 startAt"), 400);
      }
      if (data.tagIds && !(await validateTagIds(db, data.tagIds))) {
        return c.json(
          APIErrors.validationError("tagIds 包含不存在的标签"),
          422,
        );
      }

      const now = Date.now();
      const changes: Record<string, string | number | null | undefined> = {
        location_id: data.locationId, activity_type: data.activityType,
        title: data.title, description: data.description,
        start_at: data.startAt === undefined ? undefined : startAt.getTime(),
        end_at: data.endAt === undefined ? undefined : endAt.getTime(),
        max_participants: data.maxParticipants,
        requirements: data.requirements === undefined ? undefined : JSON.stringify(data.requirements),
        recruitment_status: data.recruitmentStatus, meeting_point: data.meetingPoint,
      };
      const fields = Object.entries(changes).filter((entry): entry is [string, string | number | null] => entry[1] !== undefined);
      const updateTeam = c.env.DB.prepare(`
        UPDATE teams SET ${fields.map(([column]) => `${column} = ?,`).join(" ")}
          updated_at = ?, version = version + 1
        WHERE id = ? AND leader_id = ? AND version = ?
          AND formed_at IS NULL AND cancelled_at IS NULL AND start_at > ?
          AND EXISTS (SELECT 1 FROM locations WHERE id = ? AND status = 'published')
          AND ? IN (SELECT value FROM json_each(?))
      `).bind(...fields.map(([,value]) => value), now, teamId, session.user.id,
        data.expectedVersion, now, locationId, activityType, activityTypesJson);

      const statements = data.tagIds
        ? createTeamTagUpdateBatch(c.env.DB, updateTeam, {
            teamId,
            tagIds: data.tagIds,
            now,
          })
        : [updateTeam];
      const results = await c.env.DB.batch(statements);
      if (d1Changes(results[0]) !== 1) {
        return c.json(
          APIErrors.conflict(
            "队伍已成行、已取消、已出发、地点不可用，或活动类型无效",
          ),
          409,
        );
      }

      const team = await readTeamResponse(db, teamId, true);
      if (!team) throw new Error("Updated team could not be loaded");
      return c.json({ success: true as const, team }, 200);
    } catch (error) {
      const mapped = mapDatabaseError(error);
      if (
        mapped.body.error.code === ErrorCode.TEAM_CAPACITY_EXCEEDED ||
        isConstraintError(error)
      ) {
        return c.json(mapped.body, mapped.status);
      }
      logger.error("team_update_failed", error);
      return c.json(APIErrors.internalError("更新队伍失败"), 500);
    }
  },
  validationHook("输入无效", "flatten"),
);

mutations.openapi(
  createRoute({
    description:
      "仅队长可操作，队伍须尚未开始、未成团、未取消且无有效成员。最终删除再次检查约束；不满足条件返回 409。成功返回 success 确认。",
    method: "delete",
    path: "/{id}",
    operationId: "teamsDelete",
    tags: ["队伍"],
    summary: "删除尚无其他成员的队伍",
    "x-audience": "public",
    security: teamCookieSecurity,
    request: { params: z.object({ id: z.string() }) },

    responses: {
      200: jsonResponse(TeamSuccessSchema, "请求成功，响应字段见下方结构。"),
      ...errorResponses(401, 403, 404, 409, 500),
    },
  }),
  async (c) => {
    try {
      const session = await getActiveSession(c.env, c.req.raw.headers);
      if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

      const teamId = c.req.valid("param").id;
      const db = createDb(c.env.DB);
      const existing = await db.query.teams.findFirst({
        where: eq(schema.teams.id, teamId),
      });
      if (!existing) return c.json(APIErrors.notFound("队伍不存在"), 404);
      if (existing.leaderId !== session.user.id) {
        return c.json(APIErrors.forbidden("只有队长可以删除队伍"), 403);
      }

      const result = await c.env.DB.prepare(
        `
      DELETE FROM teams
      WHERE id = ?
        AND leader_id = ?
        AND formed_at IS NULL
        AND cancelled_at IS NULL
        AND start_at > ?
        AND NOT EXISTS (
          SELECT 1 FROM team_members
          WHERE team_members.team_id = teams.id AND team_members.left_at IS NULL
        )
    `,
      )
        .bind(teamId, session.user.id, Date.now())
        .run();
      if (d1Changes(result) !== 1) {
        return c.json(
          APIErrors.conflict("仅可删除尚未成行且没有活动成员的未来队伍"),
          409,
        );
      }
      return c.json({ success: true as const }, 200);
    } catch (error) {
      logger.error("team_delete_failed", error);
      return c.json(APIErrors.internalError("删除队伍失败"), 500);
    }
  },
);

mutations.openapi(
  createRoute({
    description:
      "仅队长可操作，队伍须尚未开始、未成团且未取消。成功后记录成团时间并关闭招募，返回更新后的队伍详情；重复成团或并发状态变化返回 409。",
    method: "post",
    path: "/{id}/form",
    operationId: "teamsForm",
    tags: ["队伍"],
    summary: "确认队伍成团",
    "x-audience": "public",
    security: teamCookieSecurity,
    request: { params: z.object({ id: z.string() }) },

    responses: {
      200: jsonResponse(TeamResponseSchema, "请求成功，响应字段见下方结构。"),
      ...errorResponses(401, 403, 404, 409, 500),
    },
  }),
  async (c) => {
    try {
      const session = await getActiveSession(c.env, c.req.raw.headers);
      if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

      const teamId = c.req.valid("param").id;
      const db = createDb(c.env.DB);
      const existing = await db.query.teams.findFirst({
        where: eq(schema.teams.id, teamId),
      });
      if (!existing) return c.json(APIErrors.notFound("队伍不存在"), 404);
      if (existing.leaderId !== session.user.id) {
        return c.json(APIErrors.forbidden("只有队长可以确认成行"), 403);
      }

      const now = new Date();
      const updated = await db
        .update(schema.teams)
        .set({ formedAt: now, recruitmentStatus: "closed", updatedAt: now })
        .where(
          and(
            eq(schema.teams.id, teamId),
            eq(schema.teams.leaderId, session.user.id),
            isNull(schema.teams.formedAt),
            isNull(schema.teams.cancelledAt),
            gt(schema.teams.startAt, now),
          ),
        )
        .returning({ id: schema.teams.id });
      if (updated.length !== 1) {
        return c.json(APIErrors.conflict("队伍当前无法确认成行"), 409);
      }

      const team = await readTeamResponse(db, teamId, true);
      if (!team) throw new Error("Formed team could not be loaded");
      return c.json({ success: true as const, team }, 200);
    } catch (error) {
      logger.error("team_form_failed", error);
      return c.json(APIErrors.internalError("确认成行失败"), 500);
    }
  },
);

mutations.openapi(
  createRoute({
    description:
      "仅队长可操作，队伍须尚未结束且未取消；可以取消已成团或进行中的队伍。成功后记录取消时间并关闭招募，返回队伍详情；重复取消或状态变化返回 409。历史记录保留。",
    method: "post",
    path: "/{id}/cancel",
    operationId: "teamsCancel",
    tags: ["队伍"],
    summary: "取消队伍",
    "x-audience": "public",
    security: teamCookieSecurity,
    request: { params: z.object({ id: z.string() }) },

    responses: {
      200: jsonResponse(TeamResponseSchema, "请求成功，响应字段见下方结构。"),
      ...errorResponses(401, 403, 404, 409, 500),
    },
  }),
  async (c) => {
    try {
      const session = await getActiveSession(c.env, c.req.raw.headers);
      if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

      const teamId = c.req.valid("param").id;
      const db = createDb(c.env.DB);
      const existing = await db.query.teams.findFirst({
        where: eq(schema.teams.id, teamId),
      });
      if (!existing) return c.json(APIErrors.notFound("队伍不存在"), 404);
      if (existing.leaderId !== session.user.id) {
        return c.json(APIErrors.forbidden("只有队长可以取消队伍"), 403);
      }

      const now = new Date();
      const updated = await db
        .update(schema.teams)
        .set({ cancelledAt: now, recruitmentStatus: "closed", updatedAt: now })
        .where(
          and(
            eq(schema.teams.id, teamId),
            eq(schema.teams.leaderId, session.user.id),
            isNull(schema.teams.cancelledAt),
            gt(schema.teams.endAt, now),
          ),
        )
        .returning({ id: schema.teams.id });
      if (updated.length !== 1) {
        return c.json(APIErrors.conflict("队伍当前无法取消"), 409);
      }

      const team = await readTeamResponse(db, teamId, true);
      if (!team) throw new Error("Cancelled team could not be loaded");
      return c.json({ success: true as const, team }, 200);
    } catch (error) {
      logger.error("team_cancel_failed", error);
      return c.json(APIErrors.internalError("取消队伍失败"), 500);
    }
  },
);

export default mutations;
