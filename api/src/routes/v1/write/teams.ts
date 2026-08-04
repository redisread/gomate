/**
 * POST /v1/teams — Create a new team.
 *
 * Auth: session cookie or x-api-key (via enableSessionForAPIKeys: true).
 * Idempotency-Key: required (400 if missing). Uses Bob's idempotencyMiddleware.
 * Actor: session.user.id, actorApiKeyId set if via API key (#219).
 */
import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createAuth } from "../../../lib/auth";
import { createDb } from "../../../db";
import * as schema from "../../../db/schema";
import type { Env } from "../../../lib/auth";
import { APIErrors } from "../../../lib/api-errors";
import { generateId } from "../../../lib/id";
import { idempotencyMiddleware } from "../../../lib/idempotency";
import { resolveAuditActor } from "../../../lib/audit";

const writeTeams = new Hono<{ Bindings: Env }>();

const createTeamSchema = z.object({
  locationId: z.string().min(1, "地点ID不能为空"),
  title: z.string().min(1, "队伍名称不能为空").max(100, "队伍名称不能超过100字"),
  description: z.string().max(2000, "描述不能超过2000字").optional(),
  startTime: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, "无效的开始时间格式")),
  durationMin: z.number().int().min(0).max(1440).optional(),
  maxMembers: z.number().int().min(2).max(50).optional(),
  requirements: z.array(z.string()).optional(),
});

writeTeams.post("/", idempotencyMiddleware, async (c) => {
  try {
    // 1. Authenticate
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    if (!session) {
      return c.json(APIErrors.unauthorized("请先登录"), 401);
    }
    const actorId = session.user.id;
    const audit = await resolveAuditActor(c);
    const actorApiKeyId = audit.apiKeyId;
    const actorType = audit.actorType;

    // 2. Parse and validate body (idempotencyMiddleware already cloned/read the body)
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json(APIErrors.validationError("请求体无效"), 400);
    }
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入无效", parsed.error.errors), 400);
    }
    const { locationId, title, description, startTime, durationMin, maxMembers, requirements } = parsed.data;

    const db = createDb(c.env.DB);

    // 3. Verify location exists
    const location = await db.query.locations.findFirst({ where: eq(schema.locations.id, locationId) });
    if (!location) {
      return c.json(APIErrors.notFound("地点不存在"), 404);
    }

    // 4. Verify user has wechat set
    const userRecord = await db
      .select({ wechat: schema.users.wechat })
      .from(schema.users)
      .where(eq(schema.users.id, actorId))
      .then((rows) => rows[0]);
    if (!userRecord?.wechat) {
      return c.json(APIErrors.badRequest("请先填写微信号才能创建队伍"), 400);
    }

    // 5. Compute end time
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return c.json(APIErrors.validationError("无效的开始时间"), 400);
    }
    const duration = durationMin ?? 240;
    const end = new Date(start.getTime() + duration * 60 * 1000);

    // 6. Create team + self-membership (leader auto-approved)
    const teamId = generateId();
    const memberId = generateId();
    const now = new Date();
    const teamIcon = "⛰️";

    await db.insert(schema.teams).values({
      id: teamId,
      locationId,
      leaderId: actorId,
      title,
      description: description ?? null,
      startTime: start,
      endTime: end,
      durationMin: duration,
      maxMembers: maxMembers ?? 10,
      requirements: requirements ? JSON.stringify(requirements) : null,
      icon: teamIcon,
      status: "recruiting",
      createdAt: now,
      updatedAt: now,
      actorApiKeyId: actorApiKeyId ?? null,
    });

    await db.insert(schema.teamMembers).values({
      id: memberId,
      teamId,
      userId: actorId,
      status: "approved",
      joinedAt: now,
      createdAt: now,
      actorApiKeyId: actorApiKeyId ?? null,
    });

    return c.json({
      success: true,
      team: {
        id: teamId,
        locationId,
        leaderId: actorId,
        title,
        description: description ?? null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMin: duration,
        maxMembers: maxMembers ?? 10,
        currentMembers: 1,
        requirements,
        icon: teamIcon,
        status: "recruiting",
        createdAt: now.toISOString(),
      },
      actorType,
    }, 201);
  } catch (error) {
    console.error("[v1/teams POST] error:", error);
    return c.json(APIErrors.internalError("创建队伍失败"), 500);
  }
});

export { writeTeams };
