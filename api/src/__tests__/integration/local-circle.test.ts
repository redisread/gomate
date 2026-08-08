/**
 * P0-D T1 (task #175) — 本地圈子服务层集成测试
 *
 * spec 参考：notes/gomate-p0d-local-circle-spec-v1.2.md §7 test case 清单
 *
 * 覆盖 8 case（Martin msg=82a5ffff 5 边界 + 2 assertion + Martin msg=6d046a06 tie-breaker）：
 *   Case 1 — score cap 3.0：单用户 4 源全命中 (1.0+0.1+1.5+1.0=3.6) → 单 (user,location) contribution capped 3.0
 *   Case 2 — cancelled 排除窄义：team.status='cancelled' → PRIMARY 0 signal
 *   Case 3 — 7d 窗口边界：end_time = now-8d 不计入；created_at = now-6d23h 计入
 *   Case 4 — 空态：city 内 0 signal → topLocations=[] / activePeopleCount=0
 *   Case 5 — entityType 泛化：favorites entityType='story'/'team' 不误计 SECONDARY
 *   Case 6 — tie-breaker signal_ts：同 score+同 visitor_count → latest signal_ts DESC 排前（Martin msg=6d046a06）
 *   Case 7 — assertion：activity_posts 关联 cancelled team → SUPPLEMENTARY 仍计入（activity_posts 独立于 team.status，spec §3.3 拍板）
 *   Case 8 — assertion：stories.location_id IS NULL baseline → 不进 signals（spec §3.3 NOT NULL 过滤）
 *
 * 测试环境使用 better-sqlite3 in-memory DB（helpers/db.ts），mock createDb 让 service 直接拿到 testDb。
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { seedUser, seedCity, seedLocation, seedTeam, seedTeamMember, seedStory } from "../helpers/seed";
import * as schema from "../../db/schema";
import type { TestDb } from "../helpers/db";

// ==================== Mock 策略 ====================

let testDb: TestDb;

vi.mock("../../db", () => ({
  createDb: (_d1: unknown) => testDb,
}));

// service dynamic import 在 vi.mock 之后
async function loadService() {
  return await import("../../services/local-circle");
}

// ==================== 本地 seed helpers（seed.ts 尚未覆盖） ====================

let localCounter = 1;
function genId(prefix = "id") {
  return `${prefix}_${localCounter++}_${Date.now()}`;
}

async function seedFavorite(
  db: TestDb,
  userId: string,
  entityType: string,
  entityId: string,
  createdAt: Date
): Promise<schema.UserFavorite> {
  const id = genId("fav");
  await db.insert(schema.userFavorites).values({
    id, userId, entityType, entityId, createdAt,
  });
  const [inserted] = await db
    .select()
    .from(schema.userFavorites)
    .where(eq(schema.userFavorites.id, id));
  return inserted;
}

async function seedActivityPost(
  db: TestDb,
  teamId: string,
  authorId: string,
  locationId: string | null,
  createdAt: Date,
  status: "visible" | "hidden" | "deleted" = "visible"
): Promise<schema.ActivityPost> {
  const id = genId("post");
  await db.insert(schema.activityPosts).values({
    id, teamId, locationId, authorId,
    content: "test post", images: JSON.stringify([]),
    status, createdAt, updatedAt: createdAt,
  });
  return { id, teamId, locationId, authorId, content: "test post",
    images: JSON.stringify([]), status, createdAt, updatedAt: createdAt,
  } as schema.ActivityPost;
}

// PRIMARY signal 要求 team.end_time > windowStart AND end_time <= now（team 7d 内已结束）
// helpers/seed.ts 的 seedTeam 默认 futureTime，我们要过去时间 team，直接 override
async function seedPastTeam(
  db: TestDb,
  leaderId: string,
  locationId: string,
  endTime: Date,
  status: schema.TeamStatus = "completed"
) {
  const startTime = new Date(endTime.getTime() - 4 * 60 * 60 * 1000);
  return await seedTeam(db, leaderId, locationId, {
    startTime, endTime, status,
  });
}

// ==================== 测试主体 ====================

describe("local-circle service — getLocalCircleHome", () => {
  const NOW = 1_700_000_000_000; // 固定时间基准（避免真实 Date.now 漂移）
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;

  let city: schema.City;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    localCounter = 1;
    city = await seedCity(testDb, { name: "深圳", adcode: "440300" });
  });

  // ==================== Case 1: score cap 3.0 ====================
  it("Case 1 — score cap 3.0：单用户 4 源全命中 → contribution 单 (user,location) 上限 3.0", async () => {
    const user = await seedUser(testDb);
    const location = await seedLocation(testDb, city.id);

    // PRIMARY 1.0
    const team = await seedPastTeam(testDb, user.id, location.id, new Date(NOW - 3 * DAY), "completed");
    await seedTeamMember(testDb, team.id, user.id, "approved");
    // SECONDARY 0.1
    await seedFavorite(testDb, user.id, "location", location.id, new Date(NOW - 2 * DAY));
    // SUPPLEMENTARY story 1.5
    await seedStory(testDb, user.id, { locationId: location.id, status: "published", createdAt: new Date(NOW - 1 * DAY) });
    // SUPPLEMENTARY activity_post 1.0
    await seedActivityPost(testDb, team.id, user.id, location.id, new Date(NOW - 1 * DAY));

    const { getLocalCircleHome } = await loadService();
    const result = await getLocalCircleHome({
      db: testDb as never, cityId: city.id, currentUserId: null, now: NOW,
    });

    expect(result.topLocations).toHaveLength(1);
    const [top] = result.topLocations;
    expect(top.locationId).toBe(location.id);
    // 1.0+0.1+1.5+1.0 = 3.6 但 cap 3.0
    expect(top.visitScore).toBeCloseTo(3.0, 6);
    expect(top.uniqueVisitors).toBe(1);
    expect(result.activePeopleCount).toBe(1);
  });

  // ==================== Case 2: cancelled 排除 ====================
  it("Case 2 — cancelled 排除窄义：team.status='cancelled' → PRIMARY 0 signal", async () => {
    const user = await seedUser(testDb);
    const location = await seedLocation(testDb, city.id);

    const team = await seedPastTeam(testDb, user.id, location.id, new Date(NOW - 3 * DAY), "cancelled");
    await seedTeamMember(testDb, team.id, user.id, "approved");

    const { getLocalCircleHome } = await loadService();
    const result = await getLocalCircleHome({
      db: testDb as never, cityId: city.id, currentUserId: null, now: NOW,
    });

    expect(result.topLocations).toHaveLength(0);
    expect(result.activePeopleCount).toBe(0);
  });

  // ==================== Case 3: 7d 窗口边界 ====================
  it("Case 3 — 7d 窗口边界：end_time = now-8d 排除；favorite created_at = now-6d23h 计入", async () => {
    const user = await seedUser(testDb);
    const location = await seedLocation(testDb, city.id);

    // 队伍 8 天前结束 → 排除
    const staleTeam = await seedPastTeam(testDb, user.id, location.id, new Date(NOW - 8 * DAY), "completed");
    await seedTeamMember(testDb, staleTeam.id, user.id, "approved");

    // favorite 6d23h 前 → 计入
    await seedFavorite(testDb, user.id, "location", location.id, new Date(NOW - (6 * DAY + 23 * HOUR)));

    const { getLocalCircleHome } = await loadService();
    const result = await getLocalCircleHome({
      db: testDb as never, cityId: city.id, currentUserId: null, now: NOW,
    });

    expect(result.topLocations).toHaveLength(1);
    // 仅 favorite 计分：0.1
    expect(result.topLocations[0].visitScore).toBeCloseTo(0.1, 6);
    expect(result.activePeopleCount).toBe(1);
  });

  // ==================== Case 4: 空态 ====================
  it("Case 4 — 空态：city 内 0 signal → topLocations=[] / activePeopleCount=0", async () => {
    await seedLocation(testDb, city.id); // 有地点但无 signal
    const { getLocalCircleHome } = await loadService();
    const result = await getLocalCircleHome({
      db: testDb as never, cityId: city.id, currentUserId: null, now: NOW,
    });
    expect(result.topLocations).toEqual([]);
    expect(result.activePeopleCount).toBe(0);
    expect(result.neighborTeams).toEqual([]);
    expect(result.cityName).toBe("深圳");
  });

  // ==================== Case 5: entityType 泛化 ====================
  it("Case 5 — entityType 泛化：favorites entity_type='story'/'team' 不误计 SECONDARY", async () => {
    const user = await seedUser(testDb);
    const location = await seedLocation(testDb, city.id);
    // 用 location.id 作 entity_id，但 type 不是 'location'
    await seedFavorite(testDb, user.id, "story", location.id, new Date(NOW - 1 * DAY));
    await seedFavorite(testDb, user.id, "team", location.id, new Date(NOW - 1 * DAY));

    const { getLocalCircleHome } = await loadService();
    const result = await getLocalCircleHome({
      db: testDb as never, cityId: city.id, currentUserId: null, now: NOW,
    });
    expect(result.topLocations).toHaveLength(0);
    expect(result.activePeopleCount).toBe(0);
  });

  // ==================== Case 6: tie-breaker signal_ts ====================
  it("Case 6 — tie-breaker：同 score+同 visitor_count → latest signal_ts DESC 排前", async () => {
    const userA = await seedUser(testDb, { name: "UserA" });
    const userB = await seedUser(testDb, { name: "UserB" });
    const locA = await seedLocation(testDb, city.id, { name: "LocA" });
    const locB = await seedLocation(testDb, city.id, { name: "LocB" });

    // A 收藏 locA：更早
    await seedFavorite(testDb, userA.id, "location", locA.id, new Date(NOW - 5 * DAY));
    // B 收藏 locB：更晚
    await seedFavorite(testDb, userB.id, "location", locB.id, new Date(NOW - 1 * DAY));

    const { getLocalCircleHome } = await loadService();
    const result = await getLocalCircleHome({
      db: testDb as never, cityId: city.id, currentUserId: null, now: NOW,
    });

    expect(result.topLocations).toHaveLength(2);
    // 同 score (0.1) 同 visitor_count (1) → newer signal_ts 排前 → LocB 排前
    expect(result.topLocations[0].locationId).toBe(locB.id);
    expect(result.topLocations[1].locationId).toBe(locA.id);
    expect(result.topLocations[0].visitScore).toBeCloseTo(0.1, 6);
    expect(result.topLocations[1].visitScore).toBeCloseTo(0.1, 6);
  });

  // ==================== Case 7: activity_posts 独立于 team.status ====================
  it("Case 7 — assertion：activity_posts 关联 cancelled team → SUPPLEMENTARY 仍计入（独立于 team.status）", async () => {
    const user = await seedUser(testDb);
    const location = await seedLocation(testDb, city.id);
    // team cancelled：PRIMARY 不计
    const team = await seedPastTeam(testDb, user.id, location.id, new Date(NOW - 3 * DAY), "cancelled");
    await seedTeamMember(testDb, team.id, user.id, "approved");
    // 但 activity_post visible & 7d 内：SUPPLEMENTARY 计入
    await seedActivityPost(testDb, team.id, user.id, location.id, new Date(NOW - 1 * DAY), "visible");

    const { getLocalCircleHome } = await loadService();
    const result = await getLocalCircleHome({
      db: testDb as never, cityId: city.id, currentUserId: null, now: NOW,
    });

    expect(result.topLocations).toHaveLength(1);
    // 仅 activity_post：1.0（PRIMARY 因 cancelled 排除）
    expect(result.topLocations[0].visitScore).toBeCloseTo(1.0, 6);
    expect(result.activePeopleCount).toBe(1);
  });

  // ==================== Case 8: stories.location_id IS NULL ====================
  it("Case 8 — assertion：stories.location_id IS NULL → 不进 signals（NOT NULL 过滤）", async () => {
    const user = await seedUser(testDb);
    const location = await seedLocation(testDb, city.id);

    // story location_id = NULL：应被 SQL WHERE location_id IS NOT NULL 过滤
    await seedStory(testDb, user.id, { locationId: null, status: "published", createdAt: new Date(NOW - 1 * DAY) });
    // 也放一条 legit favorite 让 city 有 signal，验证 IS NULL story 未误计
    await seedFavorite(testDb, user.id, "location", location.id, new Date(NOW - 1 * DAY));

    const { getLocalCircleHome } = await loadService();
    const result = await getLocalCircleHome({
      db: testDb as never, cityId: city.id, currentUserId: null, now: NOW,
    });

    expect(result.topLocations).toHaveLength(1);
    // 仅 favorite 0.1（story 因 IS NULL 未计）
    expect(result.topLocations[0].visitScore).toBeCloseTo(0.1, 6);
  });

  // ==================== Case 9: cityName fallback「你的城市」====================
  it("Case 9 — assertion：cityId 不存在 → 200 空态 + cityName='你的城市' fallback（Martin+Steven N3 拍板）", async () => {
    const { getLocalCircleHome } = await loadService();
    const result = await getLocalCircleHome({
      db: testDb as never, cityId: "city_does_not_exist", currentUserId: null, now: NOW,
    });
    expect(result.cityName).toBe("你的城市");
    expect(result.topLocations).toEqual([]);
    expect(result.neighborTeams).toEqual([]);
    expect(result.activePeopleCount).toBe(0);
  });
});

// ==================== Route 层：cityId 缺省 fallback 深圳（方案 a）====================
// Martin PR #406 NIT 方案 a：cityId 可选，缺省/空串 → 服务端 fallback 深圳（省前端 /cities 往返）。
// service mock createDb 返回 testDb，route 走真实 fallback 查询。
describe("local-circle route — GET /local-circle/home（cityId 缺省 fallback）", () => {
  beforeEach(() => {
    // 每个 route case 独立 fresh DB（不依赖 service describe 的 beforeEach）
    const fresh = createTestDb();
    testDb = fresh.db;
    localCounter = 1;
  });

  it("无 cityId 参数 → fallback 深圳 → 200", async () => {
    await seedCity(testDb, { name: "深圳", adcode: "440300" });
    const { Hono } = await import("hono");
    const { localCircleHomeRoute } = await import("../../routes/local-circle/home");
    const app = new Hono();
    app.route("/", localCircleHomeRoute);
    const res = await app.fetch(new Request("http://localhost/?"), { DB: {}, GOMATE_KV: null } as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { cityName: string };
    expect(body.cityName).toBe("深圳");
  }, 10_000);

  it("cityId= 空串 → fallback 深圳 → 200（方案 a：空串与缺省一视同仁）", async () => {
    await seedCity(testDb, { name: "深圳", adcode: "440300" });
    const { Hono } = await import("hono");
    const { localCircleHomeRoute } = await import("../../routes/local-circle/home");
    const app = new Hono();
    app.route("/", localCircleHomeRoute);
    const res = await app.fetch(new Request("http://localhost/?cityId="), { DB: {}, GOMATE_KV: null } as never);
    expect(res.status).toBe(200);
  });

  it("无 cityId 且无默认城市（深圳不存在）→ 400", async () => {
    // testDb 此 case 无深圳 city → fallback 查询空 → 400
    const { Hono } = await import("hono");
    const { localCircleHomeRoute } = await import("../../routes/local-circle/home");
    const app = new Hono();
    app.route("/", localCircleHomeRoute);
    const res = await app.fetch(new Request("http://localhost/?"), { DB: {}, GOMATE_KV: null } as never);
    expect(res.status).toBe(400);
  });
});

// ==================== #184：KV cache SWR 复评 ====================
describe("local-circle cache — #184 SWR（fresh 5min / stale 60min）", () => {
  const NOW = 1_700_000_000_000;
  const MIN = 60 * 1000;

  /** Map 版 fake KV（仅实现本测试用到的 get/put） */
  function fakeKv() {
    const store = new Map<string, string>();
    return {
      store,
      get: async (key: string) => store.get(key) ?? null,
      put: async (key: string, value: string) => void store.set(key, value),
    } as unknown as KVNamespace & { store: Map<string, string> };
  }

  function cachedEntry(cityId: string, storedAt: number, cityName = "缓存城") {
    return JSON.stringify({
      data: { cityId, cityName, activePeopleCount: 99, topLocations: [], neighborTeams: [] },
      storedAt,
    });
  }

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
  });

  it("fresh 窗口内（<5min）→ 直接返回缓存，不重算", async () => {
    const svc = await loadService();
    const kv = fakeKv();
    const city = await seedCity(testDb, { name: "深圳", adcode: "440300" });
    kv.store.set(`local-circle:v2:${city.id}`, cachedEntry(city.id, NOW - 1 * MIN));

    const result = await svc.getLocalCircleHome({ db: testDb as never, kv, cityId: city.id, now: NOW });

    expect(result.cityName).toBe("缓存城"); // 缓存值而非 DB 值
    expect(result.activePeopleCount).toBe(99);
  });

  it("stale 窗口（5~60min）+ waitUntil → 先返回 stale，后台重算回写新数据", async () => {
    const svc = await loadService();
    const kv = fakeKv();
    const city = await seedCity(testDb, { name: "深圳", adcode: "440300" });
    const key = `local-circle:v2:${city.id}`;
    kv.store.set(key, cachedEntry(city.id, NOW - 10 * MIN));

    const background: Promise<unknown>[] = [];
    const result = await svc.getLocalCircleHome({
      db: testDb as never, kv, cityId: city.id, now: NOW,
      waitUntil: (p) => background.push(p),
    });

    // 先返回 stale 数据
    expect(result.cityName).toBe("缓存城");
    expect(background.length).toBe(1);

    // 后台重算完成 → 缓存被刷新为 DB 实算值 + 新 storedAt
    await Promise.all(background);
    const refreshed = JSON.parse(kv.store.get(key)!) as { data: { cityName: string }; storedAt: number };
    expect(refreshed.data.cityName).toBe("深圳");
    expect(refreshed.storedAt).toBe(NOW);
  });

  it("stale 窗口但无 waitUntil → 同步重算返回新数据", async () => {
    const svc = await loadService();
    const kv = fakeKv();
    const city = await seedCity(testDb, { name: "深圳", adcode: "440300" });
    kv.store.set(`local-circle:v2:${city.id}`, cachedEntry(city.id, NOW - 10 * MIN));

    const result = await svc.getLocalCircleHome({ db: testDb as never, kv, cityId: city.id, now: NOW });

    expect(result.cityName).toBe("深圳"); // 实算而非 stale
  });

  it("cache miss → 同步实算 + 写入 SWR entry 格式 {data, storedAt}", async () => {
    const svc = await loadService();
    const kv = fakeKv();
    const city = await seedCity(testDb, { name: "深圳", adcode: "440300" });

    const result = await svc.getLocalCircleHome({ db: testDb as never, kv, cityId: city.id, now: NOW });

    expect(result.cityName).toBe("深圳");
    const written = JSON.parse(kv.store.get(`local-circle:v2:${city.id}`)!) as {
      data: { cityName: string }; storedAt: number;
    };
    expect(written.data.cityName).toBe("深圳");
    expect(written.storedAt).toBe(NOW);
  });
});
