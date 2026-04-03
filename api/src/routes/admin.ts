import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { createAuth, type Env } from "../lib/auth";
import { updateExpiredTeams } from "../lib/team-status";

const admin = new Hono<{ Bindings: Env }>();

/** 验证管理员权限 */
async function checkAdmin(c: { env: Env; req: { raw: Request } }) {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new Error("未登录");
  const db = createDb(c.env.DB);
  const user = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .then((rows) => rows[0]);
  if (!user || user.role !== "admin") throw new Error("无权限访问");
  return session;
}

/**
 * POST /admin/clear-rate-limit
 * 清除速率限制（仅用于开发和测试）
 * 注意：Worker 环境下速率限制基于内存，本端点仅供兼容性使用
 */
admin.post("/clear-rate-limit", async (c) => {
  try {
    await checkAdmin(c);
    const body = await c.req.json<{ identifier?: string }>();

    if (!body.identifier || typeof body.identifier !== "string") {
      return c.json({ error: "请提供要清除的标识符（邮箱）" }, 400);
    }

    // Worker 环境下速率限制不跨请求持久化，直接返回成功
    return c.json({
      success: true,
      message: `已清除 ${body.identifier} 的速率限制`,
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json({ error: "未登录" }, 401);
    if (message === "无权限访问") return c.json({ error: "无权限访问" }, 403);
    console.error("Clear rate limit error:", error);
    return c.json({ error: "清除失败" }, 500);
  }
});

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
    const message = (error as Error).message;
    if (message === "未登录") return c.json({ error: "未登录" }, 401);
    if (message === "无权限访问") return c.json({ error: "无权限访问" }, 403);
    console.error("Manual cron trigger error:", error);
    return c.json({ error: "执行失败" }, 500);
  }
});

export { admin as adminRoute };
