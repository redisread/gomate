/**
 * POST /v1/teams/:teamId/members — Apply to join a team.
 *
 * Auth: session cookie or x-api-key.
 * Idempotency-Key: required (400 if missing). Uses Bob's idempotencyMiddleware.
 * Actor: session.user.id, actorApiKeyId set if via API key (#219).
 */
import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createAuth } from "../../../lib/auth";
import { createDb } from "../../../db";
import * as schema from "../../../db/schema";
import type { Env } from "../../../lib/auth";
import { APIErrors } from "../../../lib/api-errors";
import { generateId } from "../../../lib/id";
import { idempotencyMiddleware } from "../../../lib/idempotency";
import { resolveAuditActor } from "../../../lib/audit";

const writeMembers = new Hono<{ Bindings: Env }>();

writeMembers.post("/:teamId/members", idempotencyMiddleware, async (c) => {
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

    const teamId = c.req.param("teamId");
    if (!teamId) {
      return c.json(APIErrors.validationError("缺少队伍ID"), 400);
    }

    const db = createDb(c.env.DB);

    // 2. Verify user has wechat
    const userRecord = await db
      .select({ wechat: schema.users.wechat })
      .from(schema.users)
      .where(eq(schema.users.id, actorId))
      .then((rows) => rows[0]);
    if (!userRecord?.wechat) {
      return c.json(APIErrors.badRequest("请先填写微信号才能加入队伍"), 400);
    }

    // 3. Verify team exists and is recruiting
    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) {
      return c.json(APIErrors.notFound("队伍不存在"), 404);
    }
    if (team.status !== "recruiting") {
      return c.json(APIErrors.badRequest("该队伍当前不接受新成员"), 400);
    }

    // 4. Check member count
    const { sql } = await import("drizzle-orm");
    const [{ approvedCount }] = await db
      .select({ approvedCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    if (approvedCount >= team.maxMembers) {
      return c.json(APIErrors.badRequest("队伍已满"), 400);
    }

    // 5. Check existing membership
    const existingMembers = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, actorId)),
      limit: 1,
    });
    const existing = existingMembers[0];

    if (existing) {
      if (existing.status === "approved") {
        return c.json(APIErrors.badRequest("你已经是该队伍的成员"), 400);
      }
      if (existing.status === "pending") {
        return c.json(APIErrors.badRequest("你已经提交了申请，请等待审核"), 400);
      }
      // rejected → reapply
      await db
        .update(schema.teamMembers)
        .set({ status: "pending", createdAt: new Date() })
        .where(eq(schema.teamMembers.id, existing.id));

      return c.json({ success: true, message: "重新申请已提交", actorType: "user" });
    }

    // 6. Create membership application
    const memberId = generateId();
    await db.insert(schema.teamMembers).values({
      id: memberId,
      teamId,
      userId: actorId,
      status: "pending",
      createdAt: new Date(),
      actorApiKeyId: actorApiKeyId ?? null,
    });

    return c.json({ success: true, message: "申请已提交", memberId, actorType: audit.actorType }, 201);
  } catch (error) {
    console.error("[v1/teams/:teamId/members POST] error:", error);
    return c.json(APIErrors.internalError("申请加入队伍失败"), 500);
  }
});

export { writeMembers };
