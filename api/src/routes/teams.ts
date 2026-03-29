import { Hono } from "hono";
import { eq, desc, and, ne, sql, like, inArray, lt } from "drizzle-orm";
import { createAuth } from "../lib/auth";
import { createDb } from "../db";
import * as schema from "../db/schema";
import type { Env } from "../lib/auth";

const teams = new Hono<{ Bindings: Env }>();

/** 随机队伍图标 */
const TEAM_ICONS = ["⛰️", "🥾", "🌲", "🏕️", "🧗", "🌄", "🏞️", "🗺️"];
function getRandomTeamIcon() {
  return TEAM_ICONS[Math.floor(Math.random() * TEAM_ICONS.length)];
}

/** 将 endTime 已过期的 formed 队伍更新为 completed */
async function updateExpiredTeams(db: ReturnType<typeof createDb>, teamId?: string) {
  const now = new Date();
  const condition = teamId
    ? and(eq(schema.teams.id, teamId), eq(schema.teams.status, "formed"), lt(schema.teams.endTime, now))
    : and(eq(schema.teams.status, "formed"), lt(schema.teams.endTime, now));
  await db
    .update(schema.teams)
    .set({ status: "completed", updatedAt: now })
    .where(condition as ReturnType<typeof and>);
}

/**
 * GET /teams
 * 获取队伍列表，支持分页、搜索、status/difficulty 过滤
 * 也支持 locationId / userId+includeJoined / activeOnly 特殊模式
 */
teams.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);

    // 特殊模式参数
    const locationId = c.req.query("locationId");
    const userId = c.req.query("userId");
    const includeJoined = c.req.query("includeJoined") === "true";
    const activeOnly = c.req.query("activeOnly") === "true";

    // 列表模式参数
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, parseInt(c.req.query("pageSize") || "12", 10));
    const search = c.req.query("search") || "";
    const statusParam = c.req.query("status") || "";
    const difficultyParam = c.req.query("difficulty") || "";

    await updateExpiredTeams(db);

    const currentMembersSubquery = sql<number>`(
      SELECT COUNT(*) FROM team_members
      WHERE team_members.team_id = ${schema.teams.id}
      AND team_members.status = 'approved'
    )`;

    const teamColumns = {
      id: schema.teams.id,
      locationId: schema.teams.locationId,
      routeId: schema.teams.routeId,
      leaderId: schema.teams.leaderId,
      title: schema.teams.title,
      description: schema.teams.description,
      startTime: schema.teams.startTime,
      endTime: schema.teams.endTime,
      durationMin: schema.teams.durationMin,
      maxMembers: schema.teams.maxMembers,
      requirements: schema.teams.requirements,
      icon: schema.teams.icon,
      status: schema.teams.status,
      createdAt: schema.teams.createdAt,
      updatedAt: schema.teams.updatedAt,
      currentMembers: currentMembersSubquery,
      leaderImage: schema.users.image,
      leaderName: schema.users.name,
      leaderNickname: schema.users.nickname,
      leaderLevel: schema.users.level,
      locationName: schema.locations.name,
      locationCoverImage: schema.locations.coverImage,
    };

    type TeamRow = {
      id: string; locationId: string; routeId: string | null; leaderId: string;
      title: string; description: string | null; startTime: Date; endTime: Date;
      durationMin: number | null; maxMembers: number; requirements: string | null;
      icon: string; status: string; createdAt: Date; updatedAt: Date;
      currentMembers: number; leaderImage: string | null; leaderName: string;
      leaderNickname: string | null; leaderLevel: string | null;
      locationName: string | null; locationCoverImage: string | null;
    };

    let result: TeamRow[];

    // 特殊模式：我加入的队伍
    if (userId && includeJoined) {
      const conditions = [
        eq(schema.teamMembers.userId, userId),
        ne(schema.teams.leaderId, userId),
        eq(schema.teamMembers.status, "approved"),
      ];
      if (activeOnly) {
        conditions.push(ne(schema.teams.status, "completed"));
        conditions.push(ne(schema.teams.status, "cancelled"));
      }
      result = await db
        .select(teamColumns)
        .from(schema.teams)
        .innerJoin(schema.teamMembers, eq(schema.teamMembers.teamId, schema.teams.id))
        .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
        .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
        .where(and(...conditions))
        .orderBy(desc(schema.teams.createdAt)) as TeamRow[];
      return c.json({ success: true, teams: formatTeams(result) });
    }

    // 特殊模式：某地点的队伍
    if (locationId) {
      const conditions = [eq(schema.teams.locationId, locationId)];

      // 添加 status 过滤
      if (statusParam) {
        const statuses = statusParam.split(",").filter(Boolean);
        if (statuses.length === 1) {
          conditions.push(eq(schema.teams.status, statuses[0]));
        } else if (statuses.length > 1) {
          conditions.push(inArray(schema.teams.status, statuses));
        }
      }

      result = await db
        .select(teamColumns)
        .from(schema.teams)
        .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
        .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
        .where(and(...conditions))
        .orderBy(desc(schema.teams.createdAt)) as TeamRow[];
      return c.json({ success: true, teams: formatTeams(result) });
    }

    // 通用列表模式：支持搜索、status、difficulty、分页
    const conditions = [];

    if (statusParam) {
      const statuses = statusParam.split(",").filter(Boolean);
      if (statuses.length === 1) {
        conditions.push(eq(schema.teams.status, statuses[0]));
      } else if (statuses.length > 1) {
        conditions.push(inArray(schema.teams.status, statuses));
      }
    }

    if (search) {
      conditions.push(like(schema.teams.title, `%${search}%`));
    }

    // difficulty 过滤需要 join routes 表
    const difficultyList = difficultyParam ? difficultyParam.split(",").filter(Boolean) : [];

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 统计总数（difficulty 过滤时需要 join routes）
    let total: number;
    if (difficultyList.length > 0) {
      const [{ cnt }] = await db
        .select({ cnt: sql<number>`count(distinct ${schema.teams.id})` })
        .from(schema.teams)
        .leftJoin(schema.routes, eq(schema.routes.id, schema.teams.routeId))
        .where(and(whereClause, inArray(schema.routes.difficulty, difficultyList)));
      total = cnt;
    } else {
      const [{ cnt }] = await db
        .select({ cnt: sql<number>`count(*)` })
        .from(schema.teams)
        .where(whereClause);
      total = cnt;
    }

    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    // 查询列表
    if (difficultyList.length > 0) {
      result = await db
        .select(teamColumns)
        .from(schema.teams)
        .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
        .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
        .leftJoin(schema.routes, eq(schema.routes.id, schema.teams.routeId))
        .where(and(whereClause, inArray(schema.routes.difficulty, difficultyList)))
        .orderBy(desc(schema.teams.startTime))
        .limit(pageSize)
        .offset(offset) as TeamRow[];
    } else {
      result = await db
        .select(teamColumns)
        .from(schema.teams)
        .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
        .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
        .where(whereClause)
        .orderBy(desc(schema.teams.startTime))
        .limit(pageSize)
        .offset(offset) as TeamRow[];
    }

    return c.json({
      success: true,
      teams: formatTeams(result),
      pagination: { page, pageSize, total, totalPages },
    });
  } catch (error) {
    console.error("Get teams error:", error);
    return c.json({ error: "获取队伍列表失败" }, 500);
  }
});

/** 格式化队伍行数据为前端所需格式 */
function formatTeams(result: {
  id: string; locationId: string; routeId: string | null; leaderId: string;
  title: string; description: string | null; startTime: Date; endTime: Date;
  durationMin: number | null; maxMembers: number; requirements: string | null;
  icon: string; status: string; createdAt: Date; updatedAt: Date;
  currentMembers: number; leaderImage: string | null; leaderName: string;
  leaderNickname: string | null; leaderLevel: string | null;
  locationName: string | null; locationCoverImage: string | null;
}[]) {
  return result.map((row) => {
    const startDate = new Date(row.startTime);
    const endDate = new Date(row.endTime);
    const date = startDate.toISOString().split("T")[0];
    const time = startDate.toTimeString().slice(0, 5);
    const durationHours = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    );
    let requirements: string[] = [];
    try {
      if (row.requirements) requirements = JSON.parse(row.requirements);
    } catch { /* 忽略解析错误 */ }
    return {
      id: row.id, locationId: row.locationId, routeId: row.routeId,
      title: row.title, description: row.description || "",
      date, time, duration: `${durationHours}小时`,
      durationMin: row.durationMin || durationHours * 60,
      maxMembers: row.maxMembers, currentMembers: row.currentMembers,
      icon: row.icon || "⭿️", requirements, status: row.status,
      createdAt: row.createdAt,
      location: row.locationName ? {
        name: row.locationName,
        coverImage: row.locationCoverImage || "",
      } : undefined,
      leader: {
        id: row.leaderId, name: row.leaderName,
        nickname: row.leaderNickname || null,
        avatar: row.leaderImage || "",
        level: (row.leaderLevel || "beginner") as string,
        completedHikes: 0, bio: "",
      },
    };
  });
}

/**
 * POST /teams
 * 创建新队伍（需登录，需填写微信号）
 */
teams.post("/", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const db = createDb(c.env.DB);
    const userId = session.user.id;

    const userRecord = await db
      .select({ wechat: schema.users.wechat })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .then((rows) => rows[0]);

    if (!userRecord?.wechat) {
      return c.json({ error: "请先填写微信号才能创建队伍" }, 400);
    }

    const body = await c.req.json<{
      locationId?: string; routeId?: string; title?: string;
      description?: string; date?: string; time?: string;
      duration?: string; durationMin?: number; maxMembers?: number;
      requirements?: string[];
    }>();
    const { locationId, routeId, title, description, date, time, duration, durationMin, maxMembers, requirements } = body;

    if (!locationId || !title || !date || !time || !maxMembers) {
      return c.json({ error: "缺少必填字段" }, 400);
    }

    const startTime = new Date(`${date}T${time}`);
    if (isNaN(startTime.getTime())) {
      return c.json({ error: "无效的日期或时间格式" }, 400);
    }

    const durationMinutes = durationMin || (duration
      ? parseFloat(duration.replace(/[^0-9.]/g, "")) * 60 || 240
      : 240);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const memberId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const teamIcon = getRandomTeamIcon();

    await db.insert(schema.teams).values({
      id: teamId, locationId, routeId, leaderId: userId, title,
      description: description || null, startTime, endTime,
      durationMin: durationMinutes, maxMembers,
      requirements: requirements ? JSON.stringify(requirements) : null,
      icon: teamIcon, status: "recruiting", createdAt: now, updatedAt: now,
    });
    await db.insert(schema.teamMembers).values({
      id: memberId, teamId, userId, status: "approved",
      joinedAt: now, createdAt: now,
    });

    return c.json({ success: true, team: { id: teamId, locationId, routeId, leaderId: userId, title, description, startTime: startTime.toISOString(), endTime: endTime.toISOString(), durationMin: durationMinutes, maxMembers, currentMembers: 1, requirements, icon: teamIcon, status: "recruiting", createdAt: now.toISOString() } });
  } catch (error) {
    console.error("Create team error:", error);
    return c.json({ error: "创建队伍失败" }, 500);
  }
});

/**
 * GET /teams/:id
 * 获取单个队伍详情
 */
teams.get("/:id", async (c) => {
  try {
    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    await updateExpiredTeams(db, teamId);

    const teamWithRelations = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
      with: { leader: true, members: { with: { user: true } }, route: true, location: true },
    });

    if (!teamWithRelations) return c.json({ error: "队伍不存在" }, 404);

    // 获取当前登录用户（可选）
    let currentUserId: string | null = null;
    try {
      const authInstance = createAuth(c.env);
      const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
      currentUserId = session?.user?.id || null;
    } catch { /* 用户未登录 */ }

    const currentMembers = teamWithRelations.members?.filter(
      (m: { status: string }) => m.status === "approved"
    ).length || 0;

    const isTeamMember = currentUserId
      ? !!teamWithRelations.members?.find(
          (m: { userId: string; status: string }) =>
            m.userId === currentUserId && m.status === "approved"
        )
      : false;

    const startDate = new Date(teamWithRelations.startTime);
    const date = startDate.toISOString().split("T")[0];
    const time = startDate.toTimeString().slice(0, 5);
    const durationMinutes = teamWithRelations.durationMin ||
      Math.round((new Date(teamWithRelations.endTime).getTime() - startDate.getTime()) / 60000);
    const durationHours = Math.round(durationMinutes / 60);

    type MemberWithUser = {
      userId: string; status: string; joinedAt: Date | null;
      user: { id: string; name: string; nickname?: string | null; image: string | null;
               bio: string | null; level: string | null; wechat: string | null;
               gender: string | null; birthday: Date | number | null; extra: string | null };
    };

    const relevantMembers = teamWithRelations.members
      ?.filter((m: { status: string }) => m.status === "approved" || m.status === "leave_pending")
      .map((m: MemberWithUser) => ({
        id: m.user?.id || m.userId,
        userId: m.userId,
        name: m.user?.name || "未知用户",
        nickname: m.user?.nickname || null,
        avatar: m.user?.image || null,
        bio: m.user?.bio || null,
        level: m.user?.level || "beginner",
        status: m.status,
        joinedAt: m.joinedAt,
        wechat: isTeamMember ? (m.user?.wechat || undefined) : undefined,
        gender: m.user?.gender || null,
        birthday: m.user?.birthday || null,
        extra: m.user?.extra || null,
      })) || [];

    type LeaderUser = { id: string; name: string; nickname?: string | null; image: string | null;
                        bio: string | null; level: string | null; wechat: string | null;
                        gender: string | null; birthday: Date | number | null; extra: string | null };
    const leader = teamWithRelations.leader as LeaderUser;

    return c.json({
      success: true,
      team: {
        id: teamWithRelations.id, locationId: teamWithRelations.locationId,
        routeId: teamWithRelations.routeId, title: teamWithRelations.title,
        description: teamWithRelations.description || "", date, time,
        duration: `${durationHours}小时`, durationMin: durationMinutes,
        maxMembers: teamWithRelations.maxMembers, currentMembers,
        requirements: teamWithRelations.requirements ? JSON.parse(teamWithRelations.requirements) : [],
        status: teamWithRelations.status, createdAt: teamWithRelations.createdAt,
        route: teamWithRelations.route || undefined,
        location: teamWithRelations.location ? {
          id: teamWithRelations.location.id,
          name: teamWithRelations.location.name,
          coverImage: teamWithRelations.location.coverImage,
        } : undefined,
        leader: leader ? {
          id: leader.id, name: leader.name, nickname: leader.nickname || null,
          avatar: leader.image || "", level: leader.level || "beginner",
          completedHikes: 0, bio: leader.bio || "",
          wechat: (isTeamMember || currentUserId === leader.id) ? (leader.wechat || "") : undefined,
          gender: leader.gender || null, birthday: leader.birthday || null,
          extra: leader.extra || null,
        } : { id: "unknown", name: "未知用户", avatar: "", level: "beginner", completedHikes: 0, bio: "" },
        members: relevantMembers,
      },
    });
  } catch (error) {
    console.error("Get team error:", error);
    return c.json({ error: "获取队伍详情失败" }, 500);
  }
});

/**
 * PUT /teams/:id
 * 更新队伍信息（仅队长可操作）
 */
teams.put("/:id", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
      with: { location: true },
    });

    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id)
      return c.json({ success: false, error: "只有队长可以修改队伍" }, 403);

    const body = await c.req.json<{
      title?: string; description?: string; maxMembers?: number;
      requirements?: string[]; time?: string; durationMin?: number;
    }>();
    const { title, description, maxMembers, requirements, time, durationMin } = body;

    if (!title || !maxMembers) return c.json({ success: false, error: "缺少必填字段" }, 400);

    type UpdateData = {
      title: string; description: string | null; maxMembers: number;
      requirements: string | null; updatedAt: Date;
      durationMin?: number; startTime?: Date; endTime?: Date;
    };
    const updateData: UpdateData = {
      title, description: description || null, maxMembers,
      requirements: requirements ? JSON.stringify(requirements) : null,
      updatedAt: new Date(),
    };

    if (time || durationMin) {
      const originalStartTime = new Date(team.startTime);
      const currentDurationMin = durationMin || team.durationMin || 240;
      let newStartTime = originalStartTime;
      if (time) {
        const [hours, minutes] = time.split(":").map(Number);
        newStartTime = new Date(originalStartTime);
        newStartTime.setHours(hours, minutes, 0, 0);
        updateData.startTime = newStartTime;
      }
      updateData.endTime = new Date(newStartTime.getTime() + currentDurationMin * 60000);
      if (durationMin) updateData.durationMin = durationMin;
    }

    await db.update(schema.teams).set(updateData).where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "队伍信息已更新" });
  } catch (error) {
    console.error("Update team error:", error);
    return c.json({ success: false, error: "更新队伍失败" }, 500);
  }
});

/**
 * POST /teams/:id/join
 * 申请加入队伍
 */
teams.post("/:id/join", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const userId = session.user.id;
    const db = createDb(c.env.DB);

    const userRecord = await db
      .select({ wechat: schema.users.wechat })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .then((rows) => rows[0]);

    if (!userRecord?.wechat) return c.json({ error: "请先填写微信号才能加入队伍" }, 400);

    const teamId = c.req.param("id");
    if (!teamId) return c.json({ error: "缺少队伍ID" }, 400);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ error: "队伍不存在" }, 404);
    if (team.status !== "recruiting") return c.json({ error: "该队伍当前不接受新成员" }, 400);

    const [{ approvedCount }] = await db
      .select({ approvedCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    if (approvedCount >= team.maxMembers) return c.json({ error: "队伍已满" }, 400);

    const existingMembers = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)),
      limit: 1,
    });
    const existing = existingMembers[0];

    if (existing) {
      if (existing.status === "approved") return c.json({ error: "你已经是该队伍的成员" }, 400);
      if (existing.status === "pending") return c.json({ error: "你已经提交了申请，请等待审核" }, 400);
      if (existing.status === "rejected") {
        await db.update(schema.teamMembers)
          .set({ status: "pending", createdAt: new Date() })
          .where(eq(schema.teamMembers.id, existing.id));
        return c.json({ success: true, message: "重新申请已提交" });
      }
    }

    const memberId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(schema.teamMembers).values({
      id: memberId, teamId, userId, status: "pending", createdAt: new Date(),
    });

    return c.json({ success: true, message: "申请已提交，等待队长审核" });
  } catch (error) {
    console.error("Join team error:", error);
    return c.json({ error: "申请加入失败" }, 500);
  }
});

/**
 * GET /teams/:id/applications
 * 获取待审核申请列表（仅队长）
 */
teams.get("/:id/applications", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id)
      return c.json({ error: "只有队长可以查看申请列表" }, 403);

    const applications = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "pending")),
      with: { user: { columns: { id: true, name: true, nickname: true, image: true, bio: true, level: true } } },
      orderBy: [desc(schema.teamMembers.createdAt)],
    });

    return c.json({
      success: true,
      applications: applications.map((app) => ({
        id: app.id, userId: app.userId, createdAt: app.createdAt,
        user: app.user ? { id: app.user.id, name: app.user.name, nickname: app.user.nickname || null, avatar: app.user.image || null, bio: app.user.bio || null, level: app.user.level || "beginner" } : null,
      })),
    });
  } catch (error) {
    console.error("Get applications error:", error);
    return c.json({ error: "获取申请列表失败" }, 500);
  }
});

/**
 * POST /teams/:id/members/:userId/approve
 * 批准成员申请（仅队长）
 */
teams.post("/:id/members/:userId/approve", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId), with: { location: true },
    });
    if (!team) return c.json({ error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id) return c.json({ error: "只有队长可以审核成员" }, 403);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "pending")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json({ error: "未找到该成员的申请" }, 404);

    const [{ approvedCount }] = await db
      .select({ approvedCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    if (approvedCount >= team.maxMembers) return c.json({ error: "队伍已满，无法批准新成员" }, 400);

    const now = new Date();
    const newCount = approvedCount + 1;
    const newStatus = newCount >= team.maxMembers ? "full" : "recruiting";

    await db.update(schema.teamMembers)
      .set({ status: "approved", joinedAt: now, statusUpdatedAt: now })
      .where(eq(schema.teamMembers.id, membership.id));
    await db.update(schema.teams)
      .set({ status: newStatus, updatedAt: now })
      .where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "已通过申请" });
  } catch (error) {
    console.error("Approve member error:", error);
    return c.json({ error: "批准申请失败" }, 500);
  }
});

/**
 * POST /teams/:id/members/:userId/reject
 * 拒绝成员申请（仅队长）
 */
teams.post("/:id/members/:userId/reject", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id) return c.json({ error: "只有队长可以审核成员" }, 403);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "pending")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json({ error: "未找到该成员的申请" }, 404);

    await db.update(schema.teamMembers)
      .set({ status: "rejected" })
      .where(eq(schema.teamMembers.id, membership.id));

    return c.json({ success: true, message: "已拒绝申请" });
  } catch (error) {
    console.error("Reject member error:", error);
    return c.json({ error: "拒绝申请失败" }, 500);
  }
});

/**
 * POST /teams/:id/leave
 * 成员退出队伍
 */
teams.post("/:id/leave", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId), with: { location: true },
    });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, session.user.id), eq(schema.teamMembers.status, "approved")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json({ success: false, error: "你不是该队伍成员" }, 400);
    if (membership.userId === team.leaderId) return c.json({ success: false, error: "队长不能退出队伍" }, 400);
    if (team.status === "formed") return c.json({ success: false, error: "队伍已组建，请通过退出申请流程离开" }, 400);

    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, membership.id));

    const [{ remainingCount }] = await db
      .select({ remainingCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    await db.update(schema.teams)
      .set({ status: remainingCount < team.maxMembers ? "recruiting" : team.status, updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "已成功退出队伍" });
  } catch (error) {
    console.error("Leave team error:", error);
    return c.json({ success: false, error: "退出队伍失败" }, 500);
  }
});

/**
 * POST /teams/:id/cancel-application
 * 取消入队申请
 */
teams.post("/:id/cancel-application", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, session.user.id), eq(schema.teamMembers.status, "pending")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json({ error: "未找到待审核的申请" }, 404);

    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, membership.id));

    return c.json({ success: true, message: "申请已取消" });
  } catch (error) {
    console.error("Cancel application error:", error);
    return c.json({ error: "取消申请失败" }, 500);
  }
});

/**
 * POST /teams/:id/members/:userId/remove
 * 移除成员（仅队长）
 */
teams.post("/:id/members/:userId/remove", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id) return c.json({ success: false, error: "只有队长可以移除成员" }, 403);
    if (targetUserId === session.user.id) return c.json({ success: false, error: "不能移除自己" }, 400);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "approved")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json({ success: false, error: "该用户不是队伍成员" }, 404);

    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, membership.id));

    const [{ remainingCount }] = await db
      .select({ remainingCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    await db.update(schema.teams)
      .set({ status: remainingCount < team.maxMembers ? "recruiting" : team.status, updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "已移除成员" });
  } catch (error) {
    console.error("Remove member error:", error);
    return c.json({ success: false, error: "移除成员失败" }, 500);
  }
});

/**
 * POST /teams/:id/leave-request
 * 申请退出已组建的队伍
 */
teams.post("/:id/leave-request", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.status !== "formed") return c.json({ success: false, error: "只有已组建的队伍需要申请退出" }, 400);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, session.user.id), eq(schema.teamMembers.status, "approved")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json({ success: false, error: "你不是该队伍成员" }, 400);
    if (membership.userId === team.leaderId) return c.json({ success: false, error: "队长不能退出队伍" }, 400);

    const leaveRequests = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, session.user.id), eq(schema.teamMembers.status, "leave_pending")),
      limit: 1,
    });
    if (leaveRequests.length > 0) return c.json({ success: false, error: "您已提交退出申请，请等待队长审批" }, 400);

    await db.update(schema.teamMembers)
      .set({ status: "leave_pending" })
      .where(eq(schema.teamMembers.id, membership.id));

    return c.json({ success: true, message: "退出申请已提交，等待队长审批" });
  } catch (error) {
    console.error("Request leave error:", error);
    return c.json({ success: false, error: "提交退出申请失败" }, 500);
  }
});

/**
 * POST /teams/:id/members/:userId/approve-leave
 * 批准退出申请（仅队长）
 */
teams.post("/:id/members/:userId/approve-leave", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id) return c.json({ success: false, error: "只有队长可以批准退出申请" }, 403);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "leave_pending")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json({ success: false, error: "未找到该成员的退出申请" }, 404);

    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, membership.id));

    const [{ remainingCount }] = await db
      .select({ remainingCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    await db.update(schema.teams)
      .set({ status: remainingCount < team.maxMembers ? "recruiting" : team.status, updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "已批准退出申请" });
  } catch (error) {
    console.error("Approve leave error:", error);
    return c.json({ success: false, error: "批准退出申请失败" }, 500);
  }
});

/**
 * POST /teams/:id/members/:userId/reject-leave
 * 拒绝退出申请（仅队长）
 */
teams.post("/:id/members/:userId/reject-leave", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id) return c.json({ success: false, error: "只有队长可以拒绝退出申请" }, 403);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, targetUserId), eq(schema.teamMembers.status, "leave_pending")),
      limit: 1,
    });
    const membership = members[0];
    if (!membership) return c.json({ success: false, error: "未找到该成员的退出申请" }, 404);

    await db.update(schema.teamMembers)
      .set({ status: "approved" })
      .where(eq(schema.teamMembers.id, membership.id));

    return c.json({ success: true, message: "已拒绝退出申请" });
  } catch (error) {
    console.error("Reject leave error:", error);
    return c.json({ success: false, error: "拒绝退出申请失败" }, 500);
  }
});

/**
 * GET /teams/:id/my-status
 * 获取当前用户在队伍中的成员状态
 */
teams.get("/:id/my-status", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: true, status: null });

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const members = await db.query.teamMembers.findMany({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, session.user.id)),
      limit: 1,
    });
    const membership = members[0];

    return c.json({ success: true, status: membership ? membership.status : null });
  } catch (error) {
    console.error("Get my status error:", error);
    return c.json({ error: "获取状态失败" }, 500);
  }
});

/**
 * POST /teams/:id/form
 * 组建队伍（仅队长）
 */
teams.post("/:id/form", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const body = await c.req.json<{ isUnderfilled?: boolean }>().catch(() => ({} as { isUnderfilled?: boolean }));
    const isUnderfilled = body.isUnderfilled === true;

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id) return c.json({ success: false, error: "只有队长可以组建队伍" }, 403);
    if (team.status !== "recruiting" && team.status !== "full")
      return c.json({ success: false, error: "当前队伍状态无法组建" }, 400);

    const [{ approvedCount }] = await db
      .select({ approvedCount: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    if (approvedCount < 1) return c.json({ success: false, error: "队伍至少需要1人才能组建" }, 400);

    await db.update(schema.teams)
      .set({ status: "formed", updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "队伍已组建", isUnderfilled });
  } catch (error) {
    console.error("Form team error:", error);
    return c.json({ success: false, error: "组建队伍失败" }, 500);
  }
});

/**
 * POST /teams/:id/cancel
 * 取消队伍（仅队长，仅 recruiting/full 状态）
 */
teams.post("/:id/cancel", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id)
      return c.json({ success: false, error: "只有队长可以取消队伍" }, 403);
    if (team.status !== "recruiting" && team.status !== "full")
      return c.json({ success: false, error: "当前队伍状态无法取消" }, 400);

    await db.update(schema.teams)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "队伍已取消" });
  } catch (error) {
    console.error("Cancel team error:", error);
    return c.json({ success: false, error: "取消队伍失败" }, 500);
  }
});

/**
 * DELETE /teams/:id
 * 删除队伍（仅队长可操作，物理删除）
 */
teams.delete("/:id", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "请先登录" }, 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json({ success: false, error: "队伍不存在" }, 404);
    if (team.leaderId !== session.user.id)
      return c.json({ success: false, error: "只有队长可以删除队伍" }, 403);
    if (team.status === "formed" || team.status === "completed")
      return c.json({ success: false, error: "已组建或已完成的队伍无法删除" }, 400);

    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.teamId, teamId));
    await db.delete(schema.teams).where(eq(schema.teams.id, teamId));

    return c.json({ success: true, message: "队伍已删除" });
  } catch (error) {
    console.error("Delete team error:", error);
    return c.json({ success: false, error: "删除队伍失败" }, 500);
  }
});

export { teams as teamsRoute };
