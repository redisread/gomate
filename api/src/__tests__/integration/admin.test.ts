import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/seed";

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

describe("Admin API 集成测试", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;
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
