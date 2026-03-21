import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/seed";
import * as schema from "../../db/schema";

// ===== Mock 策略 =====
let currentSession: { user: { id: string; email: string; name: string } } | null = null;
let testDb: ReturnType<typeof createTestDb>["db"];

vi.mock("../../lib/auth", () => ({
  createAuth: (_env: unknown) => ({
    api: {
      getSession: async (_opts: unknown) => currentSession,
    },
  }),
}));

vi.mock("../../db", () => ({
  createDb: (_d1: unknown) => testDb,
}));

const { usersRoute } = await import("../../routes/users");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/users", usersRoute);
  return app;
}

async function req(app: ReturnType<typeof createApp>, path: string, options: RequestInit = {}): Promise<Response> {
  return app.fetch(new Request(`http://localhost${path}`, options), { DB: {} });
}

describe("用户 API 集成测试", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;
  });

  describe("GET /users - 获取用户信息", () => {
    /**
     * 测试场景：获取存在的用户信息
     * 预期结果：返回 200，包含用户数据
     */
    it("获取存在的用户 → 200，包含用户数据", async () => {
      // Arrange
      const user = await seedUser(testDb, { name: "张三", email: "zhangsan@test.com", wechat: "zhangsan-wechat" });

      // Act
      const res = await req(app, `/users?id=${user.id}`);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as { user: Record<string, unknown> };
      expect(data.user.id).toBe(user.id);
      expect(data.user.name).toBe("张三");
      expect(data.user.email).toBe("zhangsan@test.com");
    });

    /**
     * 测试场景：不提供 userId
     * 预期结果：返回 400
     */
    it("不提供 userId → 400", async () => {
      // Act
      const res = await req(app, "/users");

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：获取不存在的用户
     * 预期结果：返回 404
     */
    it("获取不存在的用户 → 404", async () => {
      // Act
      const res = await req(app, "/users?id=non-existent-user-id");

      // Assert
      expect(res.status).toBe(404);
    });

    /**
     * 测试场景：用户信息包含微信号
     * 预期结果：当前 API 设计返回所有用户信息（含 wechat）
     */
    it("获取用户信息 → 包含 wechat 字段", async () => {
      // Arrange
      const user = await seedUser(testDb, { wechat: "my-wechat" });

      // Act
      const res = await req(app, `/users?id=${user.id}`);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as { user: Record<string, unknown> };
      expect(data.user.wechat).toBe("my-wechat");
    });
  });

  describe("PATCH /users/update - 更新用户信息", () => {
    /**
     * 测试场景：成功更新用户信息
     * 预期结果：返回 200，数据库中信息已更新
     */
    it("成功更新用户信息 → 200", async () => {
      // Arrange
      const user = await seedUser(testDb);

      // Act
      const res = await req(app, "/users/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, name: "新名字", bio: "新简介", wechat: "new-wechat" }),
      });

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);

      // 验证数据库中数据已更新
      const { eq } = await import("drizzle-orm");
      const [updatedUser] = await testDb.select().from(schema.users).where(eq(schema.users.id, user.id));
      expect(updatedUser.name).toBe("新名字");
      expect(updatedUser.bio).toBe("新简介");
      expect(updatedUser.wechat).toBe("new-wechat");
    });

    /**
     * 测试场景：不提供 userId
     * 预期结果：返回 400
     */
    it("不提供 userId → 400", async () => {
      // Act
      const res = await req(app, "/users/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "新名字" }),
      });

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：更新 level 字段
     * 预期结果：level 成功更新
     */
    it("更新 level 字段 → 200，level 已更新", async () => {
      // Arrange
      const user = await seedUser(testDb, { level: "beginner" });

      // Act
      const res = await req(app, "/users/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, level: "advanced" }),
      });

      // Assert
      expect(res.status).toBe(200);
      const { eq } = await import("drizzle-orm");
      const [updatedUser] = await testDb.select().from(schema.users).where(eq(schema.users.id, user.id));
      expect(updatedUser.level).toBe("advanced");
    });
  });
});
