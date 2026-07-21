import * as schema from "../../db/schema";
import { and, eq, ne, gt, inArray } from "drizzle-orm";
import type { createDb } from "../../db";
import { formatBeijingDateTime } from "../../lib/date-utils";

type Db = ReturnType<typeof createDb>;

// Re-export for backward compatibility
export { formatBeijingDateTime };

/** 返回安全的用户对象（时间戳格式） */
export function sanitizeUser(user: typeof schema.users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    avatar: user.image,
    bio: user.bio,
    gender: user.gender,
    birthday: user.birthday,
    level: user.level || "beginner",
    completedHikes: user.completedHikes ?? 0,
    wechat: user.wechat,
    // #181: city = cityId（非城市名）；前端 profile 回填城市选择器 + 首页 use-local-circle 默认 cityId
    city: user.city,
    extra: user.extra,
    role: user.role || "user",
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** 校验 UserExtra 字段格式 */
export function validateUserExtra(extra: unknown): extra is { equipment?: string[]; experience?: string } {
  if (typeof extra !== "object" || extra === null) return false;
  const e = extra as Record<string, unknown>;
  if (e.equipment !== undefined && !Array.isArray(e.equipment)) return false;
  if (e.experience !== undefined && typeof e.experience !== "string") return false;
  return true;
}

/** 统计用户创建/参加/完成的队伍数 */
export async function getUserStats(db: Db, id: string) {
  const createdTeamsCount = await db
    .select({ count: schema.teams.id })
    .from(schema.teams)
    .where(eq(schema.teams.leaderId, id));

  const joinedTeamsCount = await db
    .select({ count: schema.teamMembers.id })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
    .where(
      and(
        eq(schema.teamMembers.userId, id),
        eq(schema.teamMembers.status, "approved"),
        ne(schema.teams.leaderId, id)
      )
    );

  const completedAsLeaderCount = await db
    .select({ count: schema.teams.id })
    .from(schema.teams)
    .where(and(eq(schema.teams.leaderId, id), eq(schema.teams.status, "completed")));

  const completedAsMemberCount = await db
    .select({ count: schema.teamMembers.id })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
    .where(
      and(
        eq(schema.teamMembers.userId, id),
        eq(schema.teamMembers.status, "approved"),
        eq(schema.teams.status, "completed"),
        ne(schema.teams.leaderId, id)
      )
    );

  return {
    createdTeams: createdTeamsCount.length,
    joinedTeams: joinedTeamsCount.length,
    completedTeams: completedAsLeaderCount.length + completedAsMemberCount.length,
  };
}

/** 查询用户正在进行中的队伍（作为队长或已批准成员），最多 8 条 */
export async function getUserOngoingTeams(db: Db, id: string) {
  const now = new Date();
  const activeStatuses = ["recruiting", "full", "formed"] as schema.TeamStatus[];
  const { sql } = await import("drizzle-orm");

  // CTE: 预先计算每个队伍的 approved 成员数，避免相关子查询 N+1
  const teamMemberCounts = db.$with("team_member_counts").as(
    db
      .select({
        teamId: schema.teamMembers.teamId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.status, "approved"))
      .groupBy(schema.teamMembers.teamId)
  );

  const currentMembersColumn = sql<number>`COALESCE(${teamMemberCounts.count}, 0)`.as("currentMembers");

  const ongoingSelect = {
    id: schema.teams.id, title: schema.teams.title, startTime: schema.teams.startTime,
    endTime: schema.teams.endTime, maxMembers: schema.teams.maxMembers, status: schema.teams.status,
    locationName: schema.locations.name, locationCoverImage: schema.locations.coverImage,
    currentMembers: currentMembersColumn,
  };

  const createdOngoingTeams = await db
    .with(teamMemberCounts)
    .select(ongoingSelect)
    .from(schema.teams)
    .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
    .leftJoin(teamMemberCounts, eq(teamMemberCounts.teamId, schema.teams.id))
    .where(and(eq(schema.teams.leaderId, id), inArray(schema.teams.status, activeStatuses), gt(schema.teams.endTime, now)))
    .limit(5);

  const joinedOngoingTeams = await db
    .with(teamMemberCounts)
    .select(ongoingSelect)
    .from(schema.teams)
    .innerJoin(schema.teamMembers, eq(schema.teamMembers.teamId, schema.teams.id))
    .leftJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
    .leftJoin(teamMemberCounts, eq(teamMemberCounts.teamId, schema.teams.id))
    .where(
      and(
        eq(schema.teamMembers.userId, id),
        eq(schema.teamMembers.status, "approved"),
        ne(schema.teams.leaderId, id),
        inArray(schema.teams.status, activeStatuses),
        gt(schema.teams.endTime, now)
      )
    )
    .limit(5);

  const allOngoingTeams = [...createdOngoingTeams, ...joinedOngoingTeams]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 8);

  return allOngoingTeams.map((row) => {
    const startDate = new Date(row.startTime);
    const { date, time } = formatBeijingDateTime(startDate);
    return {
      id: row.id,
      title: row.title,
      date,
      time,
      status: row.status,
      currentMembers: row.currentMembers ?? 0,
      maxMembers: row.maxMembers,
      location: row.locationName ? {
        name: row.locationName,
        coverImage: row.locationCoverImage || "",
      } : null,
    };
  });
}
