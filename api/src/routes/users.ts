import { Hono } from "hono";
import { and, eq, ne, or, gt, inArray } from "drizzle-orm";
import { createAuth } from "../lib/auth";
import { createDb } from "../db";
import * as schema from "../db/schema";
import type { Env } from "../lib/auth";

/** 返回安全的用户对象（时间戳格式） */
function sanitizeUser(user: typeof schema.users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    avatar: user.image,
    bio: user.bio,
    gender: user.gender,
    birthday: user.birthday ? (user.birthday as Date).getTime() : null,
    level: user.level || "beginner",
    completedHikes: user.completedHikes ?? 0,
    wechat: user.wechat,
    extra: user.extra,
    role: user.role || "user",
    status: user.status,
    createdAt: user.createdAt ? (user.createdAt as Date).getTime() : null,
    updatedAt: user.updatedAt ? (user.updatedAt as Date).getTime() : null,
  };
}

const users = new Hono<{ Bindings: Env }>();

/** 校验 UserExtra 字段格式 */
function validateUserExtra(extra: unknown): extra is { equipment?: string[]; experience?: string } {
  if (typeof extra !== "object" || extra === null) return false;
  const e = extra as Record<string, unknown>;
  if (e.equipment !== undefined && !Array.isArray(e.equipment)) return false;
  if (e.experience !== undefined && typeof e.experience !== "string") return false;
  return true;
}

/**
 * GET /users?id={userId}
 * 获取用户信息
 */
users.get("/", async (c) => {
  try {
    const userId = c.req.query("id");
    if (!userId) return c.json({ error: "User ID is required" }, 400);

    const db = createDb(c.env.DB);
    const userList = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!userList.length) return c.json({ error: "User not found" }, 404);

    const user = userList[0];
    return c.json({
      user: {
        id: user.id, name: user.name, nickname: user.nickname,
        email: user.email, avatar: user.image, bio: user.bio,
        gender: user.gender, birthday: user.birthday ? (user.birthday as Date).getTime() : null,
        level: user.level || "beginner",
        completedHikes: user.completedHikes ?? 0,
        wechat: user.wechat, extra: user.extra,
        role: user.role || "user", status: user.status,
        createdAt: user.createdAt ? (user.createdAt as Date).getTime() : null,
        updatedAt: user.updatedAt ? (user.updatedAt as Date).getTime() : null,
      },
    });
  } catch (error) {
    console.error("[API /users] Error:", error);
    return c.json({ error: "Failed to get user" }, 500);
  }
});

/**
 * PATCH /users/update
 * 更新用户信息（需登录，只能修改自己的资料）
 */
users.patch("/update", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const db = createDb(c.env.DB);
    const body = await c.req.json<{
      userId?: string; name?: string; nickname?: string; bio?: string;
      level?: string; image?: string; wechat?: string; gender?: string;
      birthday?: string | number; extra?: unknown;
    }>();
    const { userId, name, nickname, bio, level, image, wechat, gender, birthday, extra } = body;

    if (!userId) return c.json({ error: "User ID is required" }, 400);

    const updateData: Partial<typeof schema.users.$inferInsert> = {};
    if (name !== undefined) updateData.name = name;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (bio !== undefined) updateData.bio = bio;
    if (level !== undefined) updateData.level = level;
    if (image !== undefined) updateData.image = image;
    if (wechat !== undefined) updateData.wechat = wechat;
    if (gender !== undefined) updateData.gender = gender;
    if (birthday !== undefined) {
      updateData.birthday = typeof birthday === "string" ? new Date(birthday) : new Date(birthday as number);
    }
    if (extra !== undefined) {
      if (!validateUserExtra(extra)) return c.json({ error: "Invalid extra field format" }, 400);
      updateData.extra = JSON.stringify(extra);
    }
    updateData.updatedAt = new Date();

    // 支持 email 或 id 查找用户
    let targetUserId = userId;
    const byEmail = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, userId))
      .limit(1);
    if (byEmail.length > 0) targetUserId = byEmail[0].id;

    // 鉴权：只允许修改自己的资料（管理员除外）
    if (targetUserId !== session.user.id) {
      const sessionUser = await db
        .select({ role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.id, session.user.id))
        .limit(1);
      if (!sessionUser.length || sessionUser[0].role !== "admin") {
        return c.json({ error: "无权限修改他人资料" }, 403);
      }
    }

    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);
    if (!existing.length) return c.json({ error: `User not found: ${targetUserId}` }, 404);

    await db.update(schema.users).set(updateData).where(eq(schema.users.id, targetUserId));

    // 读取更新后的完整用户数据
    const updatedRows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);
    const updatedUser = updatedRows[0];

    return c.json({ success: true, user: sanitizeUser(updatedUser) });
  } catch (error) {
    console.error("User update error:", error);
    return c.json({ error: "Failed to update user" }, 500);
  }
});

/**
 * GET /users/pending-approvals
 * 获取当前用户作为队长需要审批的所有申请
 */
users.get("/pending-approvals", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const db = createDb(c.env.DB);
    const { and, desc, inArray } = await import("drizzle-orm");

    const leaderTeams = await db.query.teams.findMany({
      where: eq(schema.teams.leaderId, session.user.id),
      columns: { id: true, title: true, startTime: true, maxMembers: true, status: true },
    });

    if (!leaderTeams.length) return c.json({ success: true, approvals: [], total: 0 });

    const teamIds = leaderTeams.map((t) => t.id);

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
    });

    const formattedApprovals = applications.map((app) => {
      const startDate = app.team?.startTime ? new Date(app.team.startTime) : null;
      return {
        id: app.id, teamId: app.teamId, userId: app.userId, createdAt: app.createdAt,
        team: app.team ? {
          id: app.team.id, title: app.team.title,
          date: startDate ? startDate.toISOString().split("T")[0] : null,
          time: startDate ? startDate.toTimeString().slice(0, 5) : null,
          maxMembers: app.team.maxMembers,
          location: app.team.location || null,
        } : null,
        applicant: app.user ? { id: app.user.id, name: app.user.name, nickname: app.user.nickname, avatar: app.user.image, bio: app.user.bio, level: app.user.level } : null,
      };
    });

    return c.json({ success: true, approvals: formattedApprovals, total: formattedApprovals.length });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    return c.json({ error: "获取待审批列表失败" }, 500);
  }
});

/**
 * GET /users/applications
 * 获取当前用户的所有申请记录（以成员身份申请的，不含自己作为队长的）
 */
users.get("/applications", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const db = createDb(c.env.DB);
    const { desc } = await import("drizzle-orm");

    const allApplications = await db.query.teamMembers.findMany({
      where: eq(schema.teamMembers.userId, session.user.id),
      with: {
        team: {
          with: {
            location: { columns: { id: true, name: true, slug: true, coverImage: true } },
            leader: { columns: { id: true, name: true, nickname: true, image: true } },
          },
        },
      },
      orderBy: [desc(schema.teamMembers.createdAt)],
    });

    const applications = allApplications.filter((app) => app.team?.leaderId !== session.user.id);

    const formattedApplications = applications.map((app) => {
      const team = app.team;
      const startDate = team ? new Date(team.startTime) : null;
      return {
        id: app.id, status: app.status, createdAt: app.createdAt, joinedAt: app.joinedAt,
        team: team ? {
          id: team.id, title: team.title,
          date: startDate ? startDate.toISOString().split("T")[0] : null,
          time: startDate ? startDate.toTimeString().slice(0, 5) : null,
          maxMembers: team.maxMembers, status: team.status,
          location: team.location || null,
          leader: team.leader ? { id: team.leader.id, name: team.leader.name, nickname: team.leader.nickname, avatar: team.leader.image } : null,
        } : null,
      };
    });

    const stats = {
      pending: applications.filter((a) => a.status === "pending").length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };

    return c.json({ success: true, applications: formattedApplications, stats });
  } catch (error) {
    console.error("Get user applications error:", error);
    return c.json({ error: "获取申请列表失败" }, 500);
  }
});

/**
 * GET /users/teams/joined
 * 获取当前用户以成员身份加入（已审批通过）的所有队伍
 */
users.get("/teams/joined", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const db = createDb(c.env.DB);
    const { desc, sql } = await import("drizzle-orm");

    const currentMembersSubquery = sql<number>`(
      SELECT COUNT(*) FROM team_members
      WHERE team_members.team_id = ${schema.teams.id}
      AND team_members.status = 'approved'
    )`;

    // 查找用户已审批加入的队伍（排除自己作为队长的队伍）
    const memberships = await db.query.teamMembers.findMany({
      where: (tm, { and }) =>
        and(
          eq(tm.userId, session.user.id),
          eq(tm.status, "approved")
        ),
      columns: { teamId: true },
    });

    const teamIds = memberships.map((m) => m.teamId);
    if (!teamIds.length) return c.json({ success: true, teams: [] });

    const { inArray, ne } = await import("drizzle-orm");
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
      .orderBy(desc(schema.teams.createdAt));

    const teams = result.map((row) => {
      const startDate = new Date(row.startTime);
      const endDate = new Date(row.endTime);
      const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      let requirements: string[] = [];
      try { if (row.requirements) requirements = JSON.parse(row.requirements); } catch { /* ignore */ }
      return {
        id: row.id, locationId: row.locationId, routeId: row.routeId, title: row.title,
        description: row.description || "", date: startDate.toISOString().split("T")[0],
        time: startDate.toTimeString().slice(0, 5), duration: `${durationHours}小时`,
        durationMin: row.durationMin || durationHours * 60, maxMembers: row.maxMembers,
        currentMembers: row.currentMembers, icon: row.icon || "⛰️", requirements,
        status: row.status, createdAt: row.createdAt,
        location: row.locationName ? { name: row.locationName, coverImage: row.locationCoverImage || "" } : undefined,
        leader: { id: row.leaderId, name: row.leaderName, avatar: row.leaderImage || "", level: row.leaderLevel || "beginner", completedHikes: 0, bio: "" },
      };
    });

    return c.json({ success: true, teams });
  } catch (error) {
    console.error("Get joined teams error:", error);
    return c.json({ error: "获取加入的队伍失败" }, 500);
  }
});

/**
 * GET /users/created-teams
 * 获取当前用户创建的所有队伍
 */
users.get("/created-teams", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const db = createDb(c.env.DB);
    const { desc, sql } = await import("drizzle-orm");

    const currentMembersSubquery = sql<number>`(
      SELECT COUNT(*) FROM team_members
      WHERE team_members.team_id = ${schema.teams.id}
      AND team_members.status = 'approved'
    )`;

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
      .orderBy(desc(schema.teams.createdAt));

    const teams = result.map((row) => {
      const startDate = new Date(row.startTime);
      const endDate = new Date(row.endTime);
      const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      let requirements: string[] = [];
      try { if (row.requirements) requirements = JSON.parse(row.requirements); } catch { /* ignore */ }
      return {
        id: row.id, locationId: row.locationId, routeId: row.routeId, title: row.title,
        description: row.description || "", date: startDate.toISOString().split("T")[0],
        time: startDate.toTimeString().slice(0, 5), duration: `${durationHours}小时`,
        durationMin: row.durationMin || durationHours * 60, maxMembers: row.maxMembers,
        currentMembers: row.currentMembers, icon: row.icon || "⛰️", requirements,
        status: row.status, createdAt: row.createdAt,
        location: row.locationName ? { name: row.locationName, coverImage: row.locationCoverImage || "" } : undefined,
        leader: { id: row.leaderId, name: row.leaderName, avatar: row.leaderImage || "", level: row.leaderLevel || "beginner", completedHikes: 0, bio: "" },
      };
    });

    return c.json({ success: true, teams });
  } catch (error) {
    console.error("Get created teams error:", error);
    return c.json({ error: "获取创建的队伍失败" }, 500);
  }
});

/**
 * GET /users/:id
 * 获取指定用户的公开资料（必须放在所有具体路径之后，避免被提前匹配）
 */
users.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const userList = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    if (!userList.length) return c.json({ error: "User not found" }, 404);

    const user = userList[0];

    // 查询用户统计数据
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    const isSelf = session?.user?.id === id;

    // 统计创建的队伍数
    const createdTeamsCount = await db
      .select({ count: schema.teams.id })
      .from(schema.teams)
      .where(eq(schema.teams.leaderId, id));

    // 统计参加的队伍数（已审批通过，排除自己作为队长的）
    const joinedTeamsCount = await db
      .select({ count: schema.teamMembers.id })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(
        and(
          eq(schema.teamMembers.userId, id),
          eq(schema.teamMembers.status, "approved"),
          // 排除自己作为队长的队伍
          ne(schema.teams.leaderId, id)
        )
      );

    // 统计已完成的队伍数（包括自己创建的和参加的）
    const completedAsLeaderCount = await db
      .select({ count: schema.teams.id })
      .from(schema.teams)
      .where(
        and(
          eq(schema.teams.leaderId, id),
          eq(schema.teams.status, "completed")
        )
      );

    const completedAsMemberCount = await db
      .select({ count: schema.teamMembers.id })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(
        and(
          eq(schema.teamMembers.userId, id),
          eq(schema.teamMembers.status, "approved"),
          eq(schema.teams.status, "completed"),
          // 排除自己作为队长的队伍（避免重复计数）
          ne(schema.teams.leaderId, id)
        )
      );

    const stats = {
      createdTeams: createdTeamsCount.length,
      joinedTeams: joinedTeamsCount.length,
      completedTeams: completedAsLeaderCount.length + completedAsMemberCount.length,
    };

    // 查询正在进行中的队伍（作为队长或已批准成员）
    const now = new Date();
    const activeStatuses = ["recruiting", "full", "formed"];

    // 获取用户参与的所有队伍ID（作为队长或已批准成员）
    const { sql } = await import("drizzle-orm");
    const currentMembersSubquery = sql<number>`(SELECT COUNT(*) FROM team_members WHERE team_members.team_id = ${schema.teams.id} AND team_members.status = 'approved')`;

    // 查询作为队长的正在进行中的队伍
    const createdOngoingTeams = await db
      .select({
        id: schema.teams.id, title: schema.teams.title, startTime: schema.teams.startTime,
        endTime: schema.teams.endTime, maxMembers: schema.teams.maxMembers, status: schema.teams.status,
        locationName: schema.locations.name, locationCoverImage: schema.locations.coverImage,
        currentMembers: currentMembersSubquery,
      })
      .from(schema.teams)
      .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
      .where(
        and(
          eq(schema.teams.leaderId, id),
          inArray(schema.teams.status, activeStatuses),
          gt(schema.teams.endTime, now)
        )
      )
      .limit(5);

    // 查询作为成员加入的正在进行中的队伍
    const joinedOngoingTeams = await db
      .select({
        id: schema.teams.id, title: schema.teams.title, startTime: schema.teams.startTime,
        endTime: schema.teams.endTime, maxMembers: schema.teams.maxMembers, status: schema.teams.status,
        locationName: schema.locations.name, locationCoverImage: schema.locations.coverImage,
        currentMembers: currentMembersSubquery,
      })
      .from(schema.teams)
      .innerJoin(schema.teamMembers, eq(schema.teamMembers.teamId, schema.teams.id))
      .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
      .where(
        and(
          eq(schema.teamMembers.userId, id),
          eq(schema.teamMembers.status, "approved"),
          ne(schema.teams.leaderId, id), // 排除自己作为队长的
          inArray(schema.teams.status, activeStatuses),
          gt(schema.teams.endTime, now)
        )
      )
      .limit(5);

    // 合并并格式化正在进行中的队伍
    const allOngoingTeams = [...createdOngoingTeams, ...joinedOngoingTeams]
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 8);

    const ongoingTeams = allOngoingTeams.map((row) => {
      const startDate = new Date(row.startTime);
      return {
        id: row.id,
        title: row.title,
        date: startDate.toISOString().split("T")[0],
        time: startDate.toTimeString().slice(0, 5),
        status: row.status,
        currentMembers: row.currentMembers ?? 0,
        maxMembers: row.maxMembers,
        location: row.locationName ? {
          name: row.locationName,
          coverImage: row.locationCoverImage || "",
        } : null,
      };
    });

    return c.json({
      success: true,
      user: {
        id: user.id, name: user.name, nickname: user.nickname,
        avatar: user.image, bio: user.bio, gender: user.gender,
        birthday: user.birthday ? (user.birthday as Date).getTime() : null,
        level: user.level || "beginner",
        completedHikes: user.completedHikes ?? 0,
        extra: user.extra,
        createdAt: user.createdAt ? (user.createdAt as Date).getTime() : 0,
        stats,
        // 仅自己可见的字段
        ...(isSelf ? { email: user.email, wechat: user.wechat, role: user.role, status: user.status } : {}),
      },
      ongoingTeams,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return c.json({ error: "Failed to get user profile" }, 500);
  }
});

export { users as usersRoute };
