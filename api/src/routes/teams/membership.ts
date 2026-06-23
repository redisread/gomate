import { APIErrors } from "../../lib/api-errors";
import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { createAuth } from "../../lib/auth";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { sendTeamJoinApplicationEmail } from "../../lib/email";

const membership = new Hono<{ Bindings: Env }>();

/**
 * POST /teams/:id/join
 * 申请加入队伍
 */
membership.post("/join", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const userId = session.user.id;
    const db = createDb(c.env.DB);

    const userRecord = await db
      .select({ wechat: schema.users.wechat })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .then((rows) => rows[0]);

    if (!userRecord?.wechat) return c.json(APIErrors.badRequest("请先填写微信号才能加入队伍"), 400);

    const teamId = c.req.param("id");
    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍ID"), 400);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId as string) });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.status !== "recruiting") return c.json(APIErrors.badRequest("该队伍当前不接受新成员"), 400);

    const [{ approvedCount }] = await db
      .select({ approvedCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.status, "approved")));

    if (approvedCount >= team.maxMembers) return c.json(APIErrors.badRequest("队伍已满"), 400);

    const existingMembers = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.userId, userId)),
      limit: 1,
    });
    const existing = existingMembers[0];

    if (existing) {
      if (existing.status === "approved") return c.json(APIErrors.badRequest("你已经是该队伍的成员"), 400);
      if (existing.status === "pending") return c.json(APIErrors.badRequest("你已经提交了申请，请等待审核"), 400);
      if (existing.status === "rejected") {
        await db.update(schema.teamMembers)
          .set({ status: "pending", createdAt: new Date(), statusUpdatedAt: new Date() })
          .where(eq(schema.teamMembers.id, existing.id));
        // 异步发送通知邮件（在 Cloudflare Workers 环境中使用 waitUntil，否则直接执行）
        const notifyPromise = notifyLeaderOfApplication(db, team, userId, c.env).catch((err) => {
          console.error("[Email] Team join notification failed:", err);
        });
        try {
          if (c.executionCtx?.waitUntil) {
            c.executionCtx.waitUntil(notifyPromise);
          }
        } catch {
          // 非 Cloudflare 环境，直接执行不阻塞
        }
        return c.json({ success: true, message: "重新申请已提交" });
      }
    }

    const memberId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(schema.teamMembers).values({
      id: memberId, teamId: teamId as string, userId, status: "pending", createdAt: new Date(),
    });
    // 异步发送通知邮件（在 Cloudflare Workers 环境中使用 waitUntil，否则直接执行）
    const notifyPromise = notifyLeaderOfApplication(db, team, userId, c.env).catch((err) => {
      console.error("[Email] Team join notification failed:", err);
    });
    try {
      if (c.executionCtx?.waitUntil) {
        c.executionCtx.waitUntil(notifyPromise);
      }
    } catch {
      // 非 Cloudflare 环境，直接执行不阻塞
    }

    return c.json({ success: true, message: "申请已提交，等待队长审核" });
  } catch (error) {
    console.error("Join team error:", error);
    return c.json(APIErrors.internalError("申请加入失败"), 500);
  }
});

/**
 * POST /teams/:id/members/:userId/approve
 * 批准成员申请（仅队长）
 */
membership.post("/members/:userId/approve", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const db = createDb(c.env.DB);

    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍ID"), 400);

    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId as string), with: { location: true },
    });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId !== session.user.id) return c.json(APIErrors.forbidden("只有队长可以审核成员"), 403);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "pending")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json(APIErrors.notFound("未找到该成员的申请"), 404);

    const [{ approvedCount }] = await db
      .select({ approvedCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.status, "approved")));

    if (approvedCount >= team.maxMembers) return c.json(APIErrors.badRequest("队伍已满，无法批准新成员"), 400);

    const now = new Date();
    const newCount = approvedCount + 1;
    const newStatus = newCount >= team.maxMembers ? "full" : "recruiting";

    await db.update(schema.teamMembers)
      .set({ status: "approved", joinedAt: now, statusUpdatedAt: now })
      .where(eq(schema.teamMembers.id, membership.id));
    await db.update(schema.teams)
      .set({ status: newStatus, updatedAt: now })
      .where(eq(schema.teams.id, teamId as string));

    return c.json({ success: true, message: "已通过申请" });
  } catch (error) {
    console.error("Approve member error:", error);
    return c.json(APIErrors.internalError("批准申请失败"), 500);
  }
});

/**
 * POST /teams/:id/members/:userId/reject
 * 拒绝成员申请（仅队长）
 */
membership.post("/members/:userId/reject", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const db = createDb(c.env.DB);

    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍ID"), 400);

    const body = await c.req.json<{ reason?: string }>().catch(() => ({} as { reason?: string }));
    const { reason } = body;

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId as string) });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId !== session.user.id) return c.json(APIErrors.forbidden("只有队长可以审核成员"), 403);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "pending")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json(APIErrors.notFound("未找到该成员的申请"), 404);

    const now = new Date();
    const extra = reason ? JSON.stringify({ rejectReason: reason }) : null;

    await db.update(schema.teamMembers)
      .set({ status: "rejected", statusUpdatedAt: now, extra })
      .where(eq(schema.teamMembers.id, membership.id));

    // 检查并更新队伍状态：如果已满则恢复为招募中
    if (team.status === "full") {
      await db.update(schema.teams)
        .set({ status: "recruiting", updatedAt: now })
        .where(eq(schema.teams.id, teamId as string));
    }

    return c.json({ success: true, message: "已拒绝申请" });
  } catch (error) {
    console.error("Reject member error:", error);
    return c.json(APIErrors.internalError("拒绝申请失败"), 500);
  }
});

/**
 * POST /teams/:id/members/:userId/remove
 * 移除成员（仅队长）
 */
membership.post("/members/:userId/remove", async (c) => {
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
    if (team.leaderId !== session.user.id) return c.json(APIErrors.forbidden("只有队长可以移除成员"), 403);
    if (targetUserId === session.user.id) return c.json(APIErrors.badRequest("不能移除自己"), 400);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "approved")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json(APIErrors.notFound("该用户不是队伍成员"), 404);

    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, membership.id));

    const [{ remainingCount }] = await db
      .select({ remainingCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.status, "approved")));

    await db.update(schema.teams)
      .set({ status: remainingCount < team.maxMembers ? "recruiting" : team.status, updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId as string));

    return c.json({ success: true, message: "已移除成员" });
  } catch (error) {
    console.error("Remove member error:", error);
    return c.json(APIErrors.internalError("移除成员失败"), 500);
  }
});

/**
 * POST /teams/:id/leave-request
 * 申请退出已组建的队伍
 */
membership.post("/leave-request", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    if (!teamId) return c.json(APIErrors.badRequest("缺少队伍ID"), 400);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId as string) });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.status !== "formed") return c.json(APIErrors.badRequest("只有已组建的队伍需要申请退出"), 400);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.userId, session.user.id), eq(schema.teamMembers.status, "approved")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json(APIErrors.badRequest("你不是该队伍成员"), 400);
    if (membership.userId === team.leaderId) return c.json(APIErrors.badRequest("队长不能退出队伍"), 400);

    const leaveRequests = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId as string), eq(schema.teamMembers.userId, session.user.id), eq(schema.teamMembers.status, "leave_pending")),
      limit: 1,
    });
    if (leaveRequests.length > 0) return c.json(APIErrors.badRequest("您已提交退出申请，请等待队长审批"), 400);

    await db.update(schema.teamMembers)
      .set({ status: "leave_pending" })
      .where(eq(schema.teamMembers.id, membership.id));

    return c.json({ success: true, message: "退出申请已提交，等待队长审批" });
  } catch (error) {
    console.error("Request leave error:", error);
    return c.json(APIErrors.internalError("提交退出申请失败"), 500);
  }
});

async function notifyLeaderOfApplication(
  db: ReturnType<typeof createDb>,
  team: typeof schema.teams.$inferSelect,
  applicantUserId: string,
  env: Env,
) {
  const [leaderRow, applicantRow, locationRow] = await Promise.all([
    db.select({ email: schema.users.email, name: schema.users.name, nickname: schema.users.nickname })
      .from(schema.users).where(eq(schema.users.id, team.leaderId)).then((r) => r[0]),
    db.select({ name: schema.users.name, nickname: schema.users.nickname })
      .from(schema.users).where(eq(schema.users.id, applicantUserId)).then((r) => r[0]),
    db.select({ name: schema.locations.name })
      .from(schema.locations).where(eq(schema.locations.id, team.locationId)).then((r) => r[0]),
  ]);

  if (!leaderRow || !applicantRow || !locationRow) return;

  const frontendUrl = env.FRONTEND_URL || "https://gomate.live";
  await sendTeamJoinApplicationEmail(
    {
      leaderEmail: leaderRow.email,
      leaderName: leaderRow.nickname || leaderRow.name,
      applicantName: applicantRow.nickname || applicantRow.name,
      teamTitle: team.title,
      locationName: locationRow.name,
      teamUrl: `${frontendUrl}/teams/${team.id}`,
    },
    env,
  );
}

export default membership;
