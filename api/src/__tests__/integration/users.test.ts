import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "../helpers/db";
import {
  seedLocation,
  seedRegion,
  seedTeam,
  seedTeamJoinRequest,
  seedTeamMember,
  seedUser,
} from "../helpers/seed";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";

const state = vi.hoisted(() => ({
  db: null as TestDb | null,
  beforeRouteUpdate: null as (() => void) | null,
}));

vi.mock("../../db", () => ({
  createDb: () => {
    if (!state.db) throw new Error("Test DB not initialized");
    return state.db;
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

import { usersRoute } from "../../routes/users";

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/users", usersRoute);
  return app;
}

const bindings = {} as Env;

function request(
  app: ReturnType<typeof createApp>,
  path: string,
  userId?: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  if (userId) headers.set("x-test-user-id", userId);
  if (init.body) headers.set("content-type", "application/json");
  return app.request(path, { ...init, headers }, bindings);
}

describe("users V2", () => {
  let db: TestDb;
  let app: ReturnType<typeof createApp>;
  let user: schema.User;

  beforeEach(async () => {
    ({ db } = createTestDb());
    state.beforeRouteUpdate = null;
    state.db = new Proxy(db, {
      get(target, property, receiver) {
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
    user = await seedUser(db, {
      name: "Victor",
      email: "victor@test.example",
      extra: {
        level: "intermediate",
        completed_hikes: 7,
        wechat: "private-wechat",
        city: null,
      },
    });
  });

  it("returns the authenticated self projection from /users/me", async () => {
    expect((await request(app, "/users/me")).status).toBe(401);
    const response = await request(app, "/users/me", user.id);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      user: {
        id: user.id,
        email: "victor@test.example",
        extra: {
          level: "intermediate",
          completedHikes: 7,
          wechat: "private-wechat",
          city: null,
        },
      },
    });
  });

  it("redacts private contact data from public profiles", async () => {
    const response = await request(app, `/users/${user.id}`);
    const body = await response.json() as {
      user: Record<string, unknown> & { extra: { wechat: string | null } };
    };
    expect(response.status).toBe(200);
    expect(body.user).not.toHaveProperty("email");
    expect(body.user).not.toHaveProperty("birthday");
    expect(body.user).not.toHaveProperty("gender");
    expect(body.user.extra.wechat).toBeNull();
  });

  it("does not publish unverified or soft-deleted accounts", async () => {
    const unverified = await seedUser(db, {
      id: "unverified-public-user",
      emailVerified: false,
    });
    const deleted = await seedUser(db, {
      id: "deleted-public-user",
      deletedAt: new Date(),
    });

    expect((await request(app, `/users/${unverified.id}`)).status).toBe(404);
    expect((await request(app, `/users/${deleted.id}`)).status).toBe(404);
  });

  it("merges UserExtra and validates city against an enabled city Region", async () => {
    const city = await seedRegion(db, { name: "Shenzhen" });
    const response = await request(app, "/users/me", user.id, {
      method: "PATCH",
      body: JSON.stringify({
        nickname: "Vic",
        extra: { city: city.id, wechat: "new-wechat" },
      }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: {
        nickname: "Vic",
        extra: {
          level: "intermediate",
          completedHikes: 7,
          city: city.id,
          wechat: "new-wechat",
        },
      },
    });

    const [stored] = await db
      .select({ extra: schema.users.extra })
      .from(schema.users)
      .where(eq(schema.users.id, user.id));
    expect(stored.extra).toEqual({
      level: "intermediate",
      completed_hikes: 7,
      city: city.id,
      wechat: "new-wechat",
    });
  });

  it("patches UserExtra atomically without losing a concurrent field update", async () => {
    const city = await seedRegion(db, { id: "region-concurrent-city" });
    state.beforeRouteUpdate = () => {
      db.update(schema.users)
        .set({
          extra: {
            level: "intermediate",
            completed_hikes: 8,
            wechat: "private-wechat",
            city: null,
          },
        })
        .where(eq(schema.users.id, user.id))
        .run();
    };

    const response = await request(app, "/users/me", user.id, {
      method: "PATCH",
      body: JSON.stringify({ extra: { city: city.id } }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: {
        extra: {
          completedHikes: 8,
          city: city.id,
          wechat: "private-wechat",
        },
      },
    });
  });

  it("rechecks a changed city in the profile UPDATE without partially committing other fields", async () => {
    const city = await seedRegion(db, { id: "region-profile-city-race" });
    state.beforeRouteUpdate = () => {
      db.update(schema.region)
        .set({ serviceEnabled: false })
        .where(eq(schema.region.id, city.id))
        .run();
    };

    const response = await request(app, "/users/me", user.id, {
      method: "PATCH",
      body: JSON.stringify({
        nickname: "不应提交的昵称",
        bio: "不应提交的简介",
        extra: { city: city.id, wechat: "not-committed" },
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "CONFLICT" },
    });
    const [stored] = await db.select().from(schema.users)
      .where(eq(schema.users.id, user.id));
    expect(stored).toMatchObject({
      nickname: null,
      bio: null,
      extra: {
        level: "intermediate",
        completed_hikes: 7,
        wechat: "private-wechat",
        city: null,
      },
    });
  });

  it("rejects non-service Regions and removed top-level fields", async () => {
    const province = await seedRegion(db, {
      level: "province",
      serviceEnabled: false,
      timezone: null,
      centerLatitude: null,
      centerLongitude: null,
    });
    const invalidRegion = await request(app, "/users/me", user.id, {
      method: "PATCH",
      body: JSON.stringify({ extra: { city: province.id } }),
    });
    expect(invalidRegion.status).toBe(400);

    const legacyShape = await request(app, "/users/me", user.id, {
      method: "PATCH",
      body: JSON.stringify({ userId: user.id, city: province.id, wechat: "old" }),
    });
    expect(legacyShape.status).toBe(400);
  });

  it("rejects every image mutation through profile PATCH", async () => {
    const ownKey = `avatars/${user.id}/owned.jpg`;

    const urlMutation = await request(app, "/users/me", user.id, {
      method: "PATCH",
      body: JSON.stringify({
        image: `https://test.r2.example.com/${ownKey}`,
      }),
    });
    const nullMutation = await request(app, "/users/me", user.id, {
      method: "PATCH",
      body: JSON.stringify({ image: null }),
    });

    expect(urlMutation.status).toBe(400);
    expect(nullMutation.status).toBe(400);
  });

  it("returns V2 created/joined team and join-request resources", async () => {
    const member = await seedUser(db);
    const region = await seedRegion(db);
    const location = await seedLocation(db, region.id);
    const team = await seedTeam(db, user.id, location.id);
    await seedTeamMember(db, team.id, member.id);
    await seedTeamJoinRequest(db, team.id, member.id);

    const created = await request(app, "/users/me/created-teams", user.id);
    await expect(created.json()).resolves.toMatchObject({
      success: true,
      teams: [{ id: team.id, activityType: "hiking" }],
    });

    const joined = await request(app, "/users/me/joined-teams", member.id);
    await expect(joined.json()).resolves.toMatchObject({
      success: true,
      teams: [{ id: team.id }],
    });

    const ownRequests = await request(app, "/users/me/join-requests", member.id);
    await expect(ownRequests.json()).resolves.toMatchObject({
      success: true,
      requests: [{ teamId: team.id, status: "pending" }],
    });

    const pending = await request(app, "/users/me/pending-join-requests", user.id);
    await expect(pending.json()).resolves.toMatchObject({
      success: true,
      requests: [{ teamId: team.id, userId: member.id }],
    });
  });

  it("keyset-paginates every authenticated user timeline at equal timestamps", async () => {
    const member = await seedUser(db, { id: "timeline-member" });
    const region = await seedRegion(db, { id: "timeline-region" });
    const location = await seedLocation(db, region.id, { id: "timeline-location" });
    const createdAt = new Date("2026-08-16T07:00:00.000Z");
    for (const id of ["team-a", "team-b", "team-c"]) {
      const team = await seedTeam(db, user.id, location.id, {
        id,
        createdAt,
      });
      await seedTeamMember(db, team.id, member.id, { joinedAt: createdAt });
      await seedTeamJoinRequest(db, team.id, member.id, {
        id: `request-${id.at(-1)}`,
        createdAt,
        updatedAt: createdAt,
      });
    }

    const cases = [
      {
        path: "/users/me/created-teams",
        userId: user.id,
        field: "teams",
        expected: ["team-c", "team-b", "team-a"],
      },
      {
        path: "/users/me/joined-teams",
        userId: member.id,
        field: "teams",
        expected: ["team-c", "team-b", "team-a"],
      },
      {
        path: "/users/me/join-requests",
        userId: member.id,
        field: "requests",
        expected: ["request-c", "request-b", "request-a"],
      },
      {
        path: "/users/me/pending-join-requests",
        userId: user.id,
        field: "requests",
        expected: ["request-c", "request-b", "request-a"],
      },
    ] as const;

    for (const timeline of cases) {
      const first = await request(app, `${timeline.path}?limit=2`, timeline.userId);
      expect(first.status, timeline.path).toBe(200);
      const firstBody = await first.json() as Record<string, unknown> & {
        nextCursor: string | null;
      };
      const firstItems = firstBody[timeline.field] as Array<{ id: string }>;
      expect(firstItems.map(({ id }) => id), timeline.path).toEqual(
        timeline.expected.slice(0, 2),
      );
      expect(firstBody.nextCursor, timeline.path).toMatch(/^[A-Za-z0-9_-]+$/u);

      const second = await request(
        app,
        `${timeline.path}?limit=2&cursor=${firstBody.nextCursor}`,
        timeline.userId,
      );
      const secondBody = await second.json() as Record<string, unknown> & {
        nextCursor: string | null;
      };
      const secondItems = secondBody[timeline.field] as Array<{ id: string }>;
      expect(secondItems.map(({ id }) => id), timeline.path).toEqual(
        timeline.expected.slice(2),
      );
      expect(secondBody.nextCursor, timeline.path).toBeNull();
      expect(
        new Set([...firstItems, ...secondItems].map(({ id }) => id)).size,
        timeline.path,
      ).toBe(3);
    }
  });

  it("rejects page aliases and malformed cursors on every user timeline", async () => {
    for (const path of [
      "/users/me/created-teams",
      "/users/me/joined-teams",
      "/users/me/join-requests",
      "/users/me/pending-join-requests",
    ]) {
      expect((await request(app, `${path}?page=2`, user.id)).status, path).toBe(400);
      expect((await request(app, `${path}?pageSize=10`, user.id)).status, path).toBe(400);
      expect(
        (await request(app, `${path}?cursor=${"a".repeat(513)}`, user.id)).status,
        path,
      ).toBe(400);
    }
  });
});
