import { Hono } from "hono";
import { eq, and, sql, desc, ne } from "drizzle-orm";
import * as schema from "../../db/schema";
import type { TestDb } from "./db";

/**
 * 模拟 session 的用户信息
 */
export interface MockSession {
  userId: string;
  userName: string;
  userEmail: string;
}

/**
 * 创建可注入 mock session 的测试 Hono app
 * 直接使用 drizzle db，绕过 Better Auth 和 D1
 */
export function createTeamsTestApp(db: TestDb, mockSession?: MockSession) {
  const app = new Hono();

  /** 获取随机队伍图标 */
  const TEAM_ICONS = ["⛰️", "🥾", "🌲", "🏕️", "🧗", "🌄", "🏞️", "🗺️"];
  function getRandomTeamIcon() {
    return TEAM_ICONS[0];
  }

  /** 将过期的队伍更新为对应状态（此处复用 lib/team-status 逻辑） */
  async function updateExpiredTeamsLocal(teamId?: string) {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (teamId) {
      const team = await db.select({ id: schema.teams.id, status: schema.teams.status, endTime: schema.teams.endTime, createdAt: schema.teams.createdAt })
        .from(schema.teams).where(eq(schema.teams.id, teamId)).limit(1);
      if (!team.length) return;
      const t = team[0];
      if (new Date(t.endTime) < now && new Date(t.createdAt).getTime() + oneDayMs < now.getTime()) {
        if (t.status === "recruiting") await db.update(schema.teams).set({ status: "cancelled", updatedAt: now }).where(eq(schema.teams.id, teamId));
        else if (t.status === "formed") await db.update(schema.teams).set({ status: "completed", updatedAt: now }).where(eq(schema.teams.id, teamId));
      }
      return;
    }

    const threshold = new Date(now.getTime() - oneDayMs);
    await db.update(schema.teams).set({ status: "cancelled", updatedAt: now })
      .where(and(eq(schema.teams.status, "recruiting"), sql`${schema.teams.endTime} < ${now.getTime() / 1000}`, sql`${schema.teams.createdAt} < ${threshold.getTime() / 1000}`));
    await db.update(schema.teams).set({ status: "completed", updatedAt: now })
      .where(and(eq(schema.teams.status, "formed"), sql`${schema.teams.endTime} < ${now.getTime() / 1000}`, sql`${schema.teams.createdAt} < ${threshold.getTime() / 1000}`));
  }

  /**
   * GET /teams
   */
  app.get("/teams", async (c) => {
    try {
      await updateExpiredTeamsLocal();

      const locationId = c.req.query("locationId");
      const userId = c.req.query("userId");
      const includeJoined = c.req.query("includeJoined") === "true";
      const activeOnly = c.req.query("activeOnly") === "true";

      const currentMembersSubquery = sql<number>`(
        SELECT COUNT(*) FROM team_members
        WHERE team_members.team_id = ${schema.teams.id}
        AND team_members.status = 'approved'
      )`;

      const teamColumns = {
        id: schema.teams.id, locationId: schema.teams.locationId,
        routeId: schema.teams.routeId, leaderId: schema.teams.leaderId,
        title: schema.teams.title, description: schema.teams.description,
        startTime: schema.teams.startTime, endTime: schema.teams.endTime,
        durationMin: schema.teams.durationMin, maxMembers: schema.teams.maxMembers,
        requirements: schema.teams.requirements, icon: schema.teams.icon,
        status: schema.teams.status, createdAt: schema.teams.createdAt,
        updatedAt: schema.teams.updatedAt, currentMembers: currentMembersSubquery,
        leaderImage: schema.users.image, leaderName: schema.users.name,
        leaderNickname: schema.users.nickname, leaderLevel: schema.users.level,
      };

      let result: Awaited<ReturnType<typeof db.select>>[];

      if (userId && includeJoined) {
        const conditions = [eq(schema.teamMembers.userId, userId), ne(schema.teams.leaderId, userId), eq(schema.teamMembers.status, "approved")];
        if (activeOnly) { conditions.push(ne(schema.teams.status, "completed")); conditions.push(ne(schema.teams.status, "cancelled")); }
        result = await db.select(teamColumns).from(schema.teams)
          .innerJoin(schema.teamMembers, eq(schema.teamMembers.teamId, schema.teams.id))
          .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
          .where(and(...conditions)).orderBy(desc(schema.teams.createdAt)) as Awaited<ReturnType<typeof db.select>>[];
      } else if (locationId) {
        result = await db.select(teamColumns).from(schema.teams)
          .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
          .where(eq(schema.teams.locationId, locationId))
          .orderBy(desc(schema.teams.createdAt)) as Awaited<ReturnType<typeof db.select>>[];
      } else {
        result = await db.select(teamColumns).from(schema.teams)
          .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
          .orderBy(desc(schema.teams.createdAt)) as Awaited<ReturnType<typeof db.select>>[];
      }

      const formattedTeams = result.map((row: unknown) => {
        const r = row as {
          id: string; locationId: string; routeId: string | null; leaderId: string;
          title: string; description: string | null; startTime: Date; endTime: Date;
          durationMin: number; maxMembers: number; requirements: string | null;
          icon: string; status: string; createdAt: Date; updatedAt: Date;
          currentMembers: number; leaderImage: string | null; leaderName: string;
          leaderNickname: string | null; leaderLevel: string | null;
        };
        const startDate = new Date(r.startTime);
        const endDate = new Date(r.endTime);
        const date = startDate.toISOString().split("T")[0];
        const time = startDate.toTimeString().slice(0, 5);
        const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
        let requirements: string[] = [];
        try { if (r.requirements) requirements = JSON.parse(r.requirements); } catch { /* 忽略 */ }
        return {
          id: r.id, locationId: r.locationId, routeId: r.routeId,
          title: r.title, description: r.description || "",
          date, time, duration: `${durationHours}小时`,
          durationMin: r.durationMin || durationHours * 60,
          maxMembers: r.maxMembers, currentMembers: r.currentMembers,
          icon: r.icon || "⭿️", requirements, status: r.status,
          createdAt: r.createdAt,
          leader: { id: r.leaderId, name: r.leaderName, nickname: r.leaderNickname || null, avatar: r.leaderImage || "", level: (r.leaderLevel || "beginner") as string },
        };
      });

      return c.json({ success: true, teams: formattedTeams });
    } catch (error) {
      console.error("Get teams error:", error);
      return c.json({ error: "获取队伍列表失败" }, 500);
    }
  });

  /**
   * POST /teams - 创建队伍（需要 mockSession）
   */
  app.post("/teams", async (c) => {
    if (!mockSession) return c.json({ error: "请先登录" }, 401);

    try {
      const userId = mockSession.userId;

      const userRecord = await db.select({ wechat: schema.users.wechat }).from(schema.users).where(eq(schema.users.id, userId)).then((rows) => rows[0]);
      if (!userRecord?.wechat) return c.json({ error: "请先填写微信号才能创建队伍" }, 400);

      const body = await c.req.json<{
        locationId?: string; routeId?: string; title?: string;
        description?: string; date?: string; time?: string;
        duration?: string; durationMin?: number; maxMembers?: number; requirements?: string[];
      }>();

      const { locationId, routeId, title, description, date, time, duration, durationMin, maxMembers, requirements } = body;
      if (!locationId || !title || !date || !time || !maxMembers) return c.json({ error: "缺少必填字段" }, 400);

      const startTime = new Date(`${date}T${time}`);
      if (isNaN(startTime.getTime())) return c.json({ error: "无效的日期或时间格式" }, 400);

      const durationMinutes = durationMin || 240;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
      const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const memberId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      const teamIcon = getRandomTeamIcon();

      await db.insert(schema.teams).values({
        id: teamId, locationId, routeId: routeId || null, leaderId: userId, title,
        description: description || null, startTime, endTime,
        durationMin: durationMinutes, maxMembers,
        requirements: requirements ? JSON.stringify(requirements) : null,
        icon: teamIcon, status: "recruiting", createdAt: now, updatedAt: now,
      });

      await db.insert(schema.teamMembers).values({
        id: memberId, teamId, userId, status: "approved", joinedAt: now, createdAt: now,
      });

      return c.json({ success: true, team: { id: teamId, locationId, title, status: "recruiting", currentMembers: 1 } }, 201);
    } catch (error) {
      console.error("Create team error:", error);
      return c.json({ error: "创建队伍失败" }, 500);
    }
  });

  /**
   * GET /teams/:id - 获取队伍详情
   */
  app.get("/teams/:id", async (c) => {
    try {
      const teamId = c.req.param("id");
      await updateExpiredTeamsLocal(teamId);

      const teamWithRelations = await db.query.teams.findFirst({
        where: eq(schema.teams.id, teamId),
        with: { leader: true, members: { with: { user: true } }, route: true },
      });

      if (!teamWithRelations) return c.json({ error: "队伍不存在" }, 404);

      const currentUserId = mockSession?.userId || null;
      const currentMembers = teamWithRelations.members?.filter((m: { status: string }) => m.status === "approved").length || 0;
      const isTeamMember = currentUserId
        ? !!teamWithRelations.members?.find((m: { userId: string; status: string }) => m.userId === currentUserId && m.status === "approved")
        : false;

      const leader = teamWithRelations.leader as { id: string; name: string; nickname?: string | null; image: string | null; bio: string | null; level: string | null; wechat: string | null };
      const startDate = new Date(teamWithRelations.startTime);
      const date = startDate.toISOString().split("T")[0];
      const time = startDate.toTimeString().slice(0, 5);
      const durationMinutes = teamWithRelations.durationMin || 240;
      const durationHours = Math.round(durationMinutes / 60);

      const relevantMembers = teamWithRelations.members
        ?.filter((m: { status: string }) => m.status === "approved" || m.status === "leave_pending")
        .map((m: { userId: string; status: string; joinedAt: Date | null; user: { id: string; name: string; nickname?: string | null; image: string | null; bio: string | null; level: string | null; wechat: string | null } }) => ({
          id: m.user?.id || m.userId, userId: m.userId, name: m.user?.name || "未知用户",
          nickname: m.user?.nickname || null, image: m.user?.image || null, bio: m.user?.bio || null,
          level: m.user?.level || "beginner", status: m.status, joinedAt: m.joinedAt,
          wechat: isTeamMember ? (m.user?.wechat || undefined) : undefined,
        })) || [];

      return c.json({
        success: true,
        team: {
          id: teamWithRelations.id, locationId: teamWithRelations.locationId,
          title: teamWithRelations.title, description: teamWithRelations.description || "",
          date, time, duration: `${durationHours}小时`, durationMin: durationMinutes,
          maxMembers: teamWithRelations.maxMembers, currentMembers,
          status: teamWithRelations.status, createdAt: teamWithRelations.createdAt,
          leader: leader ? { id: leader.id, name: leader.name, nickname: leader.nickname || null, avatar: leader.image || "", level: leader.level || "beginner", wechat: (isTeamMember || currentUserId === leader.id) ? (leader.wechat || "") : undefined } : null,
          members: relevantMembers,
        },
      });
    } catch (error) {
      return c.json({ error: "获取队伍详情失败" }, 500);
    }
  });

  /**
   * POST /teams/join - 申请加入队伍
   */
  app.post("/teams/join", async (c) => {
    if (!mockSession) return c.json({ error: "请先登录" }, 401);

    try {
      const userId = mockSession.userId;

      const userRecord = await db.select({ wechat: schema.users.wechat }).from(schema.users).where(eq(schema.users.id, userId)).then((rows) => rows[0]);
      if (!userRecord?.wechat) return c.json({ error: "请先填写微信号才能加入队伍" }, 400);

      const { teamId } = await c.req.json<{ teamId?: string }>();
      if (!teamId) return c.json({ error: "缺少队伍ID" }, 400);

      const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
      if (!team) return c.json({ error: "队伍不存在" }, 404);
      if (team.status !== "recruiting") return c.json({ error: "该队伍当前不接受新成员" }, 400);
      if (team.leaderId === userId) return c.json({ error: "你是该队伍的队长" }, 400);

      const [{ approvedCount }] = await db.select({ approvedCount: sql<number>`count(*)` }).from(schema.teamMembers).where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));
      if (approvedCount >= team.maxMembers) return c.json({ error: "队伍已满" }, 400);

      const existingMembers = await db.query.teamMembers.findMany({ where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)), limit: 1 });
      const existing = existingMembers[0];

      if (existing) {
        if (existing.status === "approved") return c.json({ error: "你已经是该队伍的成员" }, 400);
        if (existing.status === "pending") return c.json({ error: "你已经提交了申请，请等待审核" }, 400);
        if (existing.status === "rejected") {
          await db.update(schema.teamMembers).set({ status: "pending", createdAt: new Date() }).where(eq(schema.teamMembers.id, existing.id));
          return c.json({ success: true, message: "重新申请已提交" });
        }
      }

      const memberId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(schema.teamMembers).values({ id: memberId, teamId, userId, status: "pending", createdAt: new Date() });

      return c.json({ success: true, message: "申请已提交，等待队长审核" });
    } catch (error) {
      return c.json({ error: "申请加入失败" }, 500);
    }
  });

  /**
   * POST /teams/:id/members/:userId/approve - 批准申请
   */
  app.post("/teams/:id/members/:userId/approve", async (c) => {
    if (!mockSession) return c.json({ error: "请先登录" }, 401);

    try {
      const teamId = c.req.param("id");
      const targetUserId = c.req.param("userId");

      const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
      if (!team) return c.json({ error: "队伍不存在" }, 404);
      if (team.leaderId !== mockSession.userId) return c.json({ error: "只有队长可以审核成员" }, 403);

      const members = await db.query.teamMembers.findMany({ where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "pending")), limit: 1 });
      const membership = members[0];
      if (!membership) return c.json({ error: "未找到该成员的申请" }, 404);

      const [{ approvedCount }] = await db.select({ approvedCount: sql<number>`count(*)` }).from(schema.teamMembers).where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));
      if (approvedCount >= team.maxMembers) return c.json({ error: "队伍已满，无法批准新成员" }, 400);

      const now = new Date();
      const newCount = approvedCount + 1;
      const newStatus = newCount >= team.maxMembers ? "full" : "recruiting";

      await db.update(schema.teamMembers).set({ status: "approved", joinedAt: now, statusUpdatedAt: now }).where(eq(schema.teamMembers.id, membership.id));
      await db.update(schema.teams).set({ status: newStatus, updatedAt: now }).where(eq(schema.teams.id, teamId));

      return c.json({ success: true, message: "已通过申请" });
    } catch (error) {
      return c.json({ error: "批准申请失败" }, 500);
    }
  });

  /**
   * POST /teams/:id/members/:userId/reject - 拒绝申请
   */
  app.post("/teams/:id/members/:userId/reject", async (c) => {
    if (!mockSession) return c.json({ error: "请先登录" }, 401);

    try {
      const teamId = c.req.param("id");
      const targetUserId = c.req.param("userId");

      const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
      if (!team) return c.json({ error: "队伍不存在" }, 404);
      if (team.leaderId !== mockSession.userId) return c.json({ error: "只有队长可以审核成员" }, 403);

      const members = await db.query.teamMembers.findMany({ where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "pending")), limit: 1 });
      const membership = members[0];
      if (!membership) return c.json({ error: "未找到该成员的申请" }, 404);

      await db.update(schema.teamMembers).set({ status: "rejected" }).where(eq(schema.teamMembers.id, membership.id));
      return c.json({ success: true, message: "已拒绝申请" });
    } catch (error) {
      return c.json({ error: "拒绝申请失败" }, 500);
    }
  });

  /**
   * POST /teams/:id/members/:userId/remove - 移除成员
   */
  app.post("/teams/:id/members/:userId/remove", async (c) => {
    if (!mockSession) return c.json({ error: "请先登录" }, 401);

    try {
      const teamId = c.req.param("id");
      const targetUserId = c.req.param("userId");

      const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
      if (!team) return c.json({ error: "队伍不存在" }, 404);
      if (team.leaderId !== mockSession.userId) return c.json({ success: false, error: "只有队长可以移除成员" }, 403);
      if (targetUserId === mockSession.userId) return c.json({ success: false, error: "不能移除自己" }, 400);

      const members = await db.query.teamMembers.findMany({ where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "approved")), limit: 1 });
      const membership = members[0];
      if (!membership) return c.json({ success: false, error: "该用户不是队伍成员" }, 404);

      await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, membership.id));

      const [{ remainingCount }] = await db.select({ remainingCount: sql<number>`count(*)` }).from(schema.teamMembers).where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));
      await db.update(schema.teams).set({ status: remainingCount < team.maxMembers ? "recruiting" : team.status, updatedAt: new Date() }).where(eq(schema.teams.id, teamId));

      return c.json({ success: true, message: "已移除成员" });
    } catch (error) {
      return c.json({ success: false, error: "移除成员失败" }, 500);
    }
  });

  /**
   * POST /teams/:id/leave - 成员退出队伍
   */
  app.post("/teams/:id/leave", async (c) => {
    if (!mockSession) return c.json({ success: false, error: "请先登录" }, 401);

    try {
      const teamId = c.req.param("id");

      const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
      if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);

      const members = await db.query.teamMembers.findMany({ where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, mockSession.userId), eq(schema.teamMembers.status, "approved")), limit: 1 });
      const membership = members[0];
      if (!membership) return c.json({ success: false, error: "你不是该队伍成员" }, 400);
      if (membership.userId === team.leaderId) return c.json({ success: false, error: "队长不能退出队伍" }, 400);
      if (team.status === "formed") return c.json({ success: false, error: "队伍已组建，请通过退出申请流程离开" }, 400);

      await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, membership.id));

      const [{ remainingCount }] = await db.select({ remainingCount: sql<number>`count(*)` }).from(schema.teamMembers).where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));
      await db.update(schema.teams).set({ status: remainingCount < team.maxMembers ? "recruiting" : team.status, updatedAt: new Date() }).where(eq(schema.teams.id, teamId));

      return c.json({ success: true, message: "已成功退出队伍" });
    } catch (error) {
      return c.json({ success: false, error: "退出队伍失败" }, 500);
    }
  });

  /**
   * POST /teams/:id/cancel-application - 取消申请
   */
  app.post("/teams/:id/cancel-application", async (c) => {
    if (!mockSession) return c.json({ error: "请先登录" }, 401);

    try {
      const teamId = c.req.param("id");
      const members = await db.query.teamMembers.findMany({ where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, mockSession.userId), eq(schema.teamMembers.status, "pending")), limit: 1 });
      const membership = members[0];
      if (!membership) return c.json({ error: "未找到待审核的申请" }, 404);

      await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, membership.id));
      return c.json({ success: true, message: "申请已取消" });
    } catch (error) {
      return c.json({ error: "取消申请失败" }, 500);
    }
  });

  /**
   * GET /teams/:id/my-status - 获取成员状态
   */
  app.get("/teams/:id/my-status", async (c) => {
    if (!mockSession) return c.json({ success: true, status: null });

    try {
      const teamId = c.req.param("id");
      const members = await db.query.teamMembers.findMany({ where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, mockSession.userId)), limit: 1 });
      const membership = members[0];
      return c.json({ success: true, status: membership ? membership.status : null });
    } catch (error) {
      return c.json({ error: "获取状态失败" }, 500);
    }
  });

  /**
   * POST /teams/:id/form - 组建队伍
   */
  app.post("/teams/:id/form", async (c) => {
    if (!mockSession) return c.json({ success: false, error: "请先登录" }, 401);

    try {
      const teamId = c.req.param("id");

      const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
      if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
      if (team.leaderId !== mockSession.userId) return c.json({ success: false, error: "只有队长可以组建队伍" }, 403);
      if (team.status !== "recruiting" && team.status !== "full") return c.json({ success: false, error: "当前队伍状态无法组建" }, 400);

      const [{ approvedCount }] = await db.select({ approvedCount: sql<number>`count(*)` }).from(schema.teamMembers).where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));
      if (approvedCount < 1) return c.json({ success: false, error: "队伍至少需要1人才能组建" }, 400);

      await db.update(schema.teams).set({ status: "formed", updatedAt: new Date() }).where(eq(schema.teams.id, teamId));

      return c.json({ success: true, message: "队伍已组建" });
    } catch (error) {
      return c.json({ success: false, error: "组建队伍失败" }, 500);
    }
  });

  /**
   * POST /teams/:id/leave-request - 申请退出已组建队伍
   */
  app.post("/teams/:id/leave-request", async (c) => {
    if (!mockSession) return c.json({ success: false, error: "请先登录" }, 401);

    try {
      const teamId = c.req.param("id");

      const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
      if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
      if (team.status !== "formed") return c.json({ success: false, error: "只有已组建的队伍需要申请退出" }, 400);

      const members = await db.query.teamMembers.findMany({ where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, mockSession.userId), eq(schema.teamMembers.status, "approved")), limit: 1 });
      const membership = members[0];
      if (!membership) return c.json({ success: false, error: "你不是该队伍成员" }, 400);
      if (membership.userId === team.leaderId) return c.json({ success: false, error: "队长不能退出队伍" }, 400);

      const leaveRequests = await db.query.teamMembers.findMany({ where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, mockSession.userId), eq(schema.teamMembers.status, "leave_pending")), limit: 1 });
      if (leaveRequests.length > 0) return c.json({ success: false, error: "您已提交退出申请" }, 400);

      await db.update(schema.teamMembers).set({ status: "leave_pending" }).where(eq(schema.teamMembers.id, membership.id));

      return c.json({ success: true, message: "退出申请已提交，等待队长审批" });
    } catch (error) {
      return c.json({ success: false, error: "提交退出申请失败" }, 500);
    }
  });

  return app;
}
