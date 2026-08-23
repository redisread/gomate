import { and, eq, isNull } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";
import type { Env } from "../../lib/auth";
import { getActiveSession } from "../../lib/active-session";
import { mapDatabaseError } from "../../lib/database-errors";
import { generateId } from "../../lib/id";
import { logger } from "../../lib/logger";
import { createTeamApprovalBatch } from "../../lib/team-approval";
import { validateRequest } from "../../lib/validation";

const membership = new Hono<{ Bindings: Env }>();

const joinSchema = z.object({
  message: z.string().trim().min(1).max(500).optional(),
});

function changes(result: D1Result<unknown> | undefined): number {
  return Number(result?.meta?.changes ?? 0);
}

async function getSession(c: Context<{ Bindings: Env }>) {
  return getActiveSession(c.env, c.req.raw.headers);
}

membership.post("/join", async (c) => {
  try {
    const session = await getSession(c);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const parsed = await validateRequest(
      c,
      "json",
      joinSchema,
      "输入无效",
      "flatten",
    );
    if (parsed instanceof Response) return parsed;

    const teamId = c.req.param("id");
    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍 ID"), 400);
    const userId = session.user.id;
    const db = createDb(c.env.DB);
    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
    });

    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId === userId) {
      return c.json(APIErrors.conflict("队长不能申请加入自己的队伍"), 409);
    }

    const requestId = generateId();
    const now = Date.now();
    const statement = c.env.DB.prepare(
      `
      INSERT INTO team_join_requests (
        id, team_id, user_id, status, message,
        decided_by_user_id, decided_at, created_at, updated_at
      )
      SELECT ?, t.id, ?, 'pending', ?, NULL, NULL, ?, ?
      FROM teams AS t
      WHERE t.id = ?
        AND t.leader_id <> ?
        AND t.recruitment_status = 'open'
        AND t.cancelled_at IS NULL
        AND t.start_at > ?
        AND (
          SELECT COUNT(*) FROM team_members AS active
          WHERE active.team_id = t.id AND active.left_at IS NULL
        ) < t.max_participants
        AND NOT EXISTS (
          SELECT 1 FROM team_members AS active
          WHERE active.team_id = t.id
            AND active.user_id = ?
            AND active.left_at IS NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM team_join_requests AS pending
          WHERE pending.team_id = t.id
            AND pending.user_id = ?
            AND pending.status = 'pending'
        )
    `,
    ).bind(
      requestId,
      userId,
      parsed.message ?? null,
      now,
      now,
      teamId,
      userId,
      now,
      userId,
      userId,
    );

    const result = await statement.run();
    if (changes(result) !== 1) {
      return c.json(APIErrors.conflict("该队伍当前不接受此申请"), 409);
    }

    const joinRequest = await db.query.teamJoinRequests.findFirst({
      where: eq(schema.teamJoinRequests.id, requestId),
    });
    return c.json({ success: true, joinRequest }, 201);
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    if (diagnostic.includes("team_join_requests_one_pending_unique")) {
      return c.json(APIErrors.conflict("你已经提交了待审批申请"), 409);
    }
    logger.error("team_join_failed", error);
    return c.json(APIErrors.internalError("申请加入失败"), 500);
  }
});

membership.post("/join-requests/:requestId/approve", async (c) => {
  try {
    const session = await getSession(c);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍 ID"), 400);
    const requestId = c.req.param("requestId");
    const db = createDb(c.env.DB);
    const rows = await db
      .select({
        request: schema.teamJoinRequests,
        leaderId: schema.teams.leaderId,
      })
      .from(schema.teamJoinRequests)
      .innerJoin(
        schema.teams,
        eq(schema.teams.id, schema.teamJoinRequests.teamId),
      )
      .where(
        and(
          eq(schema.teamJoinRequests.id, requestId),
          eq(schema.teamJoinRequests.teamId, teamId),
        ),
      )
      .limit(1);
    const row = rows[0];

    if (!row) return c.json(APIErrors.notFound("入队申请不存在"), 404);
    if (row.leaderId !== session.user.id) {
      return c.json(APIErrors.forbidden("只有队长可以审批申请"), 403);
    }
    if (row.request.status !== "pending") {
      return c.json(APIErrors.conflict("该申请已经处理"), 409);
    }
    if (row.request.userId === row.leaderId) {
      return c.json(APIErrors.conflict("队长不能成为队员"), 409);
    }

    const existingMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.userId, row.request.userId),
      ),
    });
    if (existingMembership?.leftAt === null) {
      return c.json(APIErrors.conflict("该用户已经是活动成员"), 409);
    }

    const clockNow = Date.now();
    const now = existingMembership
      ? Math.max(clockNow, existingMembership.joinedAt.getTime() + 1)
      : clockNow;
    const results = await c.env.DB.batch(
      createTeamApprovalBatch(c.env.DB, {
        requestId,
        teamId,
        leaderId: session.user.id,
        now,
      }),
    );
    if (changes(results[0]) !== 1 || changes(results[1]) !== 1) {
      return c.json(APIErrors.conflict("申请状态已变化，未执行审批"), 409);
    }

    return c.json({ success: true, requestId, status: "approved" });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (
      mapped.body.error.code === "TEAM_CAPACITY_EXCEEDED" ||
      mapped.body.error.code === "TEAM_LEADER_MEMBER_CONFLICT"
    ) {
      return c.json(mapped.body, mapped.status);
    }
    logger.error("team_join_request_approve_failed", error);
    return c.json(APIErrors.internalError("批准申请失败"), 500);
  }
});

membership.post("/join-requests/:requestId/reject", async (c) => {
  try {
    const session = await getSession(c);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍 ID"), 400);
    const requestId = c.req.param("requestId");
    const db = createDb(c.env.DB);
    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
    });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId !== session.user.id) {
      return c.json(APIErrors.forbidden("只有队长可以审批申请"), 403);
    }

    const now = new Date();
    const updated = await db
      .update(schema.teamJoinRequests)
      .set({
        status: "rejected",
        decidedByUserId: session.user.id,
        decidedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.teamJoinRequests.id, requestId),
          eq(schema.teamJoinRequests.teamId, teamId),
          eq(schema.teamJoinRequests.status, "pending"),
        ),
      )
      .returning({ id: schema.teamJoinRequests.id });

    if (updated.length !== 1) {
      return c.json(APIErrors.conflict("申请不存在或已经处理"), 409);
    }
    return c.json({ success: true, requestId, status: "rejected" });
  } catch (error) {
    logger.error("team_join_request_reject_failed", error);
    return c.json(APIErrors.internalError("拒绝申请失败"), 500);
  }
});

membership.post("/join-requests/:requestId/cancel", async (c) => {
  try {
    const session = await getSession(c);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍 ID"), 400);
    const requestId = c.req.param("requestId");
    const now = new Date();
    const db = createDb(c.env.DB);
    const updated = await db
      .update(schema.teamJoinRequests)
      .set({
        status: "cancelled",
        decidedByUserId: null,
        decidedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.teamJoinRequests.id, requestId),
          eq(schema.teamJoinRequests.teamId, teamId),
          eq(schema.teamJoinRequests.userId, session.user.id),
          eq(schema.teamJoinRequests.status, "pending"),
        ),
      )
      .returning({ id: schema.teamJoinRequests.id });

    if (updated.length !== 1) {
      return c.json(APIErrors.conflict("申请不存在或已经处理"), 409);
    }
    return c.json({ success: true, requestId, status: "cancelled" });
  } catch (error) {
    logger.error("team_join_request_cancel_failed", error);
    return c.json(APIErrors.internalError("取消申请失败"), 500);
  }
});

membership.post("/leave", async (c) => {
  try {
    const session = await getSession(c);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍 ID"), 400);
    const db = createDb(c.env.DB);
    const leftAt = new Date();
    const updated = await db
      .update(schema.teamMembers)
      .set({ leftAt })
      .where(
        and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.userId, session.user.id),
          isNull(schema.teamMembers.leftAt),
        ),
      )
      .returning({ userId: schema.teamMembers.userId });

    if (updated.length !== 1) {
      return c.json(APIErrors.conflict("你不是该队伍的活动成员"), 409);
    }
    return c.json({ success: true, leftAt: leftAt.toISOString() });
  } catch (error) {
    logger.error("team_leave_failed", error);
    return c.json(APIErrors.internalError("退出队伍失败"), 500);
  }
});

membership.post("/members/:userId/remove", async (c) => {
  try {
    const session = await getSession(c);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍 ID"), 400);
    const targetUserId = c.req.param("userId");
    const db = createDb(c.env.DB);
    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
    });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId !== session.user.id) {
      return c.json(APIErrors.forbidden("只有队长可以移除成员"), 403);
    }
    if (targetUserId === team.leaderId) {
      return c.json(APIErrors.conflict("队长不能被移除"), 409);
    }

    const updated = await db
      .update(schema.teamMembers)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.userId, targetUserId),
          isNull(schema.teamMembers.leftAt),
        ),
      )
      .returning({ userId: schema.teamMembers.userId });

    if (updated.length !== 1) {
      return c.json(APIErrors.notFound("活动成员不存在"), 404);
    }
    return c.json({ success: true, userId: targetUserId });
  } catch (error) {
    logger.error("team_member_remove_failed", error);
    return c.json(APIErrors.internalError("移除成员失败"), 500);
  }
});

export default membership;
