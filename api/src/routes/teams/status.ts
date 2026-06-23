import { APIErrors } from "../../lib/api-errors";
import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { createAuth } from "../../lib/auth";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";

const status = new Hono<{ Bindings: Env }>();

/**
 * POST /teams/:id/leave
 * 成员退出队伍
 */
status.post("/leave", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍ID"), 400);

    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId as string), with: { location: true },
    });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.userId, session.user.id), eq(schema.teamMembers.status, "approved")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json(APIErrors.badRequest("你不是该队伍成员"), 400);
    if (membership.userId === team.leaderId) return c.json(APIErrors.badRequest("队长不能退出队伍"), 400);
    if (team.status === "formed") return c.json(APIErrors.badRequest("队伍已组建，请通过退出申请流程离开"), 400);

    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, membership.id));

    const [{ remainingCount }] = await db
      .select({ remainingCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.status, "approved")));

    await db.update(schema.teams)
      .set({ status: remainingCount < team.maxMembers ? "recruiting" : team.status, updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId as string));

    return c.json({ success: true, message: "已成功退出队伍" });
  } catch (error) {
    console.error("Leave team error:", error);
    return c.json(APIErrors.internalError("退出队伍失败"), 500);
  }
});

/**
 * POST /teams/:id/cancel-application
 * 取消入队申请
 */
status.post("/cancel-application", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍ID"), 400);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.userId, session.user.id), eq(schema.teamMembers.status, "pending")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json(APIErrors.notFound("未找到待审核的申请"), 404);

    // 改为更新状态而不是删除，保留历史记录
    await db.update(schema.teamMembers)
      .set({ status: "cancelled", statusUpdatedAt: new Date() })
      .where(eq(schema.teamMembers.id, membership.id));

    return c.json({ success: true, message: "申请已取消" });
  } catch (error) {
    console.error("Cancel application error:", error);
    return c.json(APIErrors.internalError("取消申请失败"), 500);
  }
});

/**
 * POST /teams/:id/members/:userId/approve-leave
 * 批准退出申请（仅队长）
 */
status.post("/members/:userId/approve-leave", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const db = createDb(c.env.DB);

    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍ID"), 400);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId as string) });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId !== session.user.id) return c.json(APIErrors.forbidden("只有队长可以批准退出申请"), 403);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "leave_pending")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json(APIErrors.notFound("未找到该成员的退出申请"), 404);

    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, membership.id));

    const [{ remainingCount }] = await db
      .select({ remainingCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.status, "approved")));

    await db.update(schema.teams)
      .set({ status: remainingCount < team.maxMembers ? "recruiting" : team.status, updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId as string));

    return c.json({ success: true, message: "已批准退出申请" });
  } catch (error) {
    console.error("Approve leave error:", error);
    return c.json(APIErrors.internalError("批准退出申请失败"), 500);
  }
});

/**
 * POST /teams/:id/members/:userId/reject-leave
 * 拒绝退出申请（仅队长）
 */
status.post("/members/:userId/reject-leave", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const db = createDb(c.env.DB);

    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍ID"), 400);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId as string) });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId !== session.user.id) return c.json(APIErrors.forbidden("只有队长可以拒绝退出申请"), 403);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "leave_pending")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json(APIErrors.notFound("未找到该成员的退出申请"), 404);

    await db.update(schema.teamMembers)
      .set({ status: "approved" })
      .where(eq(schema.teamMembers.id, membership.id));

    return c.json({ success: true, message: "已拒绝退出申请" });
  } catch (error) {
    console.error("Reject leave error:", error);
    return c.json(APIErrors.internalError("拒绝退出申请失败"), 500);
  }
});

export default status;
