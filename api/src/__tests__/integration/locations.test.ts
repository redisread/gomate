import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser, seedCity, seedLocation } from "../helpers/seed";
import * as schema from "../../db/schema";

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

const { locationsRoute } = await import("../../routes/locations");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/locations", locationsRoute);
  return app;
}

async function req(app: ReturnType<typeof createApp>, path: string, options: RequestInit = {}) {
  return app.fetch(new Request(`http://localhost${path}`, options), { DB: {} });
}

describe("Locations API 集成测试", () => {
  let app: ReturnType<typeof createApp>;
  let city: schema.City;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;

    await seedUser(testDb, { name: "管理员", role: "admin", email: "admin@test.com" });
    city = await seedCity(testDb, { name: "深圳" });
  });

  describe("GET /locations - 地点列表", () => {
    it("获取地点列表返回分页数据", async () => {
      await seedLocation(testDb, city.id, { name: "梧桐山" });
      await seedLocation(testDb, city.id, { name: "大亚湾" });

      const res = await req(app, "/locations");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; locations: unknown[]; pagination: unknown };
      expect(json.success).toBe(true);
      expect(json.locations).toHaveLength(2);
      expect(json.pagination).toBeDefined();
    });

    it("按城市筛选只返回该城市地点", async () => {
      const city2 = await seedCity(testDb, { name: "香港" });
      await seedLocation(testDb, city.id, { name: "梧桐山" });
      await seedLocation(testDb, city2.id, { name: "麦理浩径" });

      const res = await req(app, `/locations?cityId=${city.id}`);
      expect(res.status).toBe(200);
      const json = await res.json() as { locations: { name: string }[] };
      expect(json.locations).toHaveLength(1);
      expect(json.locations[0].name).toBe("梧桐山");
    });

    it("搜索地点名称", async () => {
      await seedLocation(testDb, city.id, { name: "梧桐山" });
      await seedLocation(testDb, city.id, { name: "大亚湾" });

      const res = await req(app, "/locations?search=梧桐");
      expect(res.status).toBe(200);
      const json = await res.json() as { locations: { name: string }[] };
      expect(json.locations).toHaveLength(1);
      expect(json.locations[0].name).toBe("梧桐山");
    });

    it("?tags=true 返回热门标签列表（最多15个）", async () => {
      // 插入几个标签
      await testDb.insert(schema.tags).values([
        { id: "tag1", name: "徒步", type: "activity", createdAt: new Date() },
        { id: "tag2", name: "登山", type: "activity", createdAt: new Date() },
      ]);

      const res = await req(app, "/locations?tags=true");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; tags: unknown[] };
      expect(json.success).toBe(true);
      expect(Array.isArray(json.tags)).toBe(true);
      expect(json.tags.length).toBeLessThanOrEqual(15);
    });
  });

  describe("GET /locations/:id - 地点详情", () => {
    it("获取存在的地点详情返回 200", async () => {
      const location = await seedLocation(testDb, city.id, { name: "梧桐山" });

      const res = await req(app, `/locations/${location.id}`);
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; location: { id: string; name: string } };
      expect(json.success).toBe(true);
      expect(json.location.id).toBe(location.id);
      expect(json.location.name).toBe("梧桐山");
    });

    it("支持通过 slug 获取地点详情", async () => {
      const location = await seedLocation(testDb, city.id, {
        name: "梧桐山",
        slug: "wutong-mountain",
      });

      const res = await req(app, "/locations/wutong-mountain");
      expect(res.status).toBe(200);
      const json = await res.json() as { success: boolean; location: { id: string; slug: string; name: string } };
      expect(json.success).toBe(true);
      expect(json.location.id).toBe(location.id);
      expect(json.location.slug).toBe("wutong-mountain");
      expect(json.location.name).toBe("梧桐山");
    });

    it("获取不存在的地点返回 404", async () => {
      const res = await req(app, "/locations/nonexistent-id");
      expect(res.status).toBe(404);
    });
  });

  describe("task #152 切源：徒步参数读 location 字段", () => {
    it("view=card 返回 location 扁平化字段，routes[0] 镜像同值", async () => {
      await seedLocation(testDb, city.id, {
        name: "梧桐山",
        difficulty: "moderate",
        durationMin: 120,
        durationMax: 180,
        distance: 5.5,
        elevation: 700,
      });
      await seedLocation(testDb, city.id, { name: "昆明湖" }); // 无参数

      const res = await req(app, "/locations?view=card");
      expect(res.status).toBe(200);
      const json = await res.json() as {
        locations: {
          name: string; difficulty: string | null;
          durationMin: number | null; durationMax: number | null;
          distance: number | null; elevation: number | null;
          routes: { difficulty: string | null; durationMin: number | null }[];
        }[];
      };
      const wts = json.locations.find((l) => l.name === "梧桐山")!;
      expect(wts.difficulty).toBe("moderate");
      expect(wts.durationMin).toBe(120);
      expect(wts.durationMax).toBe(180);
      expect(wts.distance).toBe(5.5);
      expect(wts.elevation).toBe(700);
      expect(wts.routes).toHaveLength(1);
      expect(wts.routes[0].difficulty).toBe("moderate");
      expect(wts.routes[0].durationMin).toBe(120);

      const km = json.locations.find((l) => l.name === "昆明湖")!;
      expect(km.difficulty).toBeNull();
      expect(km.durationMin).toBeNull();
      expect(km.routes).toHaveLength(0);
    });

    it("完整列表 difficulty 读 location 字段而非 routes join", async () => {
      const loc = await seedLocation(testDb, city.id, {
        name: "切源山", difficulty: "hard", durationMin: 300, durationMax: 420,
      });
      // 故意插入一条 difficulty 不同的路线，证明数据源是 location 而非 routes
      const ts = new Date();
      await testDb.insert(schema.routes).values({
        id: "route_distractor", locationId: loc.id, cityId: city.id, name: "干扰路线",
        difficulty: "easy", durationMin: 10, durationMax: 20, distance: 1,
        createdAt: ts, updatedAt: ts,
      });

      const res = await req(app, "/locations");
      expect(res.status).toBe(200);
      const json = await res.json() as {
        locations: { name: string; difficulty: string; durationMin: number; durationMax: number }[];
      };
      const item = json.locations.find((l) => l.name === "切源山")!;
      expect(item.difficulty).toBe("hard");
      expect(item.durationMin).toBe(300);
      expect(item.durationMax).toBe(420);
    });
  });
});
