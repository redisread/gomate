import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "../helpers/db";
import {
  seedLocation,
  seedConversation,
  seedRegion,
  seedTeam,
  seedTeamMember,
  seedUser,
} from "../helpers/seed";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";

const state = vi.hoisted(() => ({
  db: null as TestDb | null,
  routeDb: null as TestDb | null,
  beforeGenerateId: null as (() => void) | null,
  beforeRouteUpdate: null as (() => void) | null,
  beforeRouteSelectAt: null as number | null,
  routeSelectCount: 0,
  id: 0,
}));

vi.mock("../../db", () => ({
  createDb: () => {
    if (!state.db) throw new Error("Test DB not initialized");
    return state.routeDb ?? state.db;
  },
}));

vi.mock("../../lib/id", () => ({
  generateId: () => {
    state.beforeGenerateId?.();
    state.beforeGenerateId = null;
    state.id += 1;
    return `route-generated-${state.id}`;
  },
}));

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const id = headers.get("x-test-user-id");
        return id ? { user: { id } } : null;
      },
    },
  }),
}));

import messagesRoute from "../../routes/messages";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/messages", messagesRoute);
  return app;
}

function request(
  app: ReturnType<typeof createApp>,
  path: string,
  userId?: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  if (userId) headers.set("x-test-user-id", userId);
  if (init.body) headers.set("content-type", "application/json");
  return app.request(path, { ...init, headers }, {} as Env);
}

describe("messages V2", () => {
  let db: TestDb;
  let app: ReturnType<typeof createApp>;
  let leader: schema.User;
  let member: schema.User;
  let outsider: schema.User;
  let team: schema.Team;

  beforeEach(async () => {
    ({ db } = createTestDb());
    state.db = db;
    state.beforeGenerateId = null;
    state.beforeRouteUpdate = null;
    state.beforeRouteSelectAt = null;
    state.routeSelectCount = 0;
    state.routeDb = new Proxy(db, {
      get(target, property, receiver) {
        if (property === "select") {
          return (...args: Parameters<TestDb["select"]>) => {
            state.routeSelectCount += 1;
            if (state.routeSelectCount === state.beforeRouteSelectAt) {
              state.beforeRouteUpdate?.();
              state.beforeRouteUpdate = null;
            }
            return target.select(...args);
          };
        }
        if (property === "update") {
          return (...args: Parameters<TestDb["update"]>) => {
            state.beforeRouteUpdate?.();
            state.beforeRouteUpdate = null;
            return target.update(...args);
          };
        }
        const value = Reflect.get(target, property, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as TestDb;
    app = createApp();
    leader = await seedUser(db, { name: "Leader" });
    member = await seedUser(db, { name: "Member" });
    outsider = await seedUser(db, { name: "Outsider" });
    const region = await seedRegion(db);
    const location = await seedLocation(db, region.id);
    team = await seedTeam(db, leader.id, location.id);
    await seedTeamMember(db, team.id, member.id);
  });

  async function createConversation() {
    const response = await request(app, "/messages", member.id, {
      method: "POST",
      body: JSON.stringify({ teamId: team.id }),
    });
    const body = await response.json() as { data: { id: string } };
    return { response, id: body.data.id };
  }

  it("creates one conversation per team and active member", async () => {
    const first = await createConversation();
    expect(first.response.status).toBe(201);

    const second = await request(app, "/messages", leader.id, {
      method: "POST",
      body: JSON.stringify({ teamId: team.id, memberUserId: member.id }),
    });
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({
      success: true,
      data: { id: first.id, isNew: false },
    });

    const [stored] = await db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, first.id));
    expect(stored).toMatchObject({
      teamId: team.id,
      memberUserId: member.id,
      initiatedByUserId: member.id,
    });
  });

  it("rejects outsiders, inactive members, and the removed userId payload", async () => {
    const outsiderResponse = await request(app, "/messages", outsider.id, {
      method: "POST",
      body: JSON.stringify({ teamId: team.id }),
    });
    expect(outsiderResponse.status).toBe(403);

    await db
      .update(schema.teamMembers)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(schema.teamMembers.teamId, team.id),
          eq(schema.teamMembers.userId, member.id),
        ),
      );
    const inactiveResponse = await request(app, "/messages", member.id, {
      method: "POST",
      body: JSON.stringify({ teamId: team.id }),
    });
    expect(inactiveResponse.status).toBe(403);

    const legacyResponse = await request(app, "/messages", leader.id, {
      method: "POST",
      body: JSON.stringify({ teamId: team.id, userId: member.id }),
    });
    expect(legacyResponse.status).toBe(400);
  });

  it("uses the trigger summary and explicit read timestamps", async () => {
    const { id } = await createConversation();
    const send = await request(app, `/messages/${id}`, member.id, {
      method: "POST",
      body: JSON.stringify({ content: "Hello leader" }),
    });
    expect(send.status).toBe(201);
    const sentBody = await send.json() as {
      data: { createdAt: unknown; readAt: unknown };
    };
    expect(sentBody.data.createdAt).toBeTypeOf("string");
    expect(Number.isNaN(Date.parse(sentBody.data.createdAt as string))).toBe(false);
    expect(sentBody.data.readAt).toBeNull();

    const [conversation] = await db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id));
    expect(conversation.lastMessagePreview).toBe("Hello leader");
    expect(conversation.lastMessageAt).toBeInstanceOf(Date);

    const unread = await request(app, "/messages/unread-count", leader.id);
    await expect(unread.json()).resolves.toEqual({
      success: true,
      data: { count: 1 },
    });

    const markRead = await request(app, `/messages/${id}/read`, leader.id, {
      method: "PATCH",
    });
    expect(markRead.status).toBe(200);
    const unreadAfter = await request(app, "/messages/unread-count", leader.id);
    await expect(unreadAfter.json()).resolves.toEqual({
      success: true,
      data: { count: 0 },
    });
  });

  it("checks the current leader and active membership on every access", async () => {
    const { id } = await createConversation();
    await db.update(schema.teams).set({ leaderId: outsider.id }).where(eq(schema.teams.id, team.id));

    expect((await request(app, `/messages/${id}`, leader.id)).status).toBe(403);
    expect((await request(app, `/messages/${id}`, outsider.id)).status).toBe(200);

    await db
      .update(schema.teamMembers)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(schema.teamMembers.teamId, team.id),
          eq(schema.teamMembers.userId, member.id),
        ),
      );
    expect((await request(app, `/messages/${id}`, member.id)).status).toBe(403);
    expect((await request(app, `/messages/${id}`, outsider.id)).status).toBe(403);
  });

  it("paginates equal timestamps with an opaque {t,id} cursor without duplicates", async () => {
    const { id } = await createConversation();
    const createdAt = new Date("2026-08-16T08:00:00.000Z");
    for (const messageId of ["message-a", "message-b", "message-c"]) {
      await db.insert(schema.messages).values({
        id: messageId,
        conversationId: id,
        senderId: member.id,
        content: messageId,
        createdAt,
      });
    }

    const first = await request(app, `/messages/${id}?limit=2`, member.id);
    const firstBody = await first.json() as {
      data: Array<{ id: string; createdAt: unknown; readAt: unknown }>;
      nextCursor: string;
    };
    expect(firstBody.data.map((message) => message.id)).toEqual([
      "message-b",
      "message-c",
    ]);
    expect(firstBody.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(firstBody.data.every((message) => typeof message.createdAt === "string")).toBe(true);
    expect(firstBody.data.every((message) => message.readAt === null)).toBe(true);

    const second = await request(
      app,
      `/messages/${id}?limit=2&cursor=${firstBody.nextCursor}`,
      member.id,
    );
    const secondBody = await second.json() as { data: Array<{ id: string }> };
    expect(secondBody.data.map((message) => message.id)).toEqual(["message-a"]);
  });

  it("rejects invalid cursors and the removed since parameter", async () => {
    const { id } = await createConversation();
    expect((await request(app, `/messages/${id}?cursor=%%%`, member.id)).status).toBe(400);
    expect((await request(app, `/messages/${id}?cursor=${"a".repeat(513)}`, member.id)).status).toBe(400);
    expect((await request(app, `/messages/${id}?since=1`, member.id)).status).toBe(400);
  });

  it("paginates the conversation inbox by effective activity time and id", async () => {
    const members = await Promise.all([
      seedUser(db, { id: "inbox-member-a" }),
      seedUser(db, { id: "inbox-member-b" }),
      seedUser(db, { id: "inbox-member-c" }),
    ]);
    const activityAt = new Date("2026-08-16T09:00:00.000Z");
    for (const [index, inboxMember] of members.entries()) {
      await seedTeamMember(db, team.id, inboxMember.id);
      await seedConversation(db, team.id, inboxMember.id, leader.id, {
        id: `conversation-${String.fromCharCode(97 + index)}`,
        lastMessageAt: activityAt,
        createdAt: activityAt,
        updatedAt: activityAt,
      });
    }

    const first = await request(app, "/messages?limit=2", leader.id);
    expect(first.status).toBe(200);
    const firstBody = await first.json() as {
      data: Array<{
        id: string;
        lastMessageAt: unknown;
        createdAt: unknown;
        updatedAt: unknown;
      }>;
      nextCursor: string | null;
    };
    expect(firstBody.data.map(({ id }) => id)).toEqual([
      "conversation-c",
      "conversation-b",
    ]);
    expect(firstBody.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/u);
    for (const conversation of firstBody.data) {
      expect(conversation.lastMessageAt).toBe(activityAt.toISOString());
      expect(conversation.createdAt).toBe(activityAt.toISOString());
      expect(conversation.updatedAt).toBe(activityAt.toISOString());
    }

    const second = await request(
      app,
      `/messages?limit=2&cursor=${firstBody.nextCursor}`,
      leader.id,
    );
    const secondBody = await second.json() as {
      data: Array<{ id: string }>;
      nextCursor: string | null;
    };
    expect(secondBody.data.map(({ id }) => id)).toEqual(["conversation-a"]);
    expect(secondBody.nextCursor).toBeNull();

    const allIds = [
      ...firstBody.data.map(({ id }) => id),
      ...secondBody.data.map(({ id }) => id),
    ];
    expect(new Set(allIds).size).toBe(3);
  });

  it("rejects removed inbox page parameters and oversized cursors", async () => {
    expect((await request(app, "/messages?page=2", leader.id)).status).toBe(400);
    expect((await request(app, "/messages?pageSize=20", leader.id)).status).toBe(400);
    expect(
      (await request(app, `/messages?cursor=${"a".repeat(513)}`, leader.id)).status,
    ).toBe(400);
  });

  it("never exposes a conversation to an unrelated user", async () => {
    const { id } = await createConversation();
    expect((await request(app, `/messages/${id}`, outsider.id)).status).toBe(403);
    expect(
      (
        await request(app, `/messages/${id}`, outsider.id, {
          method: "POST",
          body: JSON.stringify({ content: "nope" }),
        })
      ).status,
    ).toBe(403);
  });

  it("does not create a conversation when membership is revoked after the access read", async () => {
    state.beforeGenerateId = () => {
      db.update(schema.teamMembers)
        .set({ leftAt: new Date() })
        .where(and(
          eq(schema.teamMembers.teamId, team.id),
          eq(schema.teamMembers.userId, member.id),
        ))
        .run();
    };

    const response = await request(app, "/messages", member.id, {
      method: "POST",
      body: JSON.stringify({ teamId: team.id }),
    });

    expect(response.status).toBe(403);
    const stored = await db.select().from(schema.conversations);
    expect(stored).toHaveLength(0);
  });

  it.each([
    { status: "suspended" as const, deletedAt: null },
    { status: "banned" as const, deletedAt: null },
    { status: "deleted" as const, deletedAt: new Date() },
  ])(
    "rejects a stored session when user status is $status and deletedAt is $deletedAt",
    async ({ status, deletedAt }) => {
      await db.update(schema.users)
        .set({ status, deletedAt })
        .where(eq(schema.users.id, member.id));

      const response = await request(app, "/messages", member.id, {
        method: "POST",
        body: JSON.stringify({ teamId: team.id }),
      });

      expect(response.status).toBe(401);
      expect(await db.select().from(schema.conversations)).toHaveLength(0);
    },
  );

  it("does not send after the member leaves or the team changes leader between check and insert", async () => {
    const { id } = await createConversation();
    state.beforeGenerateId = () => {
      db.update(schema.teamMembers)
        .set({ leftAt: new Date() })
        .where(and(
          eq(schema.teamMembers.teamId, team.id),
          eq(schema.teamMembers.userId, member.id),
        ))
        .run();
    };
    const formerMember = await request(app, `/messages/${id}`, member.id, {
      method: "POST",
      body: JSON.stringify({ content: "must not persist" }),
    });
    expect(formerMember.status).toBe(403);
    expect(await db.select().from(schema.messages)).toHaveLength(0);

    await db.update(schema.teamMembers)
      .set({ leftAt: null })
      .where(and(
        eq(schema.teamMembers.teamId, team.id),
        eq(schema.teamMembers.userId, member.id),
      ));
    state.beforeGenerateId = () => {
      db.update(schema.teams)
        .set({ leaderId: outsider.id })
        .where(eq(schema.teams.id, team.id))
        .run();
    };
    const formerLeader = await request(app, `/messages/${id}`, leader.id, {
      method: "POST",
      body: JSON.stringify({ content: "must not persist either" }),
    });
    expect(formerLeader.status).toBe(403);
    expect(await db.select().from(schema.messages)).toHaveLength(0);
  });

  it("does not mark messages read when access is revoked between check and update", async () => {
    const { id } = await createConversation();
    await db.insert(schema.messages).values({
      id: "unread-race",
      conversationId: id,
      senderId: leader.id,
      content: "still unread",
    });
    state.beforeRouteUpdate = () => {
      db.update(schema.teamMembers)
        .set({ leftAt: new Date() })
        .where(and(
          eq(schema.teamMembers.teamId, team.id),
          eq(schema.teamMembers.userId, member.id),
        ))
        .run();
    };

    const response = await request(app, `/messages/${id}/read`, member.id, {
      method: "PATCH",
    });

    expect(response.status).toBe(403);
    const [stored] = await db
      .select({ readAt: schema.messages.readAt })
      .from(schema.messages)
      .where(eq(schema.messages.id, "unread-race"));
    expect(stored.readAt).toBeNull();
  });

  it("does not return message history when membership is revoked between check and read", async () => {
    const { id } = await createConversation();
    await db.insert(schema.messages).values({
      id: "private-race",
      conversationId: id,
      senderId: leader.id,
      content: "must not be disclosed",
    });
    state.routeSelectCount = 0;
    // active-session lookup, access lookup, then the message history SELECT
    state.beforeRouteSelectAt = 3;
    state.beforeRouteUpdate = () => {
      db.update(schema.teamMembers)
        .set({ leftAt: new Date() })
        .where(and(
          eq(schema.teamMembers.teamId, team.id),
          eq(schema.teamMembers.userId, member.id),
        ))
        .run();
    };

    const response = await request(app, `/messages/${id}`, member.id);

    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("must not be disclosed");
  });
});
