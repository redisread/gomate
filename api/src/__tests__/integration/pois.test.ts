import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
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

const { poisRoute } = await import("../../routes/pois");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/pois", poisRoute);
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

/** 插入测试 POI */
async function seedPoi(
  db: ReturnType<typeof createTestDb>["db"],
  overrides: Partial<schema.NewPoi> = {},
): Promise<schema.Poi> {
  const id = `poi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const ts = new Date();
  const { id: _omitId, ...rest } = overrides;
  const poi: schema.NewPoi = {
    id,
    name: rest.name ?? "Test POI",
    description: rest.description ?? null,
    coordinates: rest.coordinates ?? JSON.stringify({ lat: 22.54, lng: 114.06 }),
    images: rest.images ?? null,
    extra: rest.extra ?? null,
    createdAt: rest.createdAt ?? ts,
    updatedAt: rest.updatedAt ?? ts,
  };
  await db.insert(schema.pois).values(poi);
  const [inserted] = await db.select().from(schema.pois).where(eq(schema.pois.id, id));
  return inserted;
}

describe("POI API 集成测试", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;
  });

  describe("GET /pois - 获取 POI 列表", () => {
    /**
     * 测试场景：数据库为空
     * 预期结果：返回空数组
     */
    it("空数据库 → 200，空数组", async () => {
      // Act
      const res = await req(app, "/pois");

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as { pois: unknown[] };
      expect(data.pois).toEqual([]);
    });

    /**
     * 测试场景：数据库中有多个 POI
     * 预期结果：返回所有 POI
     */
    it("返回所有 POI → 200", async () => {
      // Arrange
      await seedPoi(testDb, { name: "梧桐山" });
      await seedPoi(testDb, { name: "塘朗山" });

      // Act
      const res = await req(app, "/pois");

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as { pois: { name: string }[] };
      expect(data.pois).toHaveLength(2);
    });

    /**
     * 测试场景：关键词搜索匹配名称
     * 预期结果：返回匹配的 POI
     */
    it("关键词搜索 → 返回匹配结果", async () => {
      // Arrange
      await seedPoi(testDb, { name: "梧桐山" });
      await seedPoi(testDb, { name: "塘朗山" });
      await seedPoi(testDb, { name: "梧桐山北" });

      // Act
      const res = await req(app, "/pois?search=梧桐");

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as { pois: { name: string }[] };
      expect(data.pois).toHaveLength(2);
      expect(data.pois.every((p) => p.name.includes("梧桐"))).toBe(true);
    });

    /**
     * 测试场景：关键词搜索无匹配
     * 预期结果：返回空数组
     */
    it("搜索无匹配 → 返回空数组", async () => {
      // Arrange
      await seedPoi(testDb, { name: "梧桐山" });

      // Act
      const res = await req(app, "/pois?search=不存在的地点");

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as { pois: unknown[] };
      expect(data.pois).toHaveLength(0);
    });
  });

  describe("GET /pois/:id - 获取单个 POI", () => {
    /**
     * 测试场景：获取存在的 POI
     * 预期结果：返回 200 和 POI 详情
     */
    it("获取存在的 POI → 200", async () => {
      // Arrange
      const poi = await seedPoi(testDb, {
        name: "测试打卡点",
        description: "这是一个测试打卡点",
      });

      // Act
      const res = await req(app, `/pois/${poi.id}`);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as { poi: Record<string, unknown> };
      expect(data.poi.name).toBe("测试打卡点");
      expect(data.poi.description).toBe("这是一个测试打卡点");
      expect(data.poi.id).toBe(poi.id);
    });

    /**
     * 测试场景：获取不存在的 POI
     * 预期结果：返回 404
     */
    it("获取不存在的 POI → 404", async () => {
      // Act
      const res = await req(app, "/pois/non-existent");

      // Assert
      expect(res.status).toBe(404);
    });
  });

  describe("POST /pois - 创建 POI", () => {
    /**
     * 测试场景：未登录创建 POI
     * 预期结果：返回 401
     */
    it("未登录 → 401", async () => {
      // Act
      const res = await req(app, "/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "测试", coordinates: { lat: 22.5, lng: 114.0 } }),
      });

      // Assert
      expect(res.status).toBe(401);
    });

    /**
     * 测试场景：普通用户创建 POI
     * 预期结果：返回 403
     */
    it("普通用户 → 403", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);

      // Act
      const res = await req(app, "/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "测试", coordinates: { lat: 22.5, lng: 114.0 } }),
      });

      // Assert
      expect(res.status).toBe(403);
    });

    /**
     * 测试场景：管理员创建合法 POI
     * 预期结果：返回 200，包含 poiId
     */
    it("管理员创建 POI → 200", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "新打卡点",
          description: "新创建的打卡点",
          coordinates: { lat: 22.54, lng: 114.06 },
        }),
      });

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.poiId).toBeDefined();
    });

    /**
     * 测试场景：缺少名称
     * 预期结果：返回 400
     */
    it("缺少名称 → 400", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: { lat: 22.5, lng: 114.0 } }),
      });

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：名称超过 50 字符
     * 预期结果：返回 400
     */
    it("名称超过50字符 → 400", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "a".repeat(51),
          coordinates: { lat: 22.5, lng: 114.0 },
        }),
      });

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：坐标格式无效
     * 预期结果：返回 400
     */
    it("坐标格式无效 → 400", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "测试", coordinates: { lat: "invalid", lng: 114.0 } }),
      });

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：坐标超出范围
     * 预期结果：返回 400
     */
    it("坐标超出范围 → 400", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "测试", coordinates: { lat: 100, lng: 114.0 } }),
      });

      // Assert
      expect(res.status).toBe(400);
    });

    /**
     * 测试场景：描述超过 500 字符
     * 预期结果：返回 400
     */
    it("描述超过500字符 → 400", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/pois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "测试",
          description: "a".repeat(501),
          coordinates: { lat: 22.5, lng: 114.0 },
        }),
      });

      // Assert
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /pois/:id - 更新 POI", () => {
    /**
     * 测试场景：管理员更新 POI 名称
     * 预期结果：返回 200，数据库已更新
     */
    it("管理员更新 POI 名称 → 200", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);
      const poi = await seedPoi(testDb, { name: "旧名称" });

      // Act
      const res = await req(app, `/pois/${poi.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "新名称" }),
      });

      // Assert
      expect(res.status).toBe(200);
      const [updated] = await testDb.select().from(schema.pois).where(eq(schema.pois.id, poi.id));
      expect(updated.name).toBe("新名称");
    });

    /**
     * 测试场景：更新不存在的 POI
     * 预期结果：返回 404
     */
    it("更新不存在的 POI → 404", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/pois/non-existent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "新名称" }),
      });

      // Assert
      expect(res.status).toBe(404);
    });

    /**
     * 测试场景：普通用户更新 POI
     * 预期结果：返回 403
     */
    it("普通用户更新 POI → 403", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);
      const poi = await seedPoi(testDb);

      // Act
      const res = await req(app, `/pois/${poi.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "新名称" }),
      });

      // Assert
      expect(res.status).toBe(403);
    });

    /**
     * 测试场景：更新名称为空字符串
     * 预期结果：返回 400
     */
    it("更新名称为空 → 400", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);
      const poi = await seedPoi(testDb);

      // Act
      const res = await req(app, `/pois/${poi.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "  " }),
      });

      // Assert
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /pois/:id - 删除 POI", () => {
    /**
     * 测试场景：管理员删除存在的 POI
     * 预期结果：返回 200，POI 已从数据库删除
     */
    it("管理员删除 POI → 200，POI 已删除", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);
      const poi = await seedPoi(testDb, { name: "要删除的POI" });

      // Act
      const res = await req(app, `/pois/${poi.id}`, { method: "DELETE" });

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);

      const [deleted] = await testDb.select().from(schema.pois).where(eq(schema.pois.id, poi.id));
      expect(deleted).toBeUndefined();
    });

    /**
     * 测试场景：删除不存在的 POI
     * 预期结果：返回 404
     */
    it("删除不存在的 POI → 404", async () => {
      // Arrange
      const admin = await seedUser(testDb, { role: "admin" });
      loginAs(admin);

      // Act
      const res = await req(app, "/pois/non-existent", { method: "DELETE" });

      // Assert
      expect(res.status).toBe(404);
    });

    /**
     * 测试场景：普通用户删除 POI
     * 预期结果：返回 403
     */
    it("普通用户删除 POI → 403", async () => {
      // Arrange
      const user = await seedUser(testDb);
      loginAs(user);
      const poi = await seedPoi(testDb);

      // Act
      const res = await req(app, `/pois/${poi.id}`, { method: "DELETE" });

      // Assert
      expect(res.status).toBe(403);
    });
  });
});
