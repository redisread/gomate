import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createAuth, type Env } from "../lib/auth";
import { createDb } from "../db";
import { users } from "../db/schema";

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /auth/forgot-password
 * 发送密码重置邮件（自定义实现，需在 Better Auth 通配符之前注册）
 */
auth.post("/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json<{ email?: string }>();

    if (!email || typeof email !== "string") {
      return c.json({ error: "请提供邮箱地址" }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "请输入有效的邮箱地址" }, 400);
    }

    const db = createDb(c.env.DB);

    // 检查用户是否存在
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length === 0) {
      return c.json({ error: "该邮箱未注册" }, 400);
    }

    const authInstance = createAuth(c.env);
    const frontendUrl = c.env.FRONTEND_URL || c.env.APP_URL || "http://localhost:8799";

    await authInstance.api.requestPasswordReset({
      body: { email, redirectTo: `${frontendUrl}/reset-password` },
    });

    return c.json({ success: true, message: "重置密码邮件已发送，请检查您的邮箱" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return c.json({ error: "发送重置邮件失败，请稍后重试" }, 500);
  }
});

/**
 * ALL /auth/*
 * Better Auth 处理所有认证请求（登录、注册、登出、会话等）
 */
auth.all("/*", (c) => {
  const authInstance = createAuth(c.env);
  return authInstance.handler(c.req.raw);
});

export { auth as authRoute };
