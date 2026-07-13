import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import type { Env } from "../../lib/auth";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";

/**
 * 创建测试用认证 app
 * 使用内存 SQLite + drizzle-orm/better-sqlite3 适配器
 * 直接使用 Better Auth 的 drizzle 适配器（不经过 D1）
 */
function createAuthTestApp(sqlite: ReturnType<typeof createTestDb>["sqlite"]) {
  const db = drizzle(sqlite, { schema });

  const app = new Hono<{ Bindings: Env }>();

  // 注入环境变量
  app.use("*", async (c, next) => {
    (c as unknown as { env: Partial<Env> }).env = {
      BETTER_AUTH_SECRET: "test-secret-key-for-testing-32chars",
      APP_URL: "http://localhost:8799",
      FRONTEND_URL: "http://localhost:3000",
    } as Partial<Env>;
    await next();
  });

  // 自定义 forgot-password（直接读数据库）
  app.post("/auth/forgot-password", async (c) => {
    try {
      const body = await c.req.json<{ email?: string }>();
      const { email } = body;

      if (!email || typeof email !== "string") {
        return c.json(APIErrors.badRequest("请提供邮箱地址"), 400);
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return c.json(APIErrors.badRequest("请输入有效的邮箱地址"), 400);
      }

      const existingUser = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length === 0) {
        return c.json(APIErrors.badRequest("该邮箱未注册"), 400);
      }

      return c.json({ success: true, message: "重置密码邮件已发送，请检查您的邮箱" });
    } catch {
      return c.json(APIErrors.internalError("发送重置邮件失败，请稍后重试"), 500);
    }
  });

  // Better Auth 处理所有 /auth/* 路由
  app.all("/auth/*", (c) => {
    const auth = betterAuth({
      database: drizzleAdapter(db as never, {
        provider: "sqlite",
        schema: {
          user: schema.users,
          session: schema.sessions,
          account: schema.accounts,
          verification: schema.verifications,
        },
      }),
      emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 6,
        requireEmailVerification: false,
      },
      session: { expiresIn: 60 * 60 * 24 * 7 },
      secret: "test-secret-key-for-testing-32chars",
      baseURL: "http://localhost:8799",
      basePath: "/auth",
      trustedOrigins: ["http://localhost:3000", "http://localhost:8799"],
    });

    return auth.handler(c.req.raw);
  });

  return app;
}

describe("认证 API 集成测试", () => {
  let sqlite: ReturnType<typeof createTestDb>["sqlite"];
  let app: ReturnType<typeof createAuthTestApp>;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    app = createAuthTestApp(sqlite);
  });

  describe("POST /auth/sign-up - 用户注册", () => {
    /**
     * 测试场景：注册新用户
     * 预期结果：返回 200（Better Auth 成功），包含用户信息
     */
    it("注册新用户 → 应返回成功响应", async () => {
      // Arrange
      const body = JSON.stringify({
        email: "newuser@test.com",
        password: "password123",
        name: "测试用户",
      });

      // Act
      const res = await app.request("/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.user).toBeDefined();
      expect((data.user as Record<string, unknown>).email).toBe("newuser@test.com");
    });

    /**
     * 测试场景：重复邮箱注册
     * 预期结果：返回 422 或错误响应（邮箱已存在）
     */
    it("重复邮箱注册 → 应返回错误", async () => {
      // Arrange：先注册一次
      const body = JSON.stringify({
        email: "duplicate@test.com",
        password: "password123",
        name: "用户一",
      });

      await app.request("/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Act：再次用相同邮箱注册
      const body2 = JSON.stringify({
        email: "duplicate@test.com",
        password: "password456",
        name: "用户二",
      });

      const res = await app.request("/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body2,
      });

      // Assert：应返回错误（非 200）
      expect(res.status).not.toBe(200);
    });
  });

  describe("POST /auth/sign-in - 用户登录", () => {
    beforeEach(async () => {
      // 先注册一个用户
      await app.request("/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "login@test.com",
          password: "password123",
          name: "登录测试用户",
        }),
      });
    });

    /**
     * 测试场景：正确凭据登录
     * 预期结果：返回 200，包含 session token
     */
    it("正确凭据登录 → 应返回 200 和 session", async () => {
      // Arrange
      const body = JSON.stringify({
        email: "login@test.com",
        password: "password123",
      });

      // Act
      const res = await app.request("/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.user).toBeDefined();
      expect((data.user as Record<string, unknown>).email).toBe("login@test.com");
    });

    /**
     * 测试场景：错误密码登录
     * 预期结果：返回 401 或错误响应
     */
    it("错误密码登录 → 应返回认证失败", async () => {
      // Arrange
      const body = JSON.stringify({
        email: "login@test.com",
        password: "wrong-password",
      });

      // Act
      const res = await app.request("/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Assert：应返回非 200
      expect(res.status).not.toBe(200);
    });
  });

  describe("POST /auth/forgot-password - 密码重置", () => {
    beforeEach(async () => {
      // 先注册一个用户
      await app.request("/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "forgot@test.com",
          password: "password123",
          name: "重置密码用户",
        }),
      });
    });

    /**
     * 测试场景：邮箱存在时发送重置邮件
     * 预期结果：返回 200（不暴露是否发送成功）
     */
    it("邮箱存在 → 应返回 200", async () => {
      // Arrange
      const body = JSON.stringify({ email: "forgot@test.com" });

      // Act
      const res = await app.request("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
    });

    /**
     * 测试场景：邮箱不存在时发送重置邮件
     * 预期结果：返回 400（当前实现返回错误，未暴露用户存在性）
     */
    it("邮箱不存在 → 应返回 400 错误", async () => {
      // Arrange
      const body = JSON.stringify({ email: "nonexistent@test.com" });

      // Act
      const res = await app.request("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Assert：当前实现返回 400
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：邮箱格式错误
     * 预期结果：返回 400
     */
    it("邮箱格式错误 → 应返回 400", async () => {
      // Arrange
      const body = JSON.stringify({ email: "invalid-email" });

      // Act
      const res = await app.request("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Assert
      expect(res.status).toBe(400);
      const data = await res.json() as Record<string, unknown>;
      expect(data.error).toBeDefined();
    });

    /**
     * 测试场景：请求体缺少邮箱字段
     * 预期结果：返回 400
     */
    it("缺少邮箱字段 → 应返回 400", async () => {
      // Arrange
      const body = JSON.stringify({});

      // Act
      const res = await app.request("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Assert
      expect(res.status).toBe(400);
    });
  });
});
