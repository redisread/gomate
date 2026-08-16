import type { TeamChecklist } from "@gomate/types";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../../db/schema";
import { createTestDb } from "../helpers/db";

type TestDb = ReturnType<typeof createTestDb>["db"];
type TestSqlite = ReturnType<typeof createTestDb>["sqlite"];

let currentSession: {
  user: { id: string; email: string; name: string };
} | null = null;
let testDb: TestDb;
let testSqlite: TestSqlite;

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: { getSession: async () => currentSession },
  }),
}));

vi.mock("../../db", () => ({
  createDb: () => testDb,
}));

const { teamsRoute } = await import("../../routes/teams");

function createApp() {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route("/teams", teamsRoute);
  return app;
}

async function request(
  app: ReturnType<typeof createApp>,
  path: string,
  options: RequestInit = {},
) {
  return app.fetch(new Request(`http://localhost${path}`, options), {
    DB: {} as D1Database,
  });
}

function jsonRequest(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

async function seedUser(id: string) {
  await testDb.insert(schema.users).values({
    id,
    name: id,
    email: `${id}@example.com`,
    emailVerified: true,
  });
  return (
    await testDb.select().from(schema.users).where(eq(schema.users.id, id))
  )[0]!;
}

async function seedTeam(
  leaderId: string,
  checklist: TeamChecklist | null = null,
) {
  await testDb.insert(schema.region).values({
    id: "region-cn-shenzhen",
    countryCode: "CN",
    name: "深圳市",
    slug: "shenzhen",
    level: "city",
    timezone: "Asia/Shanghai",
    centerLatitude: 22.5,
    centerLongitude: 114,
    serviceEnabled: true,
  });
  await testDb.insert(schema.locations).values({
    id: "location-1",
    regionId: "region-cn-shenzhen",
    name: "梧桐山",
    slug: "wutongshan",
    supportedActivityTypes: ["hiking"],
    status: "published",
    description: "A location",
    latitude: 22.5,
    longitude: 114,
    coverImageUrl: "https://example.com/location.jpg",
  });
  const startAt = new Date(Date.now() + 86_400_000);
  await testDb.insert(schema.teams).values({
    id: "team-1",
    leaderId,
    locationId: "location-1",
    activityType: "hiking",
    title: "周末徒步",
    startAt,
    endAt: new Date(startAt.getTime() + 14_400_000),
    maxParticipants: 5,
    checklist,
  });
  return (
    await testDb
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.id, "team-1"))
  )[0]!;
}

async function seedMember(
  teamId: string,
  userId: string,
  leftAt: Date | null = null,
) {
  await testDb.insert(schema.teamMembers).values({
    teamId,
    userId,
    role: "member",
    leftAt,
  });
}

/**
 * Inserts a deterministic concurrent change after the route has read the team,
 * immediately before its next teams UPDATE is constructed.
 */
function beforeNextTeamUpdate(action: () => void) {
  const originalUpdate = testDb.update.bind(testDb);
  let armed = true;
  testDb.update = ((table: Parameters<TestDb["update"]>[0]) => {
    if (armed && table === schema.teams) {
      armed = false;
      action();
    }
    return originalUpdate(table);
  }) as TestDb["update"];
}

describe("Teams V2 checklist API", () => {
  let app: ReturnType<typeof createApp>;
  let leader: schema.User;
  let member: schema.User;
  let formerMember: schema.User;
  let stranger: schema.User;
  let team: schema.Team;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    testSqlite = fresh.sqlite;
    app = createApp();
    currentSession = null;

    leader = await seedUser("leader");
    member = await seedUser("member");
    formerMember = await seedUser("former-member");
    stranger = await seedUser("stranger");
    team = await seedTeam(leader.id, {
      assignments: [{ id: "water", task: "带水", assigneeIds: [] }],
    });
    await seedMember(team.id, member.id);
    await seedMember(team.id, formerMember.id, new Date());
  });

  function login(user: schema.User | null) {
    currentSession = user
      ? { user: { id: user.id, email: user.email, name: user.name } }
      : null;
  }

  it("allows only the leader to replace the checklist", async () => {
    const body = { notes: "新的约定", assignments: [] };
    expect(
      (
        await request(
          app,
          `/teams/${team.id}/checklist`,
          jsonRequest("PUT", body),
        )
      ).status,
    ).toBe(401);

    login(member);
    expect(
      (
        await request(
          app,
          `/teams/${team.id}/checklist`,
          jsonRequest("PUT", body),
        )
      ).status,
    ).toBe(403);

    login(leader);
    const response = await request(
      app,
      `/teams/${team.id}/checklist`,
      jsonRequest("PUT", body),
    );
    expect(response.status).toBe(200);
    const stored = (
      await testDb
        .select()
        .from(schema.teams)
        .where(eq(schema.teams.id, team.id))
    )[0]!;
    expect(stored.checklist).toEqual({ notes: "新的约定", assignments: [] });
  });

  it("reuses known assignment IDs, creates unknown IDs and deduplicates assignees", async () => {
    login(leader);
    const response = await request(
      app,
      `/teams/${team.id}/checklist`,
      jsonRequest("PUT", {
        assignments: [
          {
            id: "water",
            task: "带两瓶水",
            assigneeIds: [member.id, member.id],
          },
          { id: "client-id", task: "带急救包", assigneeIds: [] },
        ],
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { checklist: TeamChecklist };
    expect(body.checklist.assignments?.[0]).toEqual({
      id: "water",
      task: "带两瓶水",
      assigneeIds: [member.id],
    });
    expect(body.checklist.assignments?.[1]?.id).not.toBe("client-id");
  });

  it("rejects PUT assignees who are not the leader or current active members", async () => {
    login(leader);
    const response = await request(
      app,
      `/teams/${team.id}/checklist`,
      jsonRequest("PUT", {
        assignments: [
          {
            id: "water",
            task: "带水",
            assigneeIds: [member.id, formerMember.id, stranger.id],
          },
        ],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        details: { invalidAssigneeIds: [formerMember.id, stranger.id] },
      },
    });
    const stored = (
      await testDb
        .select()
        .from(schema.teams)
        .where(eq(schema.teams.id, team.id))
    )[0]!;
    expect(stored.checklist).toEqual(team.checklist);
  });

  it("allows the leader and current active members as PUT assignees", async () => {
    login(leader);
    const response = await request(
      app,
      `/teams/${team.id}/checklist`,
      jsonRequest("PUT", {
        assignments: [
          {
            id: "water",
            task: "带水",
            assigneeIds: [leader.id, member.id],
          },
        ],
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { checklist: TeamChecklist };
    expect(body.checklist.assignments?.[0]?.assigneeIds).toEqual([
      leader.id,
      member.id,
    ]);
  });

  it("rejects PUT when an assignee leaves after validation but before the update", async () => {
    login(leader);
    beforeNextTeamUpdate(() => {
      testSqlite
        .prepare(
          "UPDATE team_members SET left_at = ? WHERE team_id = ? AND user_id = ?",
        )
        .run(Date.now(), team.id, member.id);
    });

    const response = await request(
      app,
      `/teams/${team.id}/checklist`,
      jsonRequest("PUT", {
        assignments: [{ id: "water", task: "带水", assigneeIds: [member.id] }],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        details: { invalidAssigneeIds: [member.id] },
      },
    });
    const stored = (
      await testDb
        .select()
        .from(schema.teams)
        .where(eq(schema.teams.id, team.id))
    )[0]!;
    expect(stored.checklist).toEqual(team.checklist);
  });

  it("validates checklist content and the serialized size limit", async () => {
    login(leader);
    const invalid = await request(
      app,
      `/teams/${team.id}/checklist`,
      jsonRequest("PUT", {
        assignments: [{ task: "", assigneeIds: [] }],
      }),
    );
    expect(invalid.status).toBe(400);

    const oversized = await request(
      app,
      `/teams/${team.id}/checklist`,
      jsonRequest("PUT", {
        notes: "x".repeat(2_001),
        assignments: Array.from({ length: 10 }, (_, index) => ({
          task: `task-${index}-${"y".repeat(50)}`,
        })),
      }),
    );
    expect(oversized.status).toBe(400);
  });

  it("measures the checklist limit in UTF-8 bytes for multibyte content", async () => {
    login(leader);
    const response = await request(
      app,
      `/teams/${team.id}/checklist`,
      jsonRequest("PUT", {
        notes: "你".repeat(700),
        assignments: [],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        details: [
          expect.objectContaining({
            message: expect.stringContaining("字节"),
          }),
        ],
      },
    });
  });

  it("lets an active member claim idempotently", async () => {
    login(member);
    const first = await request(
      app,
      `/teams/${team.id}/checklist/assignments/water/claim`,
      jsonRequest("POST"),
    );
    expect(first.status).toBe(200);
    const second = await request(
      app,
      `/teams/${team.id}/checklist/assignments/water/claim`,
      jsonRequest("POST"),
    );
    expect(second.status).toBe(200);
    const stored = (
      await testDb
        .select()
        .from(schema.teams)
        .where(eq(schema.teams.id, team.id))
    )[0]!;
    expect(stored.checklist?.assignments?.[0]?.assigneeIds).toEqual([
      member.id,
    ]);
  });

  it("rejects a claim when membership is lost between the read and conditional update", async () => {
    login(member);
    beforeNextTeamUpdate(() => {
      testSqlite
        .prepare(
          "UPDATE team_members SET left_at = ? WHERE team_id = ? AND user_id = ?",
        )
        .run(Date.now(), team.id, member.id);
    });

    const response = await request(
      app,
      `/teams/${team.id}/checklist/assignments/water/claim`,
      jsonRequest("POST"),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
    const stored = (
      await testDb
        .select()
        .from(schema.teams)
        .where(eq(schema.teams.id, team.id))
    )[0]!;
    expect(stored.checklist?.assignments?.[0]?.assigneeIds).toEqual([]);
  });

  it("preserves a same-timestamp checklist write by comparing checklist content in the CAS", async () => {
    login(member);
    beforeNextTeamUpdate(() => {
      const before = testSqlite
        .prepare("SELECT updated_at AS updatedAt FROM teams WHERE id = ?")
        .get(team.id) as { updatedAt: number };
      testSqlite.prepare("UPDATE teams SET checklist = ? WHERE id = ?").run(
        JSON.stringify({
          assignments: [
            { id: "water", task: "带水", assigneeIds: [leader.id] },
          ],
        }),
        team.id,
      );
      const after = testSqlite
        .prepare("SELECT updated_at AS updatedAt FROM teams WHERE id = ?")
        .get(team.id) as { updatedAt: number };
      expect(after.updatedAt).toBe(before.updatedAt);
    });

    const response = await request(
      app,
      `/teams/${team.id}/checklist/assignments/water/claim`,
      jsonRequest("POST"),
    );

    expect(response.status).toBe(200);
    const stored = (
      await testDb
        .select()
        .from(schema.teams)
        .where(eq(schema.teams.id, team.id))
    )[0]!;
    expect(stored.checklist?.assignments?.[0]?.assigneeIds).toEqual([
      leader.id,
      member.id,
    ]);
  });

  it("treats leftAt as the membership boundary for claims", async () => {
    login(formerMember);
    expect(
      (
        await request(
          app,
          `/teams/${team.id}/checklist/assignments/water/claim`,
          jsonRequest("POST"),
        )
      ).status,
    ).toBe(403);

    login(stranger);
    expect(
      (
        await request(
          app,
          `/teams/${team.id}/checklist/assignments/water/claim`,
          jsonRequest("POST"),
        )
      ).status,
    ).toBe(403);
  });

  it("allows the leader to claim without a team_members row", async () => {
    login(leader);
    const response = await request(
      app,
      `/teams/${team.id}/checklist/assignments/water/claim`,
      jsonRequest("POST"),
    );
    expect(response.status).toBe(200);
    expect(
      await testDb
        .select()
        .from(schema.teamMembers)
        .where(
          and(
            eq(schema.teamMembers.teamId, team.id),
            eq(schema.teamMembers.userId, leader.id),
          ),
        ),
    ).toEqual([]);
  });

  it("unclaims idempotently while preserving the membership row", async () => {
    await testDb
      .update(schema.teams)
      .set({
        checklist: {
          assignments: [
            { id: "water", task: "带水", assigneeIds: [member.id] },
          ],
        },
      })
      .where(eq(schema.teams.id, team.id));
    login(member);

    const first = await request(
      app,
      `/teams/${team.id}/checklist/assignments/water/claim`,
      { method: "DELETE" },
    );
    expect(first.status).toBe(204);
    const second = await request(
      app,
      `/teams/${team.id}/checklist/assignments/water/claim`,
      { method: "DELETE" },
    );
    expect(second.status).toBe(204);
    const membership = await testDb
      .select()
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.userId, member.id));
    expect(membership).toHaveLength(1);
    expect(membership[0]?.leftAt).toBeNull();
  });

  it("rejects an unclaim when membership is lost between the read and conditional update", async () => {
    await testDb
      .update(schema.teams)
      .set({
        checklist: {
          assignments: [
            { id: "water", task: "带水", assigneeIds: [member.id] },
          ],
        },
      })
      .where(eq(schema.teams.id, team.id));
    login(member);
    beforeNextTeamUpdate(() => {
      testSqlite
        .prepare(
          "UPDATE team_members SET left_at = ? WHERE team_id = ? AND user_id = ?",
        )
        .run(Date.now(), team.id, member.id);
    });

    const response = await request(
      app,
      `/teams/${team.id}/checklist/assignments/water/claim`,
      { method: "DELETE" },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
    const stored = (
      await testDb
        .select()
        .from(schema.teams)
        .where(eq(schema.teams.id, team.id))
    )[0]!;
    expect(stored.checklist?.assignments?.[0]?.assigneeIds).toEqual([
      member.id,
    ]);
  });

  it("keeps checklist private from visitors and former members", async () => {
    login(null);
    const visitor = await request(app, `/teams/${team.id}`);
    expect(visitor.status).toBe(200);
    expect(
      ((await visitor.json()) as { team: { checklist: unknown } }).team
        .checklist,
    ).toBeNull();

    login(formerMember);
    const former = await request(app, `/teams/${team.id}`);
    expect(
      ((await former.json()) as { team: { checklist: unknown } }).team
        .checklist,
    ).toBeNull();

    login(member);
    const active = await request(app, `/teams/${team.id}`);
    expect(
      ((await active.json()) as { team: { checklist: unknown } }).team
        .checklist,
    ).toEqual(team.checklist);
  });
});
