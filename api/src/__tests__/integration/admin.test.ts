import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser, seedTeam, seedCity, seedLocation } from "../helpers/seed";
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

// Mock team-status module
vi.mock("../../lib/team-status", () => ({
  updateExpiredTeams: async (_db: unknown) => ["team_1", "team_2"],
}));

const { adminRoute } = await import("../../routes/admin");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/admin", adminRoute);
  return app;
}

async function req(
  app: ReturnType<typeof createApp>,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  return app.fetch(new Request(`http://localhost${path}`, options), { DB: {} });
}

/** 设置登录会话 */
function loginAs(user: { id: string; email: string; name: string }) {
  currentSession = { user };
}

function logout() {
  currentSession = null;
}

describe("Admin API 集成测试", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;
  });

  describe("POST /admin/clear-rate-limit - 清除速率限制", () => {
    /**
     * 测试场景：未登录清除速率限制
     * 预期结果：返回 401
     */
    it("未登录 → 401", async () => {
      // Act
      const res = await req(app, "/admin/clear-rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: "test@example.com" }),
      });

      // Assert
      expect(res.status).toBe(401);
    });

    /**
     * 测试场景：普通用户清除速率限制
     * 预期结果：返回 403
     */
    it("普通用户 → 403", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);

      // Act
      const res = await req(app, "/admin/clear-rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: "test@example.com" }),
      });

      // Assert
      expect(res.status).toBe(403);
    });

    /**
     * 测试场景：管理员清除速率限制
     * 预期结果：返回 200
     */
    it("管理员清除速率限制 → 200", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/admin/clear-rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: "test@example.com" }),
      });

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
    });

    /**
     * 测试场景：管理员不提供 identifier
     * 预期结果：返回 400
     */
    it("不提供 identifier → 400", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/admin/clear-rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      // Assert
      expect(res.status).toBe(400);
    });
  });

  describe("POST /admin/cron/update-expired-teams - 更新过期队伍", () => {
    /**
     * 测试场景：未登录触发过期队伍更新
     * 预期结果：返回 401
     */
    it("未登录 → 401", async () => {
      // Act
      const res = await req(app, "/admin/cron/update-expired-teams", {
        method: "POST",
      });

      // Assert
      expect(res.status).toBe(401);
    });

    /**
     * 测试场景：普通用户触发过期队伍更新
     * 预期结果：返回 403
     */
    it("普通用户 → 403", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);

      // Act
      const res = await req(app, "/admin/cron/update-expired-teams", {
        method: "POST",
      });

      // Assert
      expect(res.status).toBe(403);
    });

    /**
     * 测试场景：管理员触发过期队伍更新
     * 预期结果：返回 200，包含更新结果
     */
    it("管理员触发更新 → 200", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/admin/cron/update-expired-teams", {
        method: "POST",
      });

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.message).toContain("已更新");
    });
  });
});
