import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createAuth, type Env } from "../lib/auth";
import { createDb } from "../db";
import { users } from "../db/schema";
import { checkRateLimit, getClientIP } from "../lib/rate-limit";

const auth = new Hono<{ Bindings: Env }>();

const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

/**
 * POST /auth/forgot-password
 * 发送密码重置邮件（自定义实现，需在 Better Auth 通配符之前注册）
 *
 * 限流：5 次/分钟/IP
 */
auth.post("/forgot-password", async (c) => {
  const ip = getClientIP(c.req.raw);
  const rateResult = await checkRateLimit(c.env.GOMATE_KV, `rate:auth:forgot:${ip}`, 5, 60);
  if (!rateResult.allowed) {
    return c.json({ success: false, error: "请求过于频繁，请稍后再试", retryAfter: rateResult.retryAfter }, 429);
  }

  try {
    const body = await c.req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.errors[0]?.message || "请提供有效的邮箱地址" }, 400);
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
    console.error("Forgot password error:", error);
    return c.json({ success: false, error: "发送重置邮件失败，请稍后重试" }, 500);
  }
});

/**
 * ALL /auth/*
 * Better Auth 处理所有认证请求（登录、注册、登出、会话等）
 *
 * 对 sign-in 和 sign-up 端点应用限流。
 */
auth.all("/*", async (c) => {
  const path = new URL(c.req.url).pathname;

  // 针对敏感端点的限流
  if (path.includes("/sign-in")) {
    const ip = getClientIP(c.req.raw);
    const result = await checkRateLimit(c.env.GOMATE_KV, `rate:auth:signin:${ip}`, 20, 60);
    if (!result.allowed) {
      return c.json({ success: false, error: "登录尝试过于频繁，请稍后再试", retryAfter: result.retryAfter }, 429);
    }
  } else if (path.includes("/sign-up")) {
    const ip = getClientIP(c.req.raw);
    const result = await checkRateLimit(c.env.GOMATE_KV, `rate:auth:signup:${ip}`, 10, 60);
    if (!result.allowed) {
      return c.json({ success: false, error: "注册请求过于频繁，请稍后再试", retryAfter: result.retryAfter }, 429);
    }
  }

  const authInstance = createAuth(c.env);
  return authInstance.handler(c.req.raw);
});

export { auth as authRoute };
