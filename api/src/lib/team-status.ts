import { eq, and, lt } from "drizzle-orm";
import type { Db } from "../db";
import { teams } from "../db/schema";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 检查并更新已过期的队伍状态
 * - recruiting + 过期 -> cancelled
 * - formed + 过期 -> completed
 */
export async function updateExpiredTeams(db: Db, teamId?: string): Promise<string[]> {
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
  const recruitingExpired = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.status, "recruiting"), lt(teams.endTime, now), lt(teams.createdAt, threshold)));

  if (recruitingExpired.length > 0) {
    await db
      .update(teams)
      .set({ status: "cancelled", updatedAt: now })
      .where(and(eq(teams.status, "recruiting"), lt(teams.endTime, now), lt(teams.createdAt, threshold)));
    updatedIds.push(...recruitingExpired.map((t) => t.id));
  }

  // formed -> completed
  const formedExpired = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.status, "formed"), lt(teams.endTime, now), lt(teams.createdAt, threshold)));

  if (formedExpired.length > 0) {
    await db
      .update(teams)
      .set({ status: "completed", updatedAt: now })
      .where(and(eq(teams.status, "formed"), lt(teams.endTime, now), lt(teams.createdAt, threshold)));
    updatedIds.push(...formedExpired.map((t) => t.id));
  }

  return updatedIds;
}
