/**
 * #202 尾款：activity-posts 真实装配断言
 *
 * Martin 要求（msg=eb4d0b02）：必须穿过 index.ts 的真实挂载。
 * 直接 import index.ts 的 default handler，通过 handler.fetch() 打真实路由。
 *
 * 方案：mock generate-share-image.ts（含 resvg.wasm 顶层导入），
 * 阻止 wasm 文件进入模块图。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestDb } from "../helpers/db";
import { generateId } from "../../lib/id";
import * as schema from "../../db/schema";

let testDb: ReturnType<typeof createTestDb>["db"];
let currentSession: { user: { id: string; email: string; name: string } } | null = null;

// mock wasm 源头：generate-share-image 顶层 import resvg.wasm
vi.mock("../../services/share-image/generate-share-image", () => ({
  generatePreviewImage: vi.fn(async () => new Uint8Array()),
  generateLocationImage: vi.fn(async () => new Uint8Array()),
  generateTeamImage: vi.fn(async () => new Uint8Array()),
  generateStoryImage: vi.fn(async () => new Uint8Array()),
}));

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: { getSession: async () => currentSession },
  }),
}));

vi.mock("../../db", () => ({
  createDb: () => testDb,
}));

vi.mock("../../lib/cache", () => ({
  getCachedOrFetch: (_key: string, fn: () => Promise<unknown>) => fn(),
  buildListCacheKey: (type: string) => type,
  setPublicCacheHeaders: () => {},
}));

const { default: handler } = await import("../../index");

function setSession(user: { id: string; email: string; name: string } | null) {
  currentSession = user ? { user } : null;
}

async function req(path: string, options: RequestInit = {}) {
  return handler.fetch(new Request(`http://localhost${path}`, options), {
    DB: testDb,
  } as never);
}

describe("activity-posts 真实装配（穿透 index.ts）", () => {
  let teamId = "";
  let locationId = "";

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    currentSession = null;

    const cityId = generateId();
    await testDb.insert(schema.cities).values({
      id: cityId, adcode: "110000", name: "北京", level: "city",
      isHot: true, createdAt: new Date(), updatedAt: new Date(),
    });

    const locId = generateId();
    locationId = locId;
    await testDb.insert(schema.locations).values({
      id: locId, name: "Test", slug: `t-${generateId()}`,
      description: "T", cityId, cityName: "北京", bestSeason: "spring",
      coverImage: "", images: "[]", coordinates: "{}",
      createdAt: new Date(), updatedAt: new Date(),
    });

    const uid1 = generateId();
    const uid2 = generateId();
    await testDb.insert(schema.users).values([
      { id: uid1, name: "L", email: "l@test.com", role: "user", status: "active", level: "beginner", emailVerified: false, createdAt: new Date(), updatedAt: new Date() },
      { id: uid2, name: "M", email: "m@test.com", role: "user", status: "active", level: "beginner", emailVerified: false, createdAt: new Date(), updatedAt: new Date() },
    ]);

    const tid = generateId();
    teamId = tid;
    const now = new Date();
    await testDb.insert(schema.teams).values({
      id: tid, locationId: locId, leaderId: uid1,
      title: "T", icon: "⛰️", maxMembers: 10, durationMin: 240,
      startTime: now, endTime: new Date(now.getTime() + 86400000),
      status: "completed", createdAt: now, updatedAt: now,
    });
    await testDb.insert(schema.teamMembers).values([
      { id: generateId(), teamId: tid, userId: uid1, status: "approved", joinedAt: now, createdAt: now },
      { id: generateId(), teamId: tid, userId: uid2, status: "approved", joinedAt: now, createdAt: now },
    ]);
  });

  it("GET /teams/:id/activity-posts → 200（修复后正确路径）", async () => {
    const res = await req(`/teams/${teamId}/activity-posts?limit=50`);
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.success).toBe(true);
  });

  it("旧双前缀 /activity-posts/teams/:id/activity-posts → 404（不可复用）", async () => {
    const res = await req(`/activity-posts/teams/${teamId}/activity-posts`);
    expect(res.status).toBe(404);
  });

  it("GET /locations/:id/activity-posts → 200（地点维度）", async () => {
    const res = await req(`/locations/${locationId}/activity-posts?limit=50`);
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.success).toBe(true);
  });

  it("POST /teams/:id/activity-posts（未登录）→ 401", async () => {
    setSession(null);
    const res = await req(`/teams/${teamId}/activity-posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /teams/:id/activity-posts（登录成员）→ 200", async () => {
    const member = await testDb.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "m@test.com"),
    });
    setSession({ id: member!.id, email: member!.email, name: member!.name });
    const res = await req(`/teams/${teamId}/activity-posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello from real mount" }),
    });
    expect(res.status).toBe(200);
  });
});
