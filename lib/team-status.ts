import { eq, and, lt, or, inArray } from "drizzle-orm";
import { teams } from "@/db/schema";

// 24小时的毫秒数
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 检查并更新已过期的队伍状态
 * - recruiting + 过期 -> cancelled
 * - formed + 过期 -> completed
 * 过期条件：创建时间超过1天 且 结束时间已过
 * @param db Drizzle ORM 实例
 * @param teamId 可选，指定队伍ID（单条检查）；不传则检查所有队伍
 * @returns 被更新的队伍ID列表
 */
export async function updateExpiredTeams(
  db: D1Database,
  teamId?: string
): Promise<string[]> {
  const { drizzle } = await import("drizzle-orm/d1");
  const schema = await import("@/db/schema");
  const ormDb = drizzle(db, { schema });
  const { eq, and, lt, or, inArray } = await import("drizzle-orm");

  const now = new Date();
  const updatedIds: string[] = [];

  // 定义需要检查的状态：recruiting(过期变cancelled), formed(过期变completed)
  const activeStatuses = ["recruiting", "formed"];

  if (teamId) {
    // 单条检查：查询指定队伍
    const team = await ormDb
      .select({
        id: schema.teams.id,
        status: schema.teams.status,
        endTime: schema.teams.endTime,
        createdAt: schema.teams.createdAt,
      })
      .from(schema.teams)
      .where(eq(schema.teams.id, teamId))
      .limit(1);

    if (team.length === 0) return [];

    const teamData = team[0];
    // 过期条件：创建时间超过1天 且 结束时间已过
    const createdAtTime = new Date(teamData.createdAt).getTime();
    const endTime = new Date(teamData.endTime);
    const isExpired = endTime < now && (createdAtTime + ONE_DAY_MS) < now.getTime();

    if (isExpired) {
      if (teamData.status === "recruiting") {
        // 招募中 + 过期 -> 取消
        await ormDb
          .update(schema.teams)
          .set({ status: "cancelled", updatedAt: now })
          .where(eq(schema.teams.id, teamId));
        updatedIds.push(teamId);
      } else if (teamData.status === "formed") {
        // 已组建 + 过期 -> 完成
        await ormDb
          .update(schema.teams)
          .set({ status: "completed", updatedAt: now })
          .where(eq(schema.teams.id, teamId));
        updatedIds.push(teamId);
      }
    }
    return updatedIds;
  } else {
    // 批量检查：更新所有过期队伍

    // 计算createdAt + 1天的截止时间
    const createdAtThreshold = new Date(now.getTime() - ONE_DAY_MS);

    // 1. 处理 recruiting -> cancelled
    // 过期条件：创建时间超过1天 且 结束时间已过
    const recruitingExpired = await ormDb
      .select({ id: schema.teams.id })
      .from(schema.teams)
      .where(
        and(
          eq(schema.teams.status, "recruiting"),
          lt(schema.teams.endTime, now),
          lt(schema.teams.createdAt, createdAtThreshold)
        )
      );

    if (recruitingExpired.length > 0) {
      await ormDb
        .update(schema.teams)
        .set({ status: "cancelled", updatedAt: now })
        .where(
          and(
            eq(schema.teams.status, "recruiting"),
            lt(schema.teams.endTime, now),
            lt(schema.teams.createdAt, createdAtThreshold)
          )
        );
      updatedIds.push(...recruitingExpired.map((t) => t.id));
    }

    // 2. 处理 formed -> completed
    // 过期条件：创建时间超过1天 且 结束时间已过
    const formedExpired = await ormDb
      .select({ id: schema.teams.id })
      .from(schema.teams)
      .where(
        and(
          eq(schema.teams.status, "formed"),
          lt(schema.teams.endTime, now),
          lt(schema.teams.createdAt, createdAtThreshold)
        )
      );

    if (formedExpired.length > 0) {
      await ormDb
        .update(schema.teams)
        .set({ status: "completed", updatedAt: now })
        .where(
          and(
            eq(schema.teams.status, "formed"),
            lt(schema.teams.endTime, now),
            lt(schema.teams.createdAt, createdAtThreshold)
          )
        );
      updatedIds.push(...formedExpired.map((t) => t.id));
    }

    return updatedIds;
  }
}
