/**
 * activity-posts 挂载路径回归测试（task #202 P0）
 *
 * 教训：activity-posts.test.ts 自建 app.route("/", activityPostsRoutes) 绕过了 index.ts
 * 的真实挂载，导致双前缀 bug 全程测试全绿、prod 全 404。
 *
 * 本测试精确复现 index.ts:54 的挂载方式（app.route("/", activityPostsRoute)），
 * 并验证旧双前缀路径必须 404（防止历史路径复活）。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { eq as _eq } from "drizzle-orm";
import { generateId } from "../../lib/id";
import * as schema from "../../db/schema";

let testDb: ReturnType<typeof createTestDb>["db"];
let currentSession: { user: { id: string; email: string; name: string } } | null = null;

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

const { default: activityPostsRoute } = await import("../../routes/activity-posts");

/** 精确复现 index.ts:54 的挂载：app.route("/", activityPostsRoute) */
function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/", activityPostsRoute);
  return app;
}

async function req(app: ReturnType<typeof createApp>, path: string, options: RequestInit = {}) {
  return app.fetch(new Request(`http://localhost${path}`, options), { DB: {} });
}

function setSession(user: { id: string; email: string; name: string } | null) {
  currentSession = user ? { user } : null;
}

describe("activity-posts 挂载路径回归（防双前缀 bug 重现）", () => {
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

  it("GET /teams/:id/activity-posts → 200", async () => {
    const res = await req(createApp(), `/teams/${teamId}/activity-posts`);
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.success).toBe(true);
  });

  it("GET /teams/nonexistent/activity-posts → 404", async () => {
    const res = await req(createApp(), "/teams/nonexistent/activity-posts");
    expect(res.status).toBe(404);
  });

  it("POST /teams/:id/activity-posts（登录成员）→ 200", async () => {
    const member = await testDb.query.users.findFirst({ where: (u) => _eq(u.email, "m@test.com") });
    setSession({ id: member!.id, email: member!.email, name: member!.name });
    const res = await req(createApp(), `/teams/${teamId}/activity-posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello" }),
    });
    expect(res.status).toBe(200);
  });

  it("POST /teams/:id/activity-posts（未登录）→ 401", async () => {
    setSession(null);
    const res = await req(createApp(), `/teams/${teamId}/activity-posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello" }),
    });
    expect(res.status).toBe(401);
  });

  it("DELETE /activity-posts/:id（作者）→ 200", async () => {
    const uid = generateId();
    await testDb.insert(schema.users).values({
      id: uid, name: "Author", email: "a@test.com",
      role: "user", status: "active", level: "beginner",
      emailVerified: false, createdAt: new Date(), updatedAt: new Date(),
    });
    const postId = generateId();
    await testDb.insert(schema.activityPosts).values({
      id: postId, teamId, locationId,
      authorId: uid, content: "x",
      images: "[]", status: "visible",
      createdAt: new Date(), updatedAt: new Date(),
    });
    setSession({ id: uid, email: "a@test.com", name: "Author" });
    const res = await req(createApp(), `/activity-posts/${postId}`, { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("旧双前缀 /activity-posts/teams/:id/activity-posts → 404（不可复用）", async () => {
    const res = await req(createApp(), `/activity-posts/teams/${teamId}/activity-posts`);
    expect(res.status).toBe(404);
  });
});
