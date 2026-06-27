import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/db";
import { generateId } from "../../lib/id";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";

const testContext = vi.hoisted(() => ({
  db: null as ReturnType<typeof drizzle> | null,
}));

vi.mock("../../db", () => ({
  createDb: () => {
    if (!testContext.db) throw new Error("Test DB not initialized");
    return testContext.db;
  },
}));

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const userId = headers.get("x-test-user-id");
        return userId ? { user: { id: userId } } : null;
      },
    },
  }),
}));

import messagesRoutes from "../../routes/messages";

function createMessagesTestApp() {
  const app = new Hono<{ Bindings: Env }>();

  app.use("*", async (c, next) => {
    (c as unknown as { env: Partial<Env> }).env = {
      BETTER_AUTH_SECRET: "test-secret-key-for-testing-32chars",
      APP_URL: "http://localhost:8799",
      FRONTEND_URL: "http://localhost:3000",
    } as Partial<Env>;
    await next();
  });

  app.route("/messages", messagesRoutes);
  return app;
}

type TestDb = ReturnType<typeof drizzle>;
type TestUser = typeof schema.users.$inferSelect;
type TestTeam = typeof schema.teams.$inferSelect;
type TestTeamOverrides = Pick<typeof schema.teams.$inferInsert, "locationId" | "leaderId"> &
  Partial<typeof schema.teams.$inferInsert>;

async function createTestUser(
  db: TestDb,
  overrides: Partial<typeof schema.users.$inferInsert> = {}
) {
  const id = generateId();
  const user = {
    id,
    name: `Test User ${id.slice(0, 6)}`,
    email: `test-${id}@test.com`,
    role: "user",
    status: "active",
    level: "beginner",
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies typeof schema.users.$inferInsert;

  await db.insert(schema.users).values(user);
  return user as TestUser;
}

async function createTestTeam(
  db: TestDb,
  overrides: TestTeamOverrides
) {
  const id = generateId();
  const now = new Date();
  const team = {
    id,
    title: `Test Team ${id.slice(0, 6)}`,
    status: "recruiting",
    icon: "⛰️",
    maxMembers: 10,
    durationMin: 240,
    startTime: now,
    endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } satisfies typeof schema.teams.$inferInsert;

  await db.insert(schema.teams).values(team);
  return team as TestTeam;
}

async function addTeamMember(
  db: TestDb,
  teamId: string,
  userId: string,
  status: typeof schema.teamMembers.$inferInsert["status"] = "approved"
) {
  await db.insert(schema.teamMembers).values({
    id: generateId(),
    teamId,
    userId,
    status,
    joinedAt: status === "approved" ? new Date() : null,
    statusUpdatedAt: new Date(),
    createdAt: new Date(),
  });
}

function authHeaders(userId: string, extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    "x-test-user-id": userId,
    ...extra,
  };
}

describe("Messages API 集成测试", () => {
  let app: ReturnType<typeof createMessagesTestApp>;
  let db: TestDb;
  let leader: TestUser;
  let approvedMember: TestUser;
  let pendingMember: TestUser;
  let outsider: TestUser;
  let team: TestTeam;

  beforeEach(async () => {
    const testDb = createTestDb();
    db = drizzle(testDb.sqlite, { schema });
    testContext.db = db;
    app = createMessagesTestApp();

    leader = await createTestUser(db, { name: "Leader", email: "leader@test.com" });
    approvedMember = await createTestUser(db, { name: "Member", email: "member@test.com" });
    pendingMember = await createTestUser(db, { name: "Pending", email: "pending@test.com" });
    outsider = await createTestUser(db, { name: "Outsider", email: "outsider@test.com" });

    const cityId = generateId();
    await db.insert(schema.cities).values({
      id: cityId,
      adcode: "110000",
      name: "北京",
      level: "city",
      isHot: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const locationId = generateId();
    await db.insert(schema.locations).values({
      id: locationId,
      name: "Test Location",
      slug: `test-location-${generateId()}`,
      description: "Test",
      cityId,
      cityName: "北京",
      bestSeason: "spring",
      coverImage: "https://example.com/cover.jpg",
      images: "[]",
      coordinates: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    team = await createTestTeam(db, {
      locationId,
      leaderId: leader.id,
    });

    await addTeamMember(db, team.id, approvedMember.id, "approved");
    await addTeamMember(db, team.id, pendingMember.id, "pending");
  });

  describe("POST /messages", () => {
    it("approved 成员可创建并复用与队长的对话", async () => {
      const first = await app.request("/messages", {
        method: "POST",
        headers: authHeaders(approvedMember.id),
        body: JSON.stringify({ teamId: team.id }),
      });

      expect(first.status).toBe(201);
      const firstData = await first.json() as { success: boolean; data: { id: string; isNew: boolean } };
      expect(firstData).toMatchObject({ success: true, data: { isNew: true } });

      const [conversation] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, firstData.data.id))
        .limit(1);
      expect(conversation).toMatchObject({
        teamId: team.id,
        userId: approvedMember.id,
        leaderId: leader.id,
        initiatorId: approvedMember.id,
      });

      const second = await app.request("/messages", {
        method: "POST",
        headers: authHeaders(approvedMember.id),
        body: JSON.stringify({ teamId: team.id }),
      });
      expect(second.status).toBe(200);
      const secondData = await second.json() as { data: { id: string; isNew: boolean } };
      expect(secondData.data).toEqual({ id: firstData.data.id, isNew: false });
    });

    it("pending 成员不可创建队伍私信", async () => {
      const res = await app.request("/messages", {
        method: "POST",
        headers: authHeaders(pendingMember.id),
        body: JSON.stringify({ teamId: team.id }),
      });

      expect(res.status).toBe(403);
    });

    it("队长可给 approved 成员创建对话", async () => {
      const res = await app.request("/messages", {
        method: "POST",
        headers: authHeaders(leader.id),
        body: JSON.stringify({ teamId: team.id, userId: approvedMember.id }),
      });

      expect(res.status).toBe(201);
      const data = await res.json() as { success: boolean; data: { id: string; isNew: boolean } };
      expect(data.success).toBe(true);
      expect(data.data.isNew).toBe(true);

      const [conversation] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, data.data.id))
        .limit(1);
      expect(conversation).toMatchObject({
        teamId: team.id,
        userId: approvedMember.id,
        leaderId: leader.id,
        initiatorId: leader.id,
      });
    });

    it("队长不可给 pending 或非成员创建对话", async () => {
      const pendingRes = await app.request("/messages", {
        method: "POST",
        headers: authHeaders(leader.id),
        body: JSON.stringify({ teamId: team.id, userId: pendingMember.id }),
      });
      expect(pendingRes.status).toBe(403);

      const outsiderRes = await app.request("/messages", {
        method: "POST",
        headers: authHeaders(leader.id),
        body: JSON.stringify({ teamId: team.id, userId: outsider.id }),
      });
      expect(outsiderRes.status).toBe(403);
    });

    it("非队长不可指定目标成员创建对话", async () => {
      const res = await app.request("/messages", {
        method: "POST",
        headers: authHeaders(approvedMember.id),
        body: JSON.stringify({ teamId: team.id, userId: outsider.id }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe("conversation access", () => {
    async function createConversationAsMember() {
      const res = await app.request("/messages", {
        method: "POST",
        headers: authHeaders(approvedMember.id),
        body: JSON.stringify({ teamId: team.id }),
      });
      const data = await res.json() as { data: { id: string } };
      return data.data.id;
    }

    it("approved 成员和队长可互发、读取消息并统计未读", async () => {
      const conversationId = await createConversationAsMember();

      const sendRes = await app.request(`/messages/${conversationId}`, {
        method: "POST",
        headers: authHeaders(approvedMember.id),
        body: JSON.stringify({ content: "Hello leader" }),
      });
      expect(sendRes.status).toBe(201);

      const unreadRes = await app.request("/messages/unread-count", {
        method: "GET",
        headers: authHeaders(leader.id),
      });
      expect(unreadRes.status).toBe(200);
      const unreadData = await unreadRes.json() as { data: { count: number } };
      expect(unreadData.data.count).toBe(1);

      const listRes = await app.request(`/messages/${conversationId}`, {
        method: "GET",
        headers: authHeaders(leader.id),
      });
      expect(listRes.status).toBe(200);
      const listData = await listRes.json() as { data: Array<{ content: string; senderId: string }> };
      expect(listData.data).toHaveLength(1);
      expect(listData.data[0]).toMatchObject({
        content: "Hello leader",
        senderId: approvedMember.id,
      });

      const unreadAfterReadRes = await app.request("/messages/unread-count", {
        method: "GET",
        headers: authHeaders(leader.id),
      });
      expect(unreadAfterReadRes.status).toBe(200);
      const unreadAfterReadData = await unreadAfterReadRes.json() as { data: { count: number } };
      expect(unreadAfterReadData.data.count).toBe(0);

      const replyRes = await app.request(`/messages/${conversationId}`, {
        method: "POST",
        headers: authHeaders(leader.id),
        body: JSON.stringify({ content: "Hi" }),
      });
      expect(replyRes.status).toBe(201);
    });

    it("非会话参与者不可读取或发送消息", async () => {
      const conversationId = await createConversationAsMember();

      const readRes = await app.request(`/messages/${conversationId}`, {
        method: "GET",
        headers: authHeaders(outsider.id),
      });
      expect(readRes.status).toBe(403);

      const sendRes = await app.request(`/messages/${conversationId}`, {
        method: "POST",
        headers: authHeaders(outsider.id),
        body: JSON.stringify({ content: "Nope" }),
      });
      expect(sendRes.status).toBe(403);
    });

    it("成员不再 approved 后双方都不可继续访问已有会话", async () => {
      const conversationId = await createConversationAsMember();
      await app.request(`/messages/${conversationId}`, {
        method: "POST",
        headers: authHeaders(leader.id),
        body: JSON.stringify({ content: "Before removal" }),
      });

      await db
        .update(schema.teamMembers)
        .set({ status: "rejected" })
        .where(eq(schema.teamMembers.userId, approvedMember.id));

      const memberListRes = await app.request("/messages", {
        method: "GET",
        headers: authHeaders(approvedMember.id),
      });
      expect(memberListRes.status).toBe(200);
      const memberListData = await memberListRes.json() as { data: unknown[] };
      expect(memberListData.data).toEqual([]);

      const memberUnreadRes = await app.request("/messages/unread-count", {
        method: "GET",
        headers: authHeaders(approvedMember.id),
      });
      expect(memberUnreadRes.status).toBe(200);
      const memberUnreadData = await memberUnreadRes.json() as { data: { count: number } };
      expect(memberUnreadData.data.count).toBe(0);

      const memberReadRes = await app.request(`/messages/${conversationId}`, {
        method: "GET",
        headers: authHeaders(approvedMember.id),
      });
      expect(memberReadRes.status).toBe(403);

      const memberSendRes = await app.request(`/messages/${conversationId}`, {
        method: "POST",
        headers: authHeaders(approvedMember.id),
        body: JSON.stringify({ content: "No longer in team" }),
      });
      expect(memberSendRes.status).toBe(403);

      const leaderListRes = await app.request("/messages", {
        method: "GET",
        headers: authHeaders(leader.id),
      });
      expect(leaderListRes.status).toBe(200);
      const leaderListData = await leaderListRes.json() as { data: unknown[] };
      expect(leaderListData.data).toEqual([]);

      const leaderReadRes = await app.request(`/messages/${conversationId}`, {
        method: "GET",
        headers: authHeaders(leader.id),
      });
      expect(leaderReadRes.status).toBe(403);

      const leaderSendRes = await app.request(`/messages/${conversationId}`, {
        method: "POST",
        headers: authHeaders(leader.id),
        body: JSON.stringify({ content: "No longer in team" }),
      });
      expect(leaderSendRes.status).toBe(403);
    });
  });
});
