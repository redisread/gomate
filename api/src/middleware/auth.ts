import type { Context, Next } from "hono";
import type { Env } from "../lib/auth";
import { createAuth } from "../lib/auth";

type HonoEnv = { Bindings: Env; Variables: { session: Awaited<ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>> } };

/**
 * 认证中间件 - 要求登录
 * 将 session 注入到 c.var.session
 */
export async function requireAuth(c: Context<HonoEnv>, next: Next) {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ success: false, error: "请先登录" }, 401);
  }

  c.set("session", session);
  await next();
}

/**
 * 可选认证中间件 - 不要求登录，但如果已登录则注入 session
 */
export async function optionalAuth(c: Context<HonoEnv>, next: Next) {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session) {
      c.set("session", session);
    }
  } catch {
    // 未登录，忽略
  }
  await next();
}

/**
 * 管理员权限中间件
 */
export async function requireAdmin(c: Context<HonoEnv>, next: Next) {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ success: false, error: "请先登录" }, 401);
  }

  // 从数据库查询用户角色
  const { createDb } = await import("../db");
  const { users } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");
  const db = createDb(c.env.DB);
  const user = await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1);

  if (!user[0] || user[0].role !== "admin") {
    return c.json({ success: false, error: "无权限访问" }, 403);
  }

  c.set("session", session);
  await next();
}
