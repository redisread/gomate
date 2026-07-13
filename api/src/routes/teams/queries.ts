import { Hono } from "hono";
import { logger } from "../../lib/logger";
import { eq, desc, and, ne, sql, like, inArray, gte, lte } from "drizzle-orm";
import { createAuth } from "../../lib/auth";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { getTimeFilterRange, parseRequirements, getRouteTags } from "./utils";
import { formatBeijingDateTime } from "../../lib/date-utils";
import { getCachedOrFetch, buildListCacheKey, setPublicCacheHeaders } from "../../lib/cache";
import { updateExpiredTeams } from "../../lib/team-status";
import { APIErrors } from "../../lib/api-errors";

const queries = new Hono<{ Bindings: Env }>();

/**
 * GET /teams
 * 获取队伍列表，支持分页、搜索、status/difficulty 过滤
 * 也支持 locationId / userId+includeJoined / activeOnly 特殊模式
 */
queries.get("/", async (c) => {
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

    // 日期范围筛选参数
    const startDateFrom = c.req.query("startDateFrom"); // ISO 日期格式 YYYY-MM-DD
    const startDateTo = c.req.query("startDateTo");     // ISO 日期格式 YYYY-MM-DD

    // 时间快捷筛选参数（today/tomorrow/weekend/7days）
    const timeFilter = c.req.query("timeFilter");

    // 标签筛选参数
    const tagIdsParam = c.req.query("tagIds") || "";

    // CTE: 预先计算每个队伍的当前成员数（approved + leave_pending），避免相关子查询 N+1
    const teamMemberCounts = db.$with("team_member_counts").as(
      db
        .select({
          teamId: schema.teamMembers.teamId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(schema.teamMembers)
        .where(inArray(schema.teamMembers.status, ["approved", "leave_pending"]))
        .groupBy(schema.teamMembers.teamId)
    );

    const currentMembersColumn = sql<number>`COALESCE(${teamMemberCounts.count}, 0)`.as("currentMembers");

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
      currentMembers: currentMembersColumn,
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
        .with(teamMemberCounts)
        .select(teamColumns)
        .from(schema.teams)
        .innerJoin(schema.teamMembers, eq(schema.teamMembers.teamId, schema.teams.id))
        .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
        .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
        .leftJoin(teamMemberCounts, eq(teamMemberCounts.teamId, schema.teams.id))
        .where(and(...conditions))
        .orderBy(desc(schema.teams.createdAt)) as TeamRow[];
      return c.json({
        success: true,
        teams: formatTeams(result),
        pagination: { page: 1, pageSize: result.length, total: result.length, totalPages: 1, hasMore: false }
      });
    }

    // 特殊模式：某地点的队伍（公共数据，使用缓存）
    if (locationId) {
      const cacheKey = buildListCacheKey("teams", { locationId, status: statusParam });
      const body = await getCachedOrFetch(cacheKey, async () => {
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

        const rows = await db
          .with(teamMemberCounts)
          .select(teamColumns)
          .from(schema.teams)
          .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
          .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
          .leftJoin(teamMemberCounts, eq(teamMemberCounts.teamId, schema.teams.id))
          .where(and(...conditions))
          .orderBy(desc(schema.teams.createdAt)) as TeamRow[];
        return {
          success: true,
          teams: formatTeams(rows),
          pagination: { page: 1, pageSize: rows.length, total: rows.length, totalPages: 1, hasMore: false }
        };
      });
      setPublicCacheHeaders(c);
      return c.json(body);
    }

    // 通用列表模式：支持搜索、status、difficulty、日期范围、标签、分页（公共数据，使用缓存）
    const cacheKey = buildListCacheKey("teams", {
      page: String(page),
      pageSize: String(pageSize),
      search,
      status: statusParam,
      difficulty: difficultyParam,
      startDateFrom,
      startDateTo,
      timeFilter,
      tagIds: tagIdsParam,
    });
    const body = await getCachedOrFetch(cacheKey, async () => {
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

      // 日期范围筛选（支持 timeFilter 快捷参数或 startDateFrom/To 自定义范围）
      let effectiveStartDate = startDateFrom;
      let effectiveEndDate = startDateTo;

      // 如果提供了 timeFilter，计算对应的日期范围
      if (timeFilter && !effectiveStartDate && !effectiveEndDate) {
        const range = getTimeFilterRange(timeFilter);
        if (range) {
          effectiveStartDate = range.start;
          effectiveEndDate = range.end;
        }
      }

      if (effectiveStartDate) {
        const fromDate = new Date(effectiveStartDate);
        fromDate.setHours(0, 0, 0, 0);
        conditions.push(gte(schema.teams.startTime, fromDate));
      }
      if (effectiveEndDate) {
        const toDate = new Date(effectiveEndDate);
        toDate.setHours(23, 59, 59, 999);
        conditions.push(lte(schema.teams.startTime, toDate));
      }

      // difficulty 过滤需要 join routes 表
      const difficultyList = difficultyParam ? difficultyParam.split(",").filter(Boolean) : [];

      // 标签筛选
      const tagIds = tagIdsParam ? tagIdsParam.split(",").filter(Boolean) : [];

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // 如果有标签筛选，先查出符合条件的 teamIds
      let filteredTeamIds: string[] | null = null;
      if (tagIds.length > 0) {
        const tagResults = await db
          .select({ entityId: schema.entityToTags.entityId })
          .from(schema.entityToTags)
          .where(
            and(
              eq(schema.entityToTags.entityType, "activity"),
              inArray(schema.entityToTags.tagId, tagIds)
            )
          );
        filteredTeamIds = tagResults.map(r => r.entityId);
        if (filteredTeamIds.length === 0) {
          // 没有符合条件的队伍，直接返回空结果
          return {
            success: true,
            teams: [],
            pagination: { page, pageSize, total: 0, totalPages: 0 },
          };
        }
      }

      // 构建最终 where 条件
      const finalWhereClause = (() => {
        const allConditions = [];
        if (whereClause) allConditions.push(whereClause);
        if (difficultyList.length > 0) {
          allConditions.push(inArray(schema.routes.difficulty, difficultyList));
        }
        if (filteredTeamIds) {
          allConditions.push(inArray(schema.teams.id, filteredTeamIds));
        }
        return allConditions.length > 0 ? and(...allConditions) : undefined;
      })();

      // 统计总数
      const [{ cnt }] = await db
        .select({ cnt: sql<number>`count(distinct ${schema.teams.id})` })
        .from(schema.teams)
        .leftJoin(schema.routes, eq(schema.routes.id, schema.teams.routeId))
        .where(finalWhereClause);
      const total = cnt;

      const totalPages = Math.ceil(total / pageSize);
      const hasMore = page < totalPages;
      const offset = (page - 1) * pageSize;

      // 查询列表
      const rows = await db
        .with(teamMemberCounts)
        .select(teamColumns)
        .from(schema.teams)
        .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
        .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
        .leftJoin(schema.routes, eq(schema.routes.id, schema.teams.routeId))
        .leftJoin(teamMemberCounts, eq(teamMemberCounts.teamId, schema.teams.id))
        .where(finalWhereClause)
        .orderBy(desc(schema.teams.startTime))
        .limit(pageSize)
        .offset(offset) as TeamRow[];

      return {
        success: true,
        teams: formatTeams(rows),
        pagination: { page, pageSize, total, totalPages, hasMore },
      };
    });
    setPublicCacheHeaders(c);
    return c.json(body);
  } catch (error) {
    logger.error("Get teams error:", error);
    return c.json(APIErrors.internalError("获取队伍列表失败"), 500);
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
    const { date, time } = formatBeijingDateTime(startDate);
    const durationHours = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    );
    const requirements = parseRequirements(row.requirements);
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
 * GET /teams/:id
 * 获取单个队伍详情
 */
queries.get("/:id", async (c) => {
  try {
    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    await updateExpiredTeams(db, teamId);

    const teamWithRelations = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
      with: { leader: true, members: { with: { user: true } }, route: true, location: true },
    });

    if (!teamWithRelations) return c.json(APIErrors.notFound("队伍不存在"), 404);

    let routeTags: { id: string; name: string; type: string }[] = [];
    if (teamWithRelations.routeId) {
      routeTags = await getRouteTags(db, teamWithRelations.routeId);
    }

    // 获取当前登录用户（可选）
    let currentUserId: string | null = null;
    try {
      const authInstance = createAuth(c.env);
      const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
      currentUserId = session?.user?.id || null;
    } catch { /* 用户未登录 */ }

    // 计算已加入人数：approved + leave_pending 成员
    // 如果队长不在 members 数组中，需要 +1
    const leaderInMembers = teamWithRelations.members?.some(
      (m: { userId: string }) => m.userId === teamWithRelations.leaderId
    );
    const currentMembers = (teamWithRelations.members?.filter(
      (m: { status: string }) => m.status === "approved" || m.status === "leave_pending"
    ).length || 0) + (leaderInMembers ? 0 : 1);

    const isTeamMember = currentUserId
      ? !!teamWithRelations.members?.find(
          (m: { userId: string; status: string }) =>
            m.userId === currentUserId && m.status === "approved"
        )
      : false;

    const startDate = new Date(teamWithRelations.startTime);
    const { date, time } = formatBeijingDateTime(startDate);
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
        requirements: parseRequirements(teamWithRelations.requirements),
        status: teamWithRelations.status, createdAt: teamWithRelations.createdAt,
        route: teamWithRelations.route
          ? {
              id: teamWithRelations.route.id,
              name: teamWithRelations.route.name,
              difficulty: teamWithRelations.route.difficulty,
              durationMin: teamWithRelations.route.durationMin,
              durationMax: teamWithRelations.route.durationMax,
              distance: teamWithRelations.route.distance,
              elevation: teamWithRelations.route.elevation,
              tags: routeTags,
            }
          : undefined,
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
    logger.error("Get team error:", error);
    return c.json(APIErrors.internalError("获取队伍详情失败"), 500);
  }
});

/**
 * GET /teams/:id/applications
 * 获取待审核申请列表（仅队长）
 */
queries.get("/:id/applications", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const teamId = c.req.param("id");
    const db = createDb(c.env.DB);

    const team = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);
    if (team.leaderId !== session.user.id)
      return c.json(APIErrors.forbidden("只有队长可以查看申请列表"), 403);

    // 支持 status 查询参数过滤；不传则返回全部成员（管理页面需要）
    const statusFilter = c.req.query("status");
    const whereClause = statusFilter
      ? and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, statusFilter))
      : eq(schema.teamMembers.teamId, teamId);

    const applications = await db.query.teamMembers.findMany({
      where: whereClause,
      with: { user: { columns: { id: true, name: true, nickname: true, image: true, bio: true, level: true, wechat: true } } },
      orderBy: [desc(schema.teamMembers.createdAt)],
    });

    return c.json({
      success: true,
      applications: applications.map((app) => ({
        id: app.id, userId: app.userId, status: app.status, createdAt: app.createdAt,
        userName: app.user ? (app.user.nickname || app.user.name) : "",
        wechat: app.user?.wechat || null,
        user: app.user ? { id: app.user.id, name: app.user.name, nickname: app.user.nickname || null, avatar: app.user.image || null, bio: app.user.bio || null, level: app.user.level || "beginner" } : null,
      })),
    });
  } catch (error) {
    logger.error("Get applications error:", error);
    return c.json(APIErrors.internalError("获取申请列表失败"), 500);
  }
});

/**
 * GET /teams/:id/my-status
 * 获取当前用户在队伍中的成员状态
 */
queries.get("/:id/my-status", async (c) => {
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
    logger.error("Get my status error:", error);
    return c.json(APIErrors.internalError("获取状态失败"), 500);
  }
});

export default queries;
