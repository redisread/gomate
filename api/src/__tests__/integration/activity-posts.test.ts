import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createTestDb } from "../helpers/db";
import { eq } from "drizzle-orm";
import { generateId } from "../../lib/id";
import * as schema from "../../db/schema";

// ===== Mock 策略（同 teams.test.ts）=====

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

const activityPostsRoutes = (await import("../../routes/activity-posts")).default;

function createApp() {
  const app = new Hono<{ Bindings: { DB: unknown } }>();
  app.route("/", activityPostsRoutes);
  return app;
}

async function req(
  app: ReturnType<typeof createApp>,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const request = new Request(`http://localhost${path}`, options);
  return app.fetch(request, { DB: {} });
}

function setSession(user: { id: string; email: string; name: string } | null) {
  currentSession = user ? { user } : null;
}

describe("Activity Posts API 集成测试", () => {
  let app: ReturnType<typeof createApp>;
  let leader: typeof schema.users.$inferSelect;
  let member: typeof schema.users.$inferSelect;
  let team: typeof schema.teams.$inferSelect;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;

    // 创建队长和成员
    const leaderId = generateId();
    const memberId = generateId();
    await testDb.insert(schema.users).values({
      id: leaderId, name: "Leader", email: "leader@test.com",
      role: "user", status: "active", level: "beginner",
      emailVerified: false, createdAt: new Date(), updatedAt: new Date(),
    });
    await testDb.insert(schema.users).values({
      id: memberId, name: "Member", email: "member@test.com",
      role: "user", status: "active", level: "beginner",
      emailVerified: false, createdAt: new Date(), updatedAt: new Date(),
    });

    leader = (await testDb.query.users.findFirst({ where: eq(schema.users.id, leaderId) }))!;
    member = (await testDb.query.users.findFirst({ where: eq(schema.users.id, memberId) }))!;

    // 创建城市 + 地点
    const cityId = generateId();
    await testDb.insert(schema.cities).values({
      id: cityId, adcode: "110000", name: "北京", level: "city",
      isHot: true, createdAt: new Date(), updatedAt: new Date(),
    });

    const locationId = generateId();
    await testDb.insert(schema.locations).values({
      id: locationId, name: "Test Location", slug: `test-${generateId()}`,
      description: "Test", cityId, cityName: "北京", bestSeason: "spring",
      coverImage: "https://example.com/cover.jpg", images: "[]",
      coordinates: "{}", createdAt: new Date(), updatedAt: new Date(),
    });

    // 创建已完成的队伍
    const teamId = generateId();
    const now = new Date();
    await testDb.insert(schema.teams).values({
      id: teamId, locationId, leaderId: leader.id, title: "Test Team",
      icon: "⛰️", maxMembers: 10, durationMin: 240,
      startTime: now, endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      status: "completed", createdAt: now, updatedAt: now,
    });
    team = (await testDb.query.teams.findFirst({ where: eq(schema.teams.id, teamId) }))!;

    // 添加成员
    await testDb.insert(schema.teamMembers).values({
      id: generateId(), teamId: team.id, userId: leader.id, status: "approved",
      joinedAt: now, createdAt: now,
    });
    await testDb.insert(schema.teamMembers).values({
      id: generateId(), teamId: team.id, userId: member.id, status: "approved",
      joinedAt: now, createdAt: now,
    });
  });

  describe("POST /teams/:id/activity-posts - 创建活动后分享", () => {
    it("成员创建活动后分享 → 应返回成功响应", async () => {
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${team.id}/activity-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "这是一次很棒的徒步！",
          images: ["https://example.com/photo1.jpg"],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
    });

    it("空内容 → 应返回 400", async () => {
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${team.id}/activity-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "", images: [] }),
      });

      expect(res.status).toBe(400);
    });

    it("未登录用户 → 应返回 401", async () => {
      setSession(null);

      const res = await req(app, `/teams/${team.id}/activity-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Test" }),
      });

      expect(res.status).toBe(401);
    });

    it("不存在的队伍 → 应返回 404", async () => {
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, "/teams/nonexistent-team/activity-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Test" }),
      });

      expect(res.status).toBe(404);
    });

    it("队伍未完成 → 应返回 403", async () => {
      // 创建一个 recruiting 状态的队伍
      const rTeamId = generateId();
      const now = new Date();
      await testDb.insert(schema.teams).values({
        id: rTeamId, locationId: team.locationId, leaderId: leader.id,
        title: "Recruiting Team", icon: "⛰️", maxMembers: 10, durationMin: 240,
        startTime: now, endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        status: "recruiting", createdAt: now, updatedAt: now,
      });
      await testDb.insert(schema.teamMembers).values({
        id: generateId(), teamId: rTeamId, userId: member.id,
        status: "approved", joinedAt: now, createdAt: now,
      });

      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/teams/${rTeamId}/activity-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Test" }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /teams/:id/activity-posts - 获取活动后分享列表", () => {
    it("获取分享列表 → 应返回成功响应", async () => {
      const res = await req(app, `/teams/${team.id}/activity-posts`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("不存在的队伍 → 应返回 404", async () => {
      const res = await req(app, "/teams/nonexistent-id/activity-posts", {
        method: "GET",
      });

      expect(res.status).toBe(404);
    });

    it("有分享的队伍 → 应返回分享列表", async () => {
      // 直接插入一条分享
      await testDb.insert(schema.activityPosts).values({
        id: generateId(), teamId: team.id, locationId: team.locationId,
        authorId: member.id, content: "Test post content",
        images: JSON.stringify(["https://example.com/photo.jpg"]),
        status: "visible", createdAt: new Date(), updatedAt: new Date(),
      });

      const res = await req(app, `/teams/${team.id}/activity-posts`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect((data.data as Array<unknown>).length).toBe(1);
    });
  });

  describe("DELETE /activity-posts/:id - 删除活动后分享", () => {
    let postId: string;

    beforeEach(async () => {
      postId = generateId();
      await testDb.insert(schema.activityPosts).values({
        id: postId, teamId: team.id, locationId: team.locationId,
        authorId: member.id, content: "Test post to delete",
        images: JSON.stringify([]), status: "visible",
        createdAt: new Date(), updatedAt: new Date(),
      });
    });

    it("作者删除分享 → 应返回成功响应", async () => {
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, `/activity-posts/${postId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.success).toBe(true);
    });

    it("删除不存在的分享 → 应返回 404", async () => {
      setSession({ id: member.id, email: member.email, name: member.name });

      const res = await req(app, "/activity-posts/nonexistent-id", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });

    it("未登录 → 应返回 401", async () => {
      setSession(null);

      const res = await req(app, `/activity-posts/${postId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });
  });
});
