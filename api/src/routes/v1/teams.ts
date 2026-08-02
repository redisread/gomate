import { Hono } from "hono";
import { desc, eq, and, sql, inArray } from "drizzle-orm";
import { createAuth } from "../../lib/auth";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";

const teams = new Hono<{ Bindings: Env }>();

/**
 * GET /v1/teams
 * 公开读端点：队伍列表，支持分页、cityId/tagId/status/keyword 过滤。
 * API key 或 session 可选传入（用于个性化，不影响公开数据返回）。
 */
teams.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const auth = createAuth(c.env);

    // Resolve actor (API key or session) — list is public, actor available for personalization
    await auth.api
      .getSession({ headers: c.req.raw.headers })
      .catch(() => null);

    // Query params
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, parseInt(c.req.query("pageSize") || "12", 10));
    const cityId = c.req.query("cityId") || "";
    const tagId = c.req.query("tagId") || "";
    const status = c.req.query("status") || "";
    const keyword = c.req.query("keyword") || "";
    const offset = (page - 1) * pageSize;

    // CTE: current member count per team
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

    const teamColumns = {
      id: schema.teams.id,
      locationId: schema.teams.locationId,
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
      currentMembers: sql<number>`coalesce(${teamMemberCounts.count}, 0)`.as("currentMembers"),
      leaderImage: schema.users.image,
      leaderName: schema.users.name,
      leaderNickname: schema.users.nickname,
      leaderLevel: schema.users.level,
      locationName: schema.locations.name,
      locationCoverImage: schema.locations.coverImage,
      locationDifficulty: schema.locations.difficulty,
    };

    type TeamRow = {
      id: string; locationId: string; leaderId: string;
      title: string; description: string | null; startTime: Date; endTime: Date;
      durationMin: number | null; maxMembers: number; requirements: string | null;
      icon: string; status: string; createdAt: Date; updatedAt: Date;
      currentMembers: number; leaderImage: string | null; leaderName: string;
      leaderNickname: string | null; leaderLevel: string | null;
      locationName: string | null; locationCoverImage: string | null;
      locationDifficulty: string | null;
    };

    // Build WHERE conditions
    const conditions: ReturnType<typeof eq>[] = [];

    if (status) {
      const statuses = status.split(",").filter(Boolean) as schema.TeamStatus[];
      if (statuses.length === 1) {
        conditions.push(eq(schema.teams.status, statuses[0]));
      } else if (statuses.length > 1) {
        conditions.push(inArray(schema.teams.status, statuses));
      }
    }

    if (cityId) {
      conditions.push(eq(schema.locations.cityId, cityId));
    }

    if (keyword) {
      conditions.push(
        sql`(${schema.teams.title} LIKE ${"%" + keyword + "%"} OR ${schema.teams.description} LIKE ${"%" + keyword + "%"})`
      );
    }

    // Tag filter: find teams with this tag
    let taggedTeamIds: string[] | null = null;
    if (tagId) {
      const tagResults = await db
        .select({ entityId: schema.entityToTags.entityId })
        .from(schema.entityToTags)
        .where(
          and(
            eq(schema.entityToTags.entityType, "activity"),
            eq(schema.entityToTags.tagId, tagId)
          )
        );
      taggedTeamIds = tagResults.map((r) => r.entityId);
      if (taggedTeamIds.length === 0) {
        return c.json({ success: true, teams: [], pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false } });
      }
      conditions.push(inArray(schema.teams.id, taggedTeamIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const [{ cnt }] = await db
      .with(teamMemberCounts)
      .select({ cnt: sql<number>`count(distinct ${schema.teams.id})` })
      .from(schema.teams)
      .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
      .where(whereClause);
    const total = cnt;
    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    // Fetch rows
    const rows = await db
      .with(teamMemberCounts)
      .select(teamColumns)
      .from(schema.teams)
      .innerJoin(schema.users, eq(schema.users.id, schema.teams.leaderId))
      .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
      .leftJoin(teamMemberCounts, eq(teamMemberCounts.teamId, schema.teams.id))
      .where(whereClause)
      .orderBy(desc(schema.teams.createdAt))
      .limit(pageSize)
      .offset(offset) as TeamRow[];

    const teams = rows.map((row) => ({
      id: row.id,
      locationId: row.locationId,
      leaderId: row.leaderId,
      title: row.title,
      description: row.description,
      startTime: row.startTime,
      endTime: row.endTime,
      durationMin: row.durationMin,
      maxMembers: row.maxMembers,
      requirements: row.requirements,
      icon: row.icon,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      currentMembers: row.currentMembers,
      leader: {
        id: row.leaderId,
        name: row.leaderName,
        nickname: row.leaderNickname,
        level: row.leaderLevel,
        image: row.leaderImage,
      },
      location: row.locationId ? {
        id: row.locationId,
        name: row.locationName,
        coverImage: row.locationCoverImage,
        difficulty: row.locationDifficulty,
      } : null,
    }));

    return c.json({ success: true, teams, pagination: { page, pageSize, total, totalPages, hasMore } });
  } catch (error) {
    console.error("[v1/teams] list error:", error);
    return c.json(APIErrors.internalError("获取队伍列表失败"), 500);
  }
});

/**
 * GET /v1/teams/:id
 * 公开读端点：队伍详情。
 */
teams.get("/:id", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const auth = createAuth(c.env);
    const teamId: string = c.req.param("id") ?? "";

    const session = await auth.api
      .getSession({ headers: c.req.raw.headers })
      .catch(() => null);
    const actorId = session?.user?.id ?? null;

    // Fetch team
    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
    });
    if (!team) return c.json(APIErrors.notFound("队伍不存在"), 404);

    // Fetch location
    const location = team.locationId
      ? await db.query.locations.findFirst({ where: eq(schema.locations.id, team.locationId) })
      : null;

    // Fetch leader
    const leader = await db.query.users.findFirst({
      where: eq(schema.users.id, team.leaderId),
      columns: { id: true, name: true, nickname: true, level: true, image: true },
    });

    // Member count
    const [{ count: memberCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.status, "approved")));

    // My status (if authenticated)
    let myStatus: string = "none";
    if (actorId) {
      const membership = await db.query.teamMembers.findFirst({
        where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, actorId)),
      });
      if (membership) {
        myStatus = membership.status;
      }
    }

    return c.json({
      success: true,
      team: {
        ...team,
        location: location ? {
          id: location.id,
          name: location.name,
          coverImage: location.coverImage,
          difficulty: location.difficulty,
          cityId: location.cityId,
        } : null,
        leader: leader ?? null,
        currentMembers: memberCount,
        myStatus,
      },
    });
  } catch (error) {
    console.error("[v1/teams/:id] error:", error);
    return c.json(APIErrors.internalError("获取队伍详情失败"), 500);
  }
});

/**
 * GET /v1/teams/:id/my-status
 * 需要认证：获取当前用户在本队伍的身份状态。
 * 返回 { status: "none"|"pending"|"approved"|"rejected"|"member", pollAfterSeconds?: number }
 * pollAfterSeconds=300（5分钟）当 status=pending 时有效。
 */
teams.get("/:id/my-status", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const auth = createAuth(c.env);
    const teamId: string = c.req.param("id") ?? "";

    const session = await auth.api
      .getSession({ headers: c.req.raw.headers })
      .catch(() => null);
    const actorId = session?.user?.id;

    if (!actorId) {
      return c.json({ status: "none" });
    }

    const membership = await db.query.teamMembers.findFirst({
      where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, actorId)),
    });

    if (!membership) {
      return c.json({ status: "none" });
    }

    // Map internal status to API status
    const statusMap: Record<string, string> = {
      approved: "member",
      leave_pending: "member",
    };
    const apiStatus = statusMap[membership.status] ?? membership.status;

    const response: { status: string; pollAfterSeconds?: number } = { status: apiStatus };
    if (membership.status === "pending") {
      response.pollAfterSeconds = 300;
    }

    return c.json(response);
  } catch (error) {
    console.error("[v1/teams/:id/my-status] error:", error);
    return c.json(APIErrors.internalError("获取状态失败"), 500);
  }
});

export { teams as teamsRoute };
