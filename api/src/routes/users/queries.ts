import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createAuth } from "../../lib/auth";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { formatBeijingDateTime, getUserStats, getUserOngoingTeams } from "./utils";

const queries = new Hono<{ Bindings: Env }>();

/**
 * GET /users?id={userId}
 * 获取用户信息
 */
queries.get("/", async (c) => {
  try {
    const userId = c.req.query("id");
    if (!userId) return c.json(APIErrors.badRequest("User ID is required"), 400);

    const db = createDb(c.env.DB);
    const userList = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!userList.length) return c.json(APIErrors.notFound("User not found"), 404);

    const user = userList[0];
    return c.json({
      user: {
        id: user.id, name: user.name, nickname: user.nickname,
        email: user.email, avatar: user.image, bio: user.bio,
        gender: user.gender, birthday: user.birthday,
        level: user.level || "beginner",
        completedHikes: user.completedHikes ?? 0,
        wechat: user.wechat, extra: user.extra,
        role: user.role || "user", status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("[API /users] Error:", error);
    return c.json(APIErrors.internalError("Failed to get user"), 500);
  }
});

/**
 * GET /users/pending-approvals
 * 获取当前用户作为队长需要审批的所有申请（支持分页）
 */
queries.get("/pending-approvals", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const db = createDb(c.env.DB);
    const { and, desc, inArray, sql } = await import("drizzle-orm");

    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, parseInt(c.req.query("pageSize") || "10", 10));

    const leaderTeams = await db.query.teams.findMany({
      where: eq(schema.teams.leaderId, session.user.id),
      columns: { id: true, title: true, startTime: true, maxMembers: true, status: true },
    });

    if (!leaderTeams.length) return c.json({ success: true, approvals: [], pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false } });

    const teamIds = leaderTeams.map((t) => t.id);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(
        eq(schema.teamMembers.status, "pending"),
        inArray(schema.teamMembers.teamId, teamIds)
      ));

    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    const applications = await db.query.teamMembers.findMany({
      where: and(
        eq(schema.teamMembers.status, "pending"),
        inArray(schema.teamMembers.teamId, teamIds)
      ),
      with: {
        team: {
          columns: { id: true, title: true, startTime: true, maxMembers: true },
          with: { location: { columns: { id: true, name: true, coverImage: true } } },
        },
        user: { columns: { id: true, name: true, nickname: true, image: true, bio: true, level: true } },
      },
      orderBy: [desc(schema.teamMembers.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const formattedApprovals = applications.map((app) => {
      const startDate = app.team?.startTime ? new Date(app.team.startTime) : null;
      const { date, time } = formatBeijingDateTime(startDate);
      return {
        id: app.id, teamId: app.teamId, userId: app.userId, createdAt: app.createdAt,
        team: app.team ? {
          id: app.team.id, title: app.team.title,
          date, time,
          maxMembers: app.team.maxMembers,
          location: app.team.location || null,
        } : null,
        applicant: app.user ? { id: app.user.id, name: app.user.name, nickname: app.user.nickname, avatar: app.user.image, bio: app.user.bio, level: app.user.level } : null,
      };
    });

    return c.json({ success: true, approvals: formattedApprovals, pagination: { page, pageSize, total, totalPages, hasMore } });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    return c.json(APIErrors.internalError("获取待审批列表失败"), 500);
  }
});

/**
 * GET /users/applications
 * 获取当前用户的所有申请记录（以成员身份申请的，不含自己作为队长的）（支持分页）
 */
queries.get("/applications", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const db = createDb(c.env.DB);
    const { desc, sql, ne } = await import("drizzle-orm");

    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, parseInt(c.req.query("pageSize") || "10", 10));

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(and(
        eq(schema.teamMembers.userId, session.user.id),
        ne(schema.teams.leaderId, session.user.id)
      ));

const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    const result = await db
      .select({
        id: schema.teamMembers.id,
        status: schema.teamMembers.status,
        createdAt: schema.teamMembers.createdAt,
        joinedAt: schema.teamMembers.joinedAt,
        teamId: schema.teams.id,
        teamTitle: schema.teams.title,
        teamStartTime: schema.teams.startTime,
        teamMaxMembers: schema.teams.maxMembers,
        teamStatus: schema.teams.status,
        teamLeaderId: schema.teams.leaderId,
        locationId: schema.locations.id,
        locationName: schema.locations.name,
        locationSlug: schema.locations.slug,
        locationCoverImage: schema.locations.coverImage,
        leaderId: schema.users.id,
        leaderName: schema.users.name,
        leaderNickname: schema.users.nickname,
        leaderImage: schema.users.image,
      })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
      .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
      .where(and(
        eq(schema.teamMembers.userId, session.user.id),
        ne(schema.teams.leaderId, session.user.id)
      ))
      .orderBy(desc(schema.teamMembers.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const applications = result.map((row) => {
      const startDate = row.teamStartTime ? new Date(row.teamStartTime) : null;
      const { date, time } = formatBeijingDateTime(startDate);
      return {
        id: row.id,
        status: row.status,
        createdAt: row.createdAt,
        joinedAt: row.joinedAt,
        team: {
          id: row.teamId,
          title: row.teamTitle,
          date,
          time,
          maxMembers: row.teamMaxMembers,
          status: row.teamStatus,
          location: row.locationId ? {
            id: row.locationId,
            name: row.locationName,
            slug: row.locationSlug,
            coverImage: row.locationCoverImage,
          } : null,
          leader: row.leaderId ? {
            id: row.leaderId,
            name: row.leaderName,
            nickname: row.leaderNickname,
            avatar: row.leaderImage,
          } : null,
        },
      };
    });

    const [{ pending }] = await db
      .select({ pending: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(and(
        eq(schema.teamMembers.userId, session.user.id),
        ne(schema.teams.leaderId, session.user.id),
        eq(schema.teamMembers.status, "pending")
      ));

    const [{ approved }] = await db
      .select({ approved: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(and(
        eq(schema.teamMembers.userId, session.user.id),
        ne(schema.teams.leaderId, session.user.id),
        eq(schema.teamMembers.status, "approved")
      ));

    const [{ rejected }] = await db
      .select({ rejected: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(and(
        eq(schema.teamMembers.userId, session.user.id),
        ne(schema.teams.leaderId, session.user.id),
        eq(schema.teamMembers.status, "rejected")
      ));

    const stats = { pending, approved, rejected };

    return c.json({ success: true, applications, stats, pagination: { page, pageSize, total, totalPages, hasMore } });
  } catch (error) {
    console.error("Get user applications error:", error);
    return c.json(APIErrors.internalError("获取申请列表失败"), 500);
  }
});

/**
 * GET /users/teams/joined
 * 获取当前用户以成员身份加入（已审批通过）的所有队伍（支持分页）
 */
queries.get("/teams/joined", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const db = createDb(c.env.DB);
    const { desc, sql, inArray, ne } = await import("drizzle-orm");

    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, parseInt(c.req.query("pageSize") || "10", 10));

    const currentMembersSubquery = sql<number>`(
      SELECT COUNT(*) FROM team_members
      WHERE team_members.team_id = ${schema.teams.id}
      AND team_members.status = 'approved'
    )`;

    const memberships = await db.query.teamMembers.findMany({
      where: (tm, { and }) =>
        and(
          eq(tm.userId, session.user.id),
          eq(tm.status, "approved")
        ),
      columns: { teamId: true },
    });

    const teamIds = memberships.map((m) => m.teamId);
    if (!teamIds.length) return c.json({ success: true, teams: [], pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false } });

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.teams)
      .where(and(inArray(schema.teams.id, teamIds), ne(schema.teams.leaderId, session.user.id)));

    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    const result = await db
      .select({
        id: schema.teams.id, locationId: schema.teams.locationId, routeId: schema.teams.routeId,
        leaderId: schema.teams.leaderId, title: schema.teams.title, description: schema.teams.description,
        startTime: schema.teams.startTime, endTime: schema.teams.endTime, durationMin: schema.teams.durationMin,
        maxMembers: schema.teams.maxMembers, requirements: schema.teams.requirements,
        icon: schema.teams.icon, status: schema.teams.status, createdAt: schema.teams.createdAt,
        updatedAt: schema.teams.updatedAt, currentMembers: currentMembersSubquery,
        leaderImage: schema.users.image, leaderName: schema.users.name, leaderLevel: schema.users.level,
        locationName: schema.locations.name, locationCoverImage: schema.locations.coverImage,
      })
      .from(schema.teams)
      .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
      .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
      .where(and(inArray(schema.teams.id, teamIds), ne(schema.teams.leaderId, session.user.id)))
      .orderBy(desc(schema.teams.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const teams = result.map((row) => {
      const startDate = new Date(row.startTime);
      const endDate = new Date(row.endTime);
      const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      const { date, time } = formatBeijingDateTime(startDate);
      let requirements: string[] = [];
      try { if (row.requirements) requirements = JSON.parse(row.requirements); } catch { /* ignore */ }
      return {
        id: row.id, locationId: row.locationId, routeId: row.routeId, title: row.title,
        description: row.description || "", date, time, duration: `${durationHours}小时`,
        durationMin: row.durationMin || durationHours * 60, maxMembers: row.maxMembers,
        currentMembers: row.currentMembers, icon: row.icon || "⛰️", requirements,
        status: row.status, createdAt: row.createdAt,
        location: row.locationName ? { name: row.locationName, coverImage: row.locationCoverImage || "" } : undefined,
        leader: { id: row.leaderId, name: row.leaderName, avatar: row.leaderImage || "", level: row.leaderLevel || "beginner", completedHikes: 0, bio: "" },
      };
    });

    return c.json({ success: true, teams, pagination: { page, pageSize, total, totalPages, hasMore } });
  } catch (error) {
    console.error("Get joined teams error:", error);
    return c.json(APIErrors.internalError("获取加入的队伍失败"), 500);
  }
});

/**
 * GET /users/created-teams
 * 获取当前用户创建的所有队伍（支持分页）
 */
queries.get("/created-teams", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const db = createDb(c.env.DB);
    const { desc, sql } = await import("drizzle-orm");

    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, parseInt(c.req.query("pageSize") || "10", 10));

    const currentMembersSubquery = sql<number>`(
      SELECT COUNT(*) FROM team_members
      WHERE team_members.team_id = ${schema.teams.id}
      AND team_members.status = 'approved'
    )`;

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.teams)
      .where(eq(schema.teams.leaderId, session.user.id));

    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    const result = await db
      .select({
        id: schema.teams.id, locationId: schema.teams.locationId, routeId: schema.teams.routeId,
        leaderId: schema.teams.leaderId, title: schema.teams.title, description: schema.teams.description,
        startTime: schema.teams.startTime, endTime: schema.teams.endTime, durationMin: schema.teams.durationMin,
        maxMembers: schema.teams.maxMembers, requirements: schema.teams.requirements,
        icon: schema.teams.icon, status: schema.teams.status, createdAt: schema.teams.createdAt,
        updatedAt: schema.teams.updatedAt, currentMembers: currentMembersSubquery,
        leaderImage: schema.users.image, leaderName: schema.users.name, leaderLevel: schema.users.level,
        locationName: schema.locations.name, locationCoverImage: schema.locations.coverImage,
      })
      .from(schema.teams)
      .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
      .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
      .where(eq(schema.teams.leaderId, session.user.id))
      .orderBy(desc(schema.teams.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const teams = result.map((row) => {
      const startDate = new Date(row.startTime);
      const endDate = new Date(row.endTime);
      const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      const { date, time } = formatBeijingDateTime(startDate);
      let requirements: string[] = [];
      try { if (row.requirements) requirements = JSON.parse(row.requirements); } catch { /* ignore */ }
      return {
        id: row.id, locationId: row.locationId, routeId: row.routeId, title: row.title,
        description: row.description || "", date, time, duration: `${durationHours}小时`,
        durationMin: row.durationMin || durationHours * 60, maxMembers: row.maxMembers,
        currentMembers: row.currentMembers, icon: row.icon || "⛰️", requirements,
        status: row.status, createdAt: row.createdAt,
        location: row.locationName ? { name: row.locationName, coverImage: row.locationCoverImage || "" } : undefined,
        leader: { id: row.leaderId, name: row.leaderName, avatar: row.leaderImage || "", level: row.leaderLevel || "beginner", completedHikes: 0, bio: "" },
      };
    });

    return c.json({ success: true, teams, pagination: { page, pageSize, total, totalPages, hasMore } });
  } catch (error) {
    console.error("Get created teams error:", error);
    return c.json(APIErrors.internalError("获取创建的队伍失败"), 500);
  }
});

/**
 * GET /users/:id
 * 获取指定用户的公开资料（必须放在所有具体路径之后，避免被提前匹配）
 */
queries.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const userList = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    if (!userList.length) return c.json(APIErrors.notFound("User not found"), 404);

    const user = userList[0];

    // 查询用户统计数据
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    const isSelf = session?.user?.id === id;

    const stats = await getUserStats(db, id);
    const ongoingTeams = await getUserOngoingTeams(db, id);

    return c.json({
      success: true,
      user: {
        id: user.id, name: user.name, nickname: user.nickname,
        avatar: user.image, bio: user.bio, gender: user.gender,
        birthday: user.birthday,
        level: user.level || "beginner",
        completedHikes: user.completedHikes ?? 0,
        extra: user.extra,
        createdAt: user.createdAt,
        stats,
        // 仅自己可见的字段
        ...(isSelf ? { email: user.email, wechat: user.wechat, role: user.role, status: user.status } : {}),
      },
      ongoingTeams,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return c.json(APIErrors.internalError("Failed to get user profile"), 500);
  }
});

export default queries;
