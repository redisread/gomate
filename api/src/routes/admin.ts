import { APIErrors } from "../lib/api-errors";
import { logger } from "../lib/logger";
import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { createAuth, type Env } from "../lib/auth";
import { updateExpiredTeams } from "../lib/team-status";

// 自定义错误类，避免字符串匹配导致的脆弱性
class AuthenticationError extends Error {
  constructor(message = "未登录") {
    super(message);
    this.name = "AuthenticationError";
  }
}

class AuthorizationError extends Error {
  constructor(message = "无权限访问") {
    super(message);
    this.name = "AuthorizationError";
  }
}

const admin = new Hono<{ Bindings: Env }>();

/** 验证管理员权限 */
async function checkAdmin(c: { env: Env; req: { raw: Request } }) {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new AuthenticationError();
  const db = createDb(c.env.DB);
  const user = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .then((rows) => rows[0]);
  if (!user || user.role !== "admin") throw new AuthorizationError();
  return session;
}

/**
 * POST /admin/cron/update-expired-teams
 * 手动触发过期队伍状态更新（仅管理员）
 * 用于本地测试和紧急处理
 */
admin.post("/cron/update-expired-teams", async (c) => {
  try {
    await checkAdmin(c);
    const db = createDb(c.env.DB);
    const updatedIds = await updateExpiredTeams(db);
    
    return c.json({
      success: true,
      message: `已更新 ${updatedIds.length} 个过期队伍`,
      updatedIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthenticationError) return c.json(APIErrors.unauthorized("未登录"), 401);
    if (error instanceof AuthorizationError) return c.json(APIErrors.forbidden("无权限访问"), 403);
    logger.error("Manual cron trigger error:", error);
    return c.json(APIErrors.internalError("执行失败"), 500);
  }
});

/**
 * GET /admin/share-analytics
 * 全局分享分析（仅管理员）
 * - 总体 + 渠道分布
 * - 最近 7 天每日趋势
 * - Top 10 被分享的故事
 */
admin.get("/share-analytics", async (c) => {
  try {
    await checkAdmin(c);
    const db = createDb(c.env.DB);

    // 1. 总体 + 渠道分布
    const overallResult = await db
      .select({
        channel: schema.shareEvents.shareChannel,
        count: sql<number>`count(*)`,
      })
      .from(schema.shareEvents)
      .groupBy(schema.shareEvents.shareChannel);

    const byChannel: Record<string, number> = {};
    let totalShares = 0;
    for (const row of overallResult) {
      byChannel[row.channel] = row.count;
      totalShares += row.count;
    }

    // 2. 最近 7 天每日趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgoMs = sevenDaysAgo.getTime();

    const trendResult = await db
      .select({
        date: sql<string>`date(${schema.shareEvents.createdAt} / 1000, 'unixepoch')`,
        count: sql<number>`count(*)`,
      })
      .from(schema.shareEvents)
      .where(sql`${schema.shareEvents.createdAt} >= ${sevenDaysAgoMs}`)
      .groupBy(sql`date(${schema.shareEvents.createdAt} / 1000, 'unixepoch')`)
      .orderBy(sql`date(${schema.shareEvents.createdAt} / 1000, 'unixepoch')`);

    // 3. Top 10 被分享的故事
    const topResult = await db
      .select({
        entityId: schema.shareEvents.entityId,
        count: sql<number>`count(*)`,
      })
      .from(schema.shareEvents)
      .where(eq(schema.shareEvents.entityType, "story"))
      .groupBy(schema.shareEvents.entityId)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return c.json({
      success: true,
      overall: { total: totalShares, byChannel },
      trend: trendResult,
      top: topResult,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) return c.json(APIErrors.unauthorized("未登录"), 401);
    if (error instanceof AuthorizationError) return c.json(APIErrors.forbidden("无权限访问"), 403);
    logger.error("Get share analytics error:", error);
    return c.json(APIErrors.internalError("获取分享分析失败"), 500);
  }
});

export { admin as adminRoute };
