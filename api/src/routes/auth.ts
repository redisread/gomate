import { APIErrors } from "../lib/api-errors";
import { logger } from "../lib/logger";
import { Hono } from "hono";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { createAuth, type Env } from "../lib/auth";
import { createDb } from "../db";
import { users, apiKeys } from "../db/schema";

const auth = new Hono<{ Bindings: Env }>();

const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

/**
 * POST /auth/forgot-password
 * 发送密码重置邮件（自定义实现，需在 Better Auth 通配符之前注册）
 */
auth.post("/forgot-password", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError(parsed.error.errors[0]?.message || "请提供有效的邮箱地址"), 400);
    }
    const { email } = parsed.data;

    const db = createDb(c.env.DB);

    // 检查用户是否存在 — 无论是否存在都返回相同消息，防止枚举
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length === 0) {
      // 不暴露用户是否存在的信息
      return c.json({ success: true, message: "如果该邮箱已注册，重置密码邮件已发送" });
    }

    const authInstance = createAuth(c.env);
    const frontendUrl = c.env.FRONTEND_URL || c.env.APP_URL || "http://localhost:8799";

    await authInstance.api.requestPasswordReset({
      body: { email, redirectTo: `${frontendUrl}/reset-password` },
    });

    return c.json({ success: true, message: "如果该邮箱已注册，重置密码邮件已发送" });
  } catch (error) {
    logger.error("Forgot password error:", error);
    return c.json(APIErrors.internalError("发送重置邮件失败，请稍后重试"), 500);
  }
});

/**
 * POST /auth/api-key/create
 * 自定义 wrapper：10-key 上限拦截（P1a spec：beforeKeyCreate hook 等效）
 * 必须在 auth.all("/*", ...) 之前注册，否则被通配符吞掉。
 */
const MAX_API_KEYS = 10;

auth.post("/api-key/create", async (c) => {
  const authInstance = createAuth(c.env);
  // 解析 session（API key 认证产生的 session 等效于 key 对应的用户身份）
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
  if (!session) {
    return c.json(APIErrors.unauthorized("请先登录"), 401);
  }

  const userId = session.user.id;
  const db = createDb(c.env.DB);

  // 统计该用户已有 key 数量
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(apiKeys)
    .where(eq(apiKeys.referenceId, userId));

  if (cnt >= MAX_API_KEYS) {
    return c.json(
      { success: false, error: "MAX_API_KEYS_EXCEEDED", message: `每位用户最多 ${MAX_API_KEYS} 个 API Key，当前已有 ${cnt} 个` },
      403
    );
  }

  // 放行：交由 better-auth 内部 createApiKey 处理
  return authInstance.handler(c.req.raw);
});

/**
 * ALL /auth/*
 * Better Auth 处理所有认证请求（登录、注册、登出、会话等）
 *
 * 注意：/auth/api-key/create 已由上方的 post 路由处理，不会落入此处。
 */
auth.all("/*", async (c) => {
  const authInstance = createAuth(c.env);
  return authInstance.handler(c.req.raw);
});

export { auth as authRoute };
