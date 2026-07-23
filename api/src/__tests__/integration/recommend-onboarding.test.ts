/**
 * P1-1 T1 (task #187) — GET /teams/recommend-onboarding 集成测试
 *
 * spec: notes/gomate-p1-1-onboarding-spec.md v1.2 §5.1 / §9.3 / §11 T1 验收清单
 *
 * 覆盖：
 *   Case 1 — 未登录 401（hasAnyMembership 依赖 session，spec §9.3）
 *   Case 2 — type 过滤命中（hiking 只回 hiking 地点的队伍）
 *   Case 3 — 深圳 fallback：user.city = null → 用深圳 cityId（spec §5.1 主路径）
 *   Case 4 — user.city 非空 → 用用户城市（深圳队伍不出现在结果）
 *   Case 5 — 满员排除：approvedCount >= maxMembers 不进池
 *   Case 6 — fallbackNoType：type 过滤后为空 → 自动去过滤重查 + 标记 true
 *   Case 7 — hasAnyMembership 真假两态（spec §9.3 字面：任何状态 membership 都算）
 *   Case 8 — 14 天窗口：startTime 过去 / >14d 排除；非 recruiting 排除
 *   Case 9 — 排序：startTime asc 优先，approvedCount desc 次之（spec §5.1）
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { seedUser, seedCity, seedLocation, seedTeam, seedTeamMember } from "../helpers/seed";
import type { TestDb } from "../helpers/db";

// ===== Mock 策略（同 teams.test.ts）=====

let currentSession: { user: { id: string; email: string; name: string } } | null = null;
let testDb: TestDb;

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

const { teamsRoute } = await import("../../routes/teams");

const DAY = 24 * 60 * 60 * 1000;

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/teams", teamsRoute);
  return app;
}

async function req(app: ReturnType<typeof createApp>, path: string): Promise<Response> {
  return app.fetch(new Request(`http://localhost${path}`), { DB: {} });
}

interface Candidate {
  id: string;
  title: string;
  startTime: number;
  maxMembers: number;
  approvedCount: number;
  locationName: string;
  cityName: string;
  locationType: string | null;
}

interface RecommendResponse {
  hasAnyMembership: boolean;
  candidates: Candidate[];
  fallbackNoType: boolean;
  cityId: string | null;
}

describe("GET /teams/recommend-onboarding (task #187)", () => {
  let app: ReturnType<typeof createApp>;
  let user: Awaited<ReturnType<typeof seedUser>>;
  let shenzhen: Awaited<ReturnType<typeof seedCity>>;
  let gz: Awaited<ReturnType<typeof seedCity>>;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;

    user = await seedUser(testDb, { name: "新用户", wechat: "new_user_wx" });
    shenzhen = await seedCity(testDb, { name: "深圳", adcode: "440300" });
    gz = await seedCity(testDb, { name: "广州", adcode: "440100" });
  });

  function login(u = user) {
    currentSession = { user: { id: u.id, email: u.email, name: u.name } };
  }

  async function callApi(path = "/teams/recommend-onboarding"): Promise<RecommendResponse> {
    const res = await req(app, path);
    expect(res.status).toBe(200);
    return (await res.json()) as RecommendResponse;
  }

  it("Case 1 — 未登录 → 401", async () => {
    const res = await req(app, "/teams/recommend-onboarding");
    expect(res.status).toBe(401);
  });

  it("Case 2 — type 过滤命中：hiking 只回 hiking", async () => {
    const hikingLoc = await seedLocation(testDb, shenzhen.id, { name: "塘朗山", type: "hiking" });
    const leisureLoc = await seedLocation(testDb, shenzhen.id, { name: "深圳湾", type: "leisure" });
    await seedTeam(testDb, user.id, hikingLoc.id, { title: "徒步队" });
    await seedTeam(testDb, user.id, leisureLoc.id, { title: "休闲队" });
    login();

    const body = await callApi("/teams/recommend-onboarding?type=hiking");
    expect(body.candidates.map((c) => c.title)).toEqual(["徒步队"]);
    expect(body.candidates[0]!.locationType).toBe("hiking");
    expect(body.candidates[0]!.cityName).toBe("深圳");
    expect(body.fallbackNoType).toBe(false);
    expect(body.cityId).toBe(shenzhen.id);
  });

  it("Case 3 — 深圳 fallback：user.city = null → 用深圳", async () => {
    const szLoc = await seedLocation(testDb, shenzhen.id, { name: "塘朗山", type: "hiking" });
    const gzLoc = await seedLocation(testDb, gz.id, { name: "白云山", type: "hiking" });
    await seedTeam(testDb, user.id, szLoc.id, { title: "深圳队" });
    await seedTeam(testDb, user.id, gzLoc.id, { title: "广州队" });
    login(); // user.city 未设（null）

    const body = await callApi();
    expect(body.cityId).toBe(shenzhen.id);
    expect(body.candidates.map((c) => c.title)).toEqual(["深圳队"]);
  });

  it("Case 4 — user.city 非空 → 用用户城市（不走深圳）", async () => {
    const szLoc = await seedLocation(testDb, shenzhen.id, { name: "塘朗山", type: "hiking" });
    const gzLoc = await seedLocation(testDb, gz.id, { name: "白云山", type: "hiking" });
    await seedTeam(testDb, user.id, szLoc.id, { title: "深圳队" });
    await seedTeam(testDb, user.id, gzLoc.id, { title: "广州队" });
    const gzUser = await seedUser(testDb, { name: "广州用户", city: gz.id });
    login(gzUser);

    const body = await callApi();
    expect(body.cityId).toBe(gz.id);
    expect(body.candidates.map((c) => c.title)).toEqual(["广州队"]);
  });

  it("Case 5 — 满员排除：approvedCount >= maxMembers 不进池", async () => {
    const loc = await seedLocation(testDb, shenzhen.id, { name: "塘朗山", type: "hiking" });
    const fullTeam = await seedTeam(testDb, user.id, loc.id, { title: "满员队", maxMembers: 1 });
    const other = await seedUser(testDb, { name: "队员A" });
    await seedTeamMember(testDb, fullTeam.id, other.id, "approved");
    await seedTeam(testDb, user.id, loc.id, { title: "有空位队", maxMembers: 5 });
    login();

    const body = await callApi();
    expect(body.candidates.map((c) => c.title)).toEqual(["有空位队"]);
    expect(body.candidates[0]!.approvedCount).toBe(0);
  });

  it("Case 6 — fallbackNoType：type 死胡同 → 自动去过滤 + 标记", async () => {
    const leisureLoc = await seedLocation(testDb, shenzhen.id, { name: "深圳湾", type: "leisure" });
    await seedTeam(testDb, user.id, leisureLoc.id, { title: "休闲队" });
    login();

    const body = await callApi("/teams/recommend-onboarding?type=travel");
    expect(body.fallbackNoType).toBe(true);
    expect(body.candidates.map((c) => c.title)).toEqual(["休闲队"]);
  });

  it("Case 6b — type 死胡同且去过滤也为空 → 空池 + fallbackNoType=false", async () => {
    login();

    const body = await callApi("/teams/recommend-onboarding?type=travel");
    expect(body.fallbackNoType).toBe(false);
    expect(body.candidates).toEqual([]);
  });

  it("Case 7 — hasAnyMembership 真假两态（v1.2.1：approved/pending 算，rejected 不算）", async () => {
    login();
    const before = await callApi();
    expect(before.hasAnyMembership).toBe(false);

    const loc = await seedLocation(testDb, shenzhen.id, { name: "塘朗山", type: "hiking" });
    const team = await seedTeam(testDb, user.id, loc.id);

    // rejected 记录不算（这类用户正是引导目标，Martin CR R1）
    await seedTeamMember(testDb, team.id, user.id, "rejected");
    const afterRejected = await callApi();
    expect(afterRejected.hasAnyMembership).toBe(false);

    // pending 记录算
    const team2 = await seedTeam(testDb, user.id, loc.id, { title: "另一队" });
    await seedTeamMember(testDb, team2.id, user.id, "pending");
    const afterPending = await callApi();
    expect(afterPending.hasAnyMembership).toBe(true);
  });

  it("Case 8 — 窗口与状态：过去 / >14d / 非 recruiting 全排除", async () => {
    const loc = await seedLocation(testDb, shenzhen.id, { name: "塘朗山", type: "hiking" });
    const now = Date.now();
    await seedTeam(testDb, user.id, loc.id, { title: "过去的队", startTime: new Date(now - DAY) });
    await seedTeam(testDb, user.id, loc.id, { title: "太远的队", startTime: new Date(now + 15 * DAY) });
    await seedTeam(testDb, user.id, loc.id, { title: "已满的队", status: "full", startTime: new Date(now + 3 * DAY) });
    await seedTeam(testDb, user.id, loc.id, { title: "窗口内队", startTime: new Date(now + 3 * DAY) });
    login();

    const body = await callApi();
    expect(body.candidates.map((c) => c.title)).toEqual(["窗口内队"]);
  });

  it("Case 9 — 排序：startTime asc 优先，approvedCount desc 次之", async () => {
    const loc = await seedLocation(testDb, shenzhen.id, { name: "塘朗山", type: "hiking" });
    const now = Date.now();
    const later = await seedTeam(testDb, user.id, loc.id, { title: "后天出发", startTime: new Date(now + 2 * DAY) });
    const soonerFew = await seedTeam(testDb, user.id, loc.id, { title: "明天出发人少", startTime: new Date(now + DAY) });
    const soonerMany = await seedTeam(testDb, user.id, loc.id, { title: "明天出发人多", startTime: new Date(now + DAY) });
    const m1 = await seedUser(testDb, { name: "M1" });
    const m2 = await seedUser(testDb, { name: "M2" });
    await seedTeamMember(testDb, soonerMany.id, m1.id, "approved");
    await seedTeamMember(testDb, soonerMany.id, m2.id, "approved");
    await seedTeamMember(testDb, soonerFew.id, m1.id, "approved");
    await seedTeamMember(testDb, later.id, m1.id, "approved");
    login();

    const body = await callApi();
    expect(body.candidates.map((c) => c.title)).toEqual(["明天出发人多", "明天出发人少", "后天出发"]);
  });
});
