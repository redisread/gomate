import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
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
const { locationsRoute: v1LocationsRoute } = await import("../../routes/v1/locations");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/locations", locationsRoute);
  app.route("/v1/locations", v1LocationsRoute);
  return app;
}

async function req(
  app: ReturnType<typeof createApp>,
  path: string,
  options: RequestInit = {},
  envOverrides: Record<string, unknown> = {},
) {
  return app.fetch(new Request(`http://localhost${path}`, options), { DB: {}, ...envOverrides });
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

  describe("GET /locations/stats - 地图聚合数据", () => {
    it("地点点位包含城市和省份归属，供省级地图筛选", async () => {
      const guangdong = await seedCity(testDb, { name: "深圳", province: "广东省" });
      const location = await seedLocation(testDb, guangdong.id, {
        name: "梧桐山",
        coordinates: JSON.stringify({ lat: 22.6, lng: 114.2 }),
      });

      const res = await req(app, "/v1/locations/stats");
      expect(res.status).toBe(200);
      const json = await res.json() as {
        points: { id: string; cityName: string; province: string | null }[];
      };
      const point = json.points.find((item) => item.id === location.id);

      expect(point).toMatchObject({ cityName: "深圳", province: "广东省" });
    });
  });

  describe("task #152 切源：徒步参数读 location 字段", () => {
    it("view=card 返回 location 扁平化字段（task #154：routes 镜像已随 routes 表删除退场）", async () => {
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
          routes?: unknown;
        }[];
      };
      const wts = json.locations.find((l) => l.name === "梧桐山")!;
      expect(wts.difficulty).toBe("moderate");
      expect(wts.durationMin).toBe(120);
      expect(wts.durationMax).toBe(180);
      expect(wts.distance).toBe(5.5);
      expect(wts.elevation).toBe(700);
      expect(wts.routes).toBeUndefined();

      const km = json.locations.find((l) => l.name === "昆明湖")!;
      expect(km.difficulty).toBeNull();
      expect(km.durationMin).toBeNull();
      expect(km.routes).toBeUndefined();
    });

    it("完整列表返回 location 扁平化字段且无 routes 嵌入", async () => {
      await seedLocation(testDb, city.id, {
        name: "切源山", difficulty: "hard", durationMin: 300, durationMax: 420,
      });

      const res = await req(app, "/locations");
      expect(res.status).toBe(200);
      const json = await res.json() as {
        locations: { name: string; difficulty: string; durationMin: number; durationMax: number; routes?: unknown }[];
      };
      const item = json.locations.find((l) => l.name === "切源山")!;
      expect(item.difficulty).toBe("hard");
      expect(item.durationMin).toBe(300);
      expect(item.durationMax).toBe(420);
      expect(item.routes).toBeUndefined();
    });
  });

  // ==================== P0-B T2 (task #169): GET /locations/:id/transportation ====================
  ;

  // ==================== 地点装备决策退役 ====================
  describe("地点装备决策退役", () => {
    beforeEach(async () => {
      // admin 会话（seedUser 已插入 admin@test.com）
      const [admin] = await testDb.select().from(schema.users).where(eq(schema.users.email, "admin@test.com"));
      currentSession = { user: { id: admin.id, email: admin.email, name: admin.name } };
    });

    it("内部 API 忽略旧装备字段且不再回传，同时保留停车信息", async () => {
      const createRes = await req(app, "/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "退役契约测试",
          description: "验证地点装备字段已经退出接口契约",
          cityId: city.id,
          coverImage: "https://example.com/cover.jpg",
          parkingAvailable: true,
          parkingInfo: "主入口右侧，5 元一次",
          gearEssential: ["登山鞋", "雨衣"],
          gearOptional: ["登山杖"],
        }),
      });
      expect(createRes.status).toBe(200);
      const { location } = await createRes.json() as { location: { id: string } };

      const getRes = await req(app, `/locations/${location.id}`);
      const getJson = await getRes.json() as { location: Record<string, unknown> };
      expect(getJson.location.parkingAvailable).toBe(true);
      expect(getJson.location.parkingInfo).toBe("主入口右侧，5 元一次");
      expect(getJson.location).not.toHaveProperty("gearEssential");
      expect(getJson.location).not.toHaveProperty("gearOptional");
    });

    it("公开 v1 列表与详情不再回传地点装备字段", async () => {
      const loc = await seedLocation(testDb, city.id, {
        name: "公开契约测试",
      });

      const listRes = await req(app, "/v1/locations");
      const listJson = await listRes.json() as { locations: Record<string, unknown>[] };
      expect(listJson.locations[0]).not.toHaveProperty("gearEssential");
      expect(listJson.locations[0]).not.toHaveProperty("gearOptional");

      const detailRes = await req(app, `/v1/locations/${loc.id}`);
      const detailJson = await detailRes.json() as { location: Record<string, unknown> };
      expect(detailJson.location).not.toHaveProperty("gearEssential");
      expect(detailJson.location).not.toHaveProperty("gearOptional");
    });
  });
});
