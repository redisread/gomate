import { eq, and, lt } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import { teams } from "../db/schema";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// 兼容 D1 和 better-sqlite3 的数据库类型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = BetterSQLite3Database<typeof schema> | any;

// 查询结果类型
type TeamIdRow = { id: string };

/**
 * 检查并更新已过期的队伍状态
 * - recruiting + 过期 -> cancelled
 * - formed + 过期 -> completed
 */
export async function updateExpiredTeams(db: AnyDb, teamId?: string): Promise<string[]> {
  const now = new Date();
  const updatedIds: string[] = [];

  if (teamId) {
    const team = await db
      .select({ id: teams.id, status: teams.status, endTime: teams.endTime, createdAt: teams.createdAt })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (team.length === 0) return [];

    const t = team[0];
    const isExpired =
      new Date(t.endTime) < now &&
      new Date(t.createdAt).getTime() + ONE_DAY_MS < now.getTime();

    if (isExpired) {
      if (t.status === "recruiting") {
        await db.update(teams).set({ status: "cancelled", updatedAt: now }).where(eq(teams.id, teamId));
        updatedIds.push(teamId);
      } else if (t.status === "formed") {
        await db.update(teams).set({ status: "completed", updatedAt: now }).where(eq(teams.id, teamId));
        updatedIds.push(teamId);
      }
    }
    return updatedIds;
  }

  const threshold = new Date(now.getTime() - ONE_DAY_MS);

  // recruiting -> cancelled
  const recruitingExpired: TeamIdRow[] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.status, "recruiting"), lt(teams.endTime, now), lt(teams.createdAt, threshold)));

  if (recruitingExpired.length > 0) {
    await db
      .update(teams)
      .set({ status: "cancelled", updatedAt: now })
      .where(and(eq(teams.status, "recruiting"), lt(teams.endTime, now), lt(teams.createdAt, threshold)));
    updatedIds.push(...recruitingExpired.map((t: TeamIdRow) => t.id));
  }

  // formed -> completed
  const formedExpired: TeamIdRow[] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.status, "formed"), lt(teams.endTime, now), lt(teams.createdAt, threshold)));

  if (formedExpired.length > 0) {
    await db
      .update(teams)
      .set({ status: "completed", updatedAt: now })
      .where(and(eq(teams.status, "formed"), lt(teams.endTime, now), lt(teams.createdAt, threshold)));
    updatedIds.push(...formedExpired.map((t: TeamIdRow) => t.id));
  }

  return updatedIds;
}
