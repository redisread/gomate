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

// P0-B T2 (#169): mock computeTransportation 避免真调 amap
const computeTransportationMock = vi.fn();
vi.mock("../../lib/amap-decision", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/amap-decision")>();
  return {
    ...actual,
    computeTransportation: (input: unknown) => computeTransportationMock(input),
  };
});

const { locationsRoute } = await import("../../routes/locations");

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/locations", locationsRoute);
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
  describe("GET /locations/:id/transportation - 交通决策数据", () => {
    beforeEach(() => {
      computeTransportationMock.mockReset();
    });

    it("不存在的地点返回 404", async () => {
      const res = await req(app, "/locations/does-not-exist/transportation");
      expect(res.status).toBe(404);
      expect(computeTransportationMock).not.toHaveBeenCalled();
    });

    it("无效坐标 {lat:0,lng:0} → amapAllFailed=true 且不调 amap", async () => {
      const loc = await seedLocation(testDb, city.id, {
        name: "无坐标点",
        coordinates: JSON.stringify({ lat: 0, lng: 0 }),
      });

      const res = await req(app, `/locations/${loc.id}/transportation`);
      expect(res.status).toBe(200);
      const json = await res.json() as {
        success: boolean;
        locationId: string;
        transportation: { mapUrl: string; subway: unknown; driving: unknown; amapAllFailed: boolean };
        meta: { cacheHit: boolean; staleDays: number | null };
      };
      expect(json.success).toBe(true);
      expect(json.locationId).toBe(loc.id);
      expect(json.transportation.amapAllFailed).toBe(true);
      expect(json.transportation.subway).toBeNull();
      expect(json.transportation.driving).toBeNull();
      expect(json.meta.cacheHit).toBe(false);
      expect(computeTransportationMock).not.toHaveBeenCalled();
    });

    it("有坐标 + 无 AMAP_SERVER_KEY → 只返 mapUrl", async () => {
      const loc = await seedLocation(testDb, city.id, {
        name: "梧桐山",
        coordinates: JSON.stringify({ lat: 22.5478, lng: 114.0596 }),
      });

      const res = await req(app, `/locations/${loc.id}/transportation`);
      expect(res.status).toBe(200);
      const json = await res.json() as {
        transportation: { mapUrl: string; subway: unknown; driving: unknown; amapAllFailed: boolean };
      };
      expect(json.transportation.mapUrl).toContain("uri.amap.com");
      expect(json.transportation.subway).toBeNull();
      expect(json.transportation.driving).toBeNull();
      expect(json.transportation.amapAllFailed).toBe(true);
      expect(computeTransportationMock).not.toHaveBeenCalled();
    });

    it("支持 slug 访问", async () => {
      const loc = await seedLocation(testDb, city.id, {
        name: "梧桐山",
        slug: "wutong-mountain-tp",
        coordinates: JSON.stringify({ lat: 22.5478, lng: 114.0596 }),
      });

      const res = await req(app, "/locations/wutong-mountain-tp/transportation");
      expect(res.status).toBe(200);
      const json = await res.json() as { locationId: string };
      expect(json.locationId).toBe(loc.id);
    });

    it("有 amapKey + 无 KV → 走 computeTransportation 返回完整数据", async () => {
      const loc = await seedLocation(testDb, city.id, {
        name: "梅林关",
        coordinates: JSON.stringify({ lat: 22.5478, lng: 114.0596 }),
      });

      computeTransportationMock.mockResolvedValueOnce({
        mapUrl: "https://uri.amap.com/marker?position=114.059600%2C22.547800",
        subway: {
          station: "梅林关",
          lines: ["4号线"],
          distanceMeters: 300,
          walkMinutes: 3,
          approximate: false,
        },
        driving: {
          distanceKm: 12,
          durationMinutes: 20,
          referencePointLabel: { zh: "深圳市中心", en: "Shenzhen City Center", ja: "深圳市中心" },
        },
        amapAllFailed: false,
      });

      const res = await req(
        app,
        `/locations/${loc.id}/transportation`,
        {},
        { AMAP_SERVER_KEY: "test-key" },
      );
      expect(res.status).toBe(200);
      const json = await res.json() as {
        transportation: {
          subway: { station: string } | null;
          driving: { distanceKm: number } | null;
          amapAllFailed: boolean;
        };
        meta: { cacheHit: boolean; staleDays: number | null };
      };
      expect(json.transportation.subway?.station).toBe("梅林关");
      expect(json.transportation.driving?.distanceKm).toBe(12);
      expect(json.transportation.amapAllFailed).toBe(false);
      expect(json.meta.cacheHit).toBe(false);
      expect(json.meta.staleDays).toBeNull();
      expect(computeTransportationMock).toHaveBeenCalledTimes(1);
    });

    it("KV 新鲜命中（<24h）→ cacheHit=true 且不调 amap", async () => {
      const loc = await seedLocation(testDb, city.id, {
        name: "凤凰山",
        coordinates: JSON.stringify({ lat: 22.5478, lng: 114.0596 }),
      });

      const kvStore = new Map<string, string>();
      const freshEntry = {
        version: 1,
        locationId: loc.id,
        computedAt: Date.now() - 60_000, // 1 分钟前
        data: {
          mapUrl: "https://uri.amap.com/marker?fresh",
          subway: { station: "凤凰", lines: ["7号线"], distanceMeters: 400, walkMinutes: 5, approximate: false },
          driving: { distanceKm: 8, durationMinutes: 15, referencePointLabel: { zh: "深圳市中心", en: "SZ", ja: "深圳" } },
          amapAllFailed: false,
        },
      };
      kvStore.set(`p0b:transport:v1:${loc.id}`, JSON.stringify(freshEntry));

      const fakeKv = {
        get: async (k: string) => kvStore.get(k) ?? null,
        put: async () => {},
      };

      const res = await req(
        app,
        `/locations/${loc.id}/transportation`,
        {},
        { AMAP_SERVER_KEY: "test-key", GOMATE_KV: fakeKv },
      );
      expect(res.status).toBe(200);
      const json = await res.json() as {
        transportation: { subway: { station: string } | null };
        meta: { cacheHit: boolean; staleDays: number | null };
      };
      expect(json.meta.cacheHit).toBe(true);
      expect(json.meta.staleDays).toBeNull();
      expect(json.transportation.subway?.station).toBe("凤凰");
      expect(computeTransportationMock).not.toHaveBeenCalled();
    });

    it("KV 陈旧（>7d）+ amap 全挂 → 返回旧缓存 + staleDays 提示", async () => {
      const loc = await seedLocation(testDb, city.id, {
        name: "南山",
        coordinates: JSON.stringify({ lat: 22.5478, lng: 114.0596 }),
      });

      const kvStore = new Map<string, string>();
      const staleEntry = {
        version: 1,
        locationId: loc.id,
        computedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 天前
        data: {
          mapUrl: "https://uri.amap.com/marker?stale",
          subway: { station: "南山", lines: ["1号线"], distanceMeters: 500, walkMinutes: 6, approximate: false },
          driving: null,
          amapAllFailed: false,
        },
      };
      kvStore.set(`p0b:transport:v1:${loc.id}`, JSON.stringify(staleEntry));

      const fakeKv = {
        get: async (k: string) => kvStore.get(k) ?? null,
        put: async () => {},
      };

      // amap 全挂
      computeTransportationMock.mockResolvedValueOnce({
        mapUrl: "https://uri.amap.com/marker?position=114.059600%2C22.547800",
        subway: null,
        driving: null,
        amapAllFailed: true,
      });

      const res = await req(
        app,
        `/locations/${loc.id}/transportation`,
        {},
        { AMAP_SERVER_KEY: "test-key", GOMATE_KV: fakeKv },
      );
      expect(res.status).toBe(200);
      const json = await res.json() as {
        transportation: { subway: { station: string } | null; amapAllFailed: boolean };
        meta: { cacheHit: boolean; staleDays: number | null };
      };
      // 走 stale fallback：拿到的是旧缓存里的数据（subway 有值）
      expect(json.transportation.subway?.station).toBe("南山");
      expect(json.meta.cacheHit).toBe(true);
      expect(json.meta.staleDays).toBeGreaterThanOrEqual(10);
      expect(computeTransportationMock).toHaveBeenCalledTimes(1);
    });

    it("KV 陈旧（>24h < 7d）+ amap 成功 → 走回源并覆盖，staleDays=null", async () => {
      const loc = await seedLocation(testDb, city.id, {
        name: "笔架山",
        coordinates: JSON.stringify({ lat: 22.5478, lng: 114.0596 }),
      });

      const kvStore = new Map<string, string>();
      const staleEntry = {
        version: 1,
        locationId: loc.id,
        computedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 天前
        data: {
          mapUrl: "https://uri.amap.com/marker?old",
          subway: { station: "旧站", lines: ["旧"], distanceMeters: 999, walkMinutes: 99, approximate: false },
          driving: null,
          amapAllFailed: false,
        },
      };
      kvStore.set(`p0b:transport:v1:${loc.id}`, JSON.stringify(staleEntry));

      const putCalls: Array<{ key: string; value: string }> = [];
      const fakeKv = {
        get: async (k: string) => kvStore.get(k) ?? null,
        put: async (k: string, v: string) => {
          putCalls.push({ key: k, value: v });
        },
      };

      computeTransportationMock.mockResolvedValueOnce({
        mapUrl: "https://uri.amap.com/marker?new",
        subway: { station: "笔架", lines: ["9号线"], distanceMeters: 200, walkMinutes: 3, approximate: false },
        driving: { distanceKm: 5, durationMinutes: 10, referencePointLabel: { zh: "深圳市中心", en: "SZ", ja: "深圳" } },
        amapAllFailed: false,
      });

      const res = await req(
        app,
        `/locations/${loc.id}/transportation`,
        {},
        { AMAP_SERVER_KEY: "test-key", GOMATE_KV: fakeKv },
      );
      expect(res.status).toBe(200);
      const json = await res.json() as {
        transportation: { subway: { station: string } | null };
        meta: { cacheHit: boolean; staleDays: number | null };
      };
      expect(json.transportation.subway?.station).toBe("笔架"); // 回源结果
      expect(json.meta.cacheHit).toBe(false);
      expect(json.meta.staleDays).toBeNull();
      expect(computeTransportationMock).toHaveBeenCalledTimes(1);
      // 新数据被写回 KV
      expect(putCalls.length).toBe(1);
      expect(putCalls[0].key).toBe(`p0b:transport:v1:${loc.id}`);
    });
  });

  // ==================== P0-B T4 (task #171): 决策信息 4 字段 CRUD ====================
  describe("P0-B T4: 决策信息（停车 tri-state + 装备 CSV）", () => {
    beforeEach(async () => {
      // admin 会话（seedUser 已插入 admin@test.com）
      const [admin] = await testDb.select().from(schema.users).where(eq(schema.users.email, "admin@test.com"));
      currentSession = { user: { id: admin.id, email: admin.email, name: admin.name } };
    });

    it("POST 创建时接受 4 字段，GET 详情按前端形态回传", async () => {
      const createRes = await req(app, "/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "决策测试",
          description: "包含决策 4 字段的地点，超过十字",
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
      const getJson = await getRes.json() as {
        location: {
          parkingAvailable: boolean | null;
          parkingInfo: string | null;
          gearEssential: string[];
          gearOptional: string[];
        };
      };
      expect(getJson.location.parkingAvailable).toBe(true);
      expect(getJson.location.parkingInfo).toBe("主入口右侧，5 元一次");
      expect(getJson.location.gearEssential).toEqual(["登山鞋", "雨衣"]);
      expect(getJson.location.gearOptional).toEqual(["登山杖"]);
    });

    it("PUT 支持 parkingAvailable=null（信息缺失）与 gear=[]（清空）", async () => {
      const loc = await seedLocation(testDb, city.id, { name: "清空测试" });
      // 先设定值
      await req(app, "/locations", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: loc.id,
          parkingAvailable: false,
          gearEssential: ["Item A"],
        }),
      });
      // 再清空
      const putRes = await req(app, "/locations", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: loc.id,
          parkingAvailable: null,
          gearEssential: [],
        }),
      });
      expect(putRes.status).toBe(200);

      const getRes = await req(app, `/locations/${loc.id}`);
      const getJson = await getRes.json() as {
        location: { parkingAvailable: boolean | null; gearEssential: string[] };
      };
      expect(getJson.location.parkingAvailable).toBeNull();
      expect(getJson.location.gearEssential).toEqual([]);
    });

    it("装备超过 10 项、单项超过 20 字应 400", async () => {
      const tooMany = Array.from({ length: 11 }, (_, i) => `item${i}`);
      const tooLong = "这是一段超过二十个字符的很长很长的装备名称测试";
      const res1 = await req(app, "/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "校验测试", description: "描述至少十个字符长度", cityId: city.id,
          coverImage: "https://example.com/c.jpg",
          gearEssential: tooMany,
        }),
      });
      expect(res1.status).toBe(400);

      const res2 = await req(app, "/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "校验测试2", description: "描述至少十个字符长度", cityId: city.id,
          coverImage: "https://example.com/c.jpg",
          gearOptional: [tooLong],
        }),
      });
      expect(res2.status).toBe(400);
    });
  });
});
