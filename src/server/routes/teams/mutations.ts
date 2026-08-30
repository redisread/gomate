import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { ACTIVITY_TYPES } from "@/contracts";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors, ErrorCode } from "../../lib/api-errors";
import type { Env } from "../../lib/auth";
import { getActiveSession } from "../../lib/active-session";
import { mapDatabaseError } from "../../lib/database-errors";
import { generateId } from "../../lib/id";
import { logger } from "../../lib/logger";
import { parseUserExtra } from "../../lib/user-extra";
import { createTeamTagUpdateBatch } from "../../lib/team-tag-write";
import { activeTeamParticipantCount } from "../../lib/team-participant-count";
import { validateRequest } from "../../lib/validation";
import { toTeamResponse } from "./utils";

const mutations = new Hono<{ Bindings: Env }>();

const activityTypeSchema = z.enum(ACTIVITY_TYPES);
const activityTypesJson = JSON.stringify(ACTIVITY_TYPES);
const requirementSchema = z.string().trim().min(1).max(200);
const tagIdsSchema = z
  .array(z.string().trim().min(1).max(100))
  .max(20)
  .transform((values) => [...new Set(values)]);

export const createTeamSchema = z
  .object({
    locationId: z.string().trim().min(1).max(100),
    activityType: activityTypeSchema,
    title: z.string().trim().min(1).max(100),
    description: z.string().trim().max(2_000).nullable().optional(),
    startAt: z.string().datetime({ offset: true }),
    endAt: z.string().datetime({ offset: true }),
    maxParticipants: z.number().int().min(1).max(49),
    requirements: z.array(requirementSchema).max(20).default([]),
    recruitmentStatus: z.enum(["open", "closed"]).default("open"),
    tagIds: tagIdsSchema.default([]),
  })
  .superRefine((value, ctx) => {
    const startAt = Date.parse(value.startAt);
    const endAt = Date.parse(value.endAt);
    if (startAt <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startAt"],
        message: "startAt 必须在未来",
      });
    }
    if (endAt < startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "endAt 不能早于 startAt",
      });
    }
  });

export const updateTeamSchema = z
  .object({
    locationId: z.string().trim().min(1).max(100).optional(),
    activityType: activityTypeSchema.optional(),
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(2_000).nullable().optional(),
    startAt: z.string().datetime({ offset: true }).optional(),
    endAt: z.string().datetime({ offset: true }).optional(),
    maxParticipants: z.number().int().min(1).max(49).optional(),
    requirements: z.array(requirementSchema).max(20).optional(),
    recruitmentStatus: z.enum(["open", "closed"]).optional(),
    tagIds: tagIdsSchema.optional(),
  })
  .strict();

type Db = ReturnType<typeof createDb>;

function changes(result: D1Result<unknown> | undefined): number {
  return Number(result?.meta?.changes ?? 0);
}

function isConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /constraint|foreign key|unique|check failed/i.test(message);
}

async function readTeamResponse(
  db: Db,
  teamId: string,
  checklistVisible: boolean,
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
    checklistVisible,
    contactVisible: checklistVisible,
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

mutations.post("/", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const parsed = await validateRequest(
      c,
      "json",
      createTeamSchema,
      "输入无效",
      "flatten",
    );
    if (parsed instanceof Response) return parsed;

    const db = createDb(c.env.DB);
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.user.id),
    });
    if (!user) return c.json(APIErrors.unauthorized("用户不存在"), 401);
    if (!parseUserExtra(user.extra).wechat) {
      return c.json(APIErrors.badRequest("请先填写微信号才能创建队伍"), 400);
    }
    if (!(await validateTagIds(db, parsed.tagIds))) {
      return c.json(APIErrors.validationError("tagIds 包含不存在的标签"), 422);
    }

    const teamId = generateId();
    const now = Date.now();
    const data = parsed;
    const createTeam = c.env.DB.prepare(
      `
      INSERT INTO teams (
        id, location_id, leader_id, activity_type, title, description,
        start_at, end_at, max_participants, requirements,
        recruitment_status, formed_at, cancelled_at, checklist,
        created_at, updated_at
      )
      SELECT ?, location.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?
      FROM locations AS location
      WHERE location.id = ?
        AND location.status = 'published'
        AND ? IN (SELECT value FROM json_each(?))
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
      now,
      now,
      data.locationId,
      data.activityType,
      activityTypesJson,
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

    const results = await c.env.DB.batch([createTeam, ...tagStatements]);
    if (changes(results[0]) !== 1) {
      return c.json(
        APIErrors.validationError("地点不存在、未发布或活动类型不可用"),
        422,
      );
    }

    const team = await readTeamResponse(db, teamId, true);
    if (!team) throw new Error("Created team could not be loaded");
    return c.json({ success: true, team }, 201);
  } catch (error) {
    if (isConstraintError(error)) {
      const mapped = mapDatabaseError(error);
      return c.json(mapped.body, mapped.status);
    }
    logger.error("team_create_failed", error);
    return c.json(APIErrors.internalError("创建队伍失败"), 500);
  }
});

mutations.put("/:id", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const parsed = await validateRequest(
      c,
      "json",
      updateTeamSchema,
      "输入无效",
      "flatten",
    );
    if (parsed instanceof Response) return parsed;
    if (Object.keys(parsed).length === 0) {
      return c.json(APIErrors.validationError("至少提供一个更新字段"), 400);
    }

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);
    const existing = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
    });
    if (!existing) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (existing.leaderId !== session.user.id) {
      return c.json(APIErrors.forbidden("只有队长可以修改队伍"), 403);
    }

    const data = parsed;
    const locationId = data.locationId ?? existing.locationId;
    const activityType = data.activityType ?? existing.activityType;
    const title = data.title ?? existing.title;
    const description =
      data.description === undefined ? existing.description : data.description;
    const startAt = data.startAt ? new Date(data.startAt) : existing.startAt;
    const endAt = data.endAt ? new Date(data.endAt) : existing.endAt;
    const maxParticipants = data.maxParticipants ?? existing.maxParticipants;
    const requirements = data.requirements ?? existing.requirements;
    const recruitmentStatus =
      data.recruitmentStatus ?? existing.recruitmentStatus;

    if (startAt.getTime() <= Date.now()) {
      return c.json(APIErrors.validationError("startAt 必须在未来"), 400);
    }
    if (endAt.getTime() < startAt.getTime()) {
      return c.json(APIErrors.validationError("endAt 不能早于 startAt"), 400);
    }
    if (data.tagIds && !(await validateTagIds(db, data.tagIds))) {
      return c.json(APIErrors.validationError("tagIds 包含不存在的标签"), 422);
    }

    const now = Date.now();
    const updateTeam = c.env.DB.prepare(
      `
      UPDATE teams
      SET location_id = ?,
          activity_type = ?,
          title = ?,
          description = ?,
          start_at = ?,
          end_at = ?,
          max_participants = ?,
          requirements = ?,
          recruitment_status = ?,
          updated_at = ?
      WHERE id = ?
        AND leader_id = ?
        AND formed_at IS NULL
        AND cancelled_at IS NULL
        AND start_at > ?
        AND EXISTS (
          SELECT 1 FROM locations AS location
          WHERE location.id = ?
            AND location.status = 'published'
        )
        AND ? IN (SELECT value FROM json_each(?))
    `,
    ).bind(
      locationId,
      activityType,
      title,
      description,
      startAt.getTime(),
      endAt.getTime(),
      maxParticipants,
      JSON.stringify(requirements),
      recruitmentStatus,
      now,
      teamId,
      session.user.id,
      now,
      locationId,
      activityType,
      activityTypesJson,
    );

    const statements = data.tagIds
      ? createTeamTagUpdateBatch(c.env.DB, updateTeam, {
          teamId,
          tagIds: data.tagIds,
          now,
        })
      : [updateTeam];
    const results = await c.env.DB.batch(statements);
    if (changes(results[0]) !== 1) {
      return c.json(
        APIErrors.conflict(
          "队伍已成行、已取消、已出发、地点不可用，或活动类型无效",
        ),
        409,
      );
    }

    const team = await readTeamResponse(db, teamId, true);
    if (!team) throw new Error("Updated team could not be loaded");
    return c.json({ success: true, team });
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
});

mutations.delete("/:id", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
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
        AND NOT EXISTS (SELECT 1 FROM stories WHERE stories.team_id = teams.id)
    `,
    )
      .bind(teamId, session.user.id, Date.now())
      .run();
    if (changes(result) !== 1) {
      return c.json(
        APIErrors.conflict("仅可删除尚未成行且没有活动成员或回顾的未来队伍"),
        409,
      );
    }
    return c.json({ success: true });
  } catch (error) {
    logger.error("team_delete_failed", error);
    return c.json(APIErrors.internalError("删除队伍失败"), 500);
  }
});

mutations.post("/:id/form", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
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
    return c.json({ success: true, team });
  } catch (error) {
    logger.error("team_form_failed", error);
    return c.json(APIErrors.internalError("确认成行失败"), 500);
  }
});

mutations.post("/:id/cancel", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
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
    return c.json({ success: true, team });
  } catch (error) {
    logger.error("team_cancel_failed", error);
    return c.json(APIErrors.internalError("取消队伍失败"), 500);
  }
});

export default mutations;
