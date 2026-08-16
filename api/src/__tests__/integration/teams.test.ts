import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../../db/schema";
import { createTestDb } from "../helpers/db";

type TestDb = ReturnType<typeof createTestDb>["db"];
type TestSqlite = ReturnType<typeof createTestDb>["sqlite"];
type BindValue = string | number | null;
type TestD1Database = D1Database & {
  beforeNextBatch: (() => void) | null;
};

let currentSession: { user: { id: string; email: string; name: string } } | null = null;
let testDb: TestDb;

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: { getSession: async () => currentSession },
  }),
}));

vi.mock("../../db", () => ({
  createDb: () => testDb,
}));

const { teamsRoute } = await import("../../routes/teams");

class TestD1Statement {
  constructor(
    private readonly sqlite: TestSqlite,
    private readonly sql: string,
    private readonly values: BindValue[] = [],
  ) {}

  bind(...values: BindValue[]) {
    return new TestD1Statement(this.sqlite, this.sql, values);
  }

  execute() {
    const result = this.sqlite.prepare(this.sql).run(...this.values);
    return {
      success: true,
      results: [],
      meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) },
    };
  }

  async run() {
    return this.execute();
  }
}

function createD1Binding(sqlite: TestSqlite): TestD1Database {
  const binding = {
    beforeNextBatch: null as (() => void) | null,
    prepare(sql: string) {
      return new TestD1Statement(sqlite, sql);
    },
    async batch(statements: D1PreparedStatement[]) {
      binding.beforeNextBatch?.();
      binding.beforeNextBatch = null;
      const executeBatch = sqlite.transaction((items: TestD1Statement[]) =>
        items.map((statement) => statement.execute()),
      );
      return executeBatch(statements as unknown as TestD1Statement[]);
    },
  };
  return binding as unknown as TestD1Database;
}

function createApp() {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route("/teams", teamsRoute);
  return app;
}

async function request(
  app: ReturnType<typeof createApp>,
  d1: D1Database,
  path: string,
  options: RequestInit = {},
) {
  return app.fetch(new Request(`http://localhost${path}`, options), { DB: d1 });
}

function jsonRequest(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

function login(user: schema.User | null) {
  currentSession = user
    ? { user: { id: user.id, email: user.email, name: user.name } }
    : null;
}

async function seedUser(id: string, extra: schema.UserExtra = {}) {
  await testDb.insert(schema.users).values({
    id,
    name: id,
    email: `${id}@example.com`,
    emailVerified: true,
    extra,
  });
  return (await testDb.select().from(schema.users).where(eq(schema.users.id, id)))[0]!;
}

async function seedRegion(id: string, name: string) {
  await testDb.insert(schema.region).values({
    id,
    countryCode: "CN",
    name,
    nameEn: name,
    slug: id,
    level: "city",
    timezone: "Asia/Shanghai",
    centerLatitude: 22.5,
    centerLongitude: 114,
    serviceEnabled: true,
  });
  return (await testDb.select().from(schema.region).where(eq(schema.region.id, id)))[0]!;
}

async function seedLocation(
  id: string,
  regionId: string,
  supportedActivityTypes: schema.ActivityType[] = ["hiking"],
) {
  await testDb.insert(schema.locations).values({
    id,
    regionId,
    name: id,
    slug: id,
    supportedActivityTypes,
    status: "published",
    description: `${id} description`,
    latitude: 22.5,
    longitude: 114,
    coverImageUrl: `https://example.com/${id}.jpg`,
  });
  return (await testDb.select().from(schema.locations).where(eq(schema.locations.id, id)))[0]!;
}

async function seedTeam(
  id: string,
  leaderId: string,
  locationId: string,
  overrides: Partial<typeof schema.teams.$inferInsert> = {},
) {
  const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await testDb.insert(schema.teams).values({
    id,
    leaderId,
    locationId,
    activityType: "hiking",
    title: id,
    startAt,
    endAt: new Date(startAt.getTime() + 4 * 60 * 60 * 1000),
    maxParticipants: 3,
    requirements: [],
    ...overrides,
  });
  return (await testDb.select().from(schema.teams).where(eq(schema.teams.id, id)))[0]!;
}

async function seedJoinRequest(id: string, teamId: string, userId: string) {
  await testDb.insert(schema.teamJoinRequests).values({ id, teamId, userId });
  return (await testDb
    .select()
    .from(schema.teamJoinRequests)
    .where(eq(schema.teamJoinRequests.id, id)))[0]!;
}

async function seedMember(
  teamId: string,
  userId: string,
  options: { joinedAt?: Date; leftAt?: Date | null } = {},
) {
  await testDb.insert(schema.teamMembers).values({
    teamId,
    userId,
    role: "member",
    joinedAt: options.joinedAt ?? new Date(),
    leftAt: options.leftAt ?? null,
  });
}

describe("Teams V2 API", () => {
  let app: ReturnType<typeof createApp>;
  let d1: TestD1Database;
  let leader: schema.User;
  let member: schema.User;
  let otherMember: schema.User;
  let location: schema.Location;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    d1 = createD1Binding(fresh.sqlite);
    app = createApp();
    currentSession = null;

    leader = await seedUser("leader", { wechat: "leader-wx", city: "region-cn-shenzhen" });
    member = await seedUser("member", { wechat: "member-wx" });
    otherMember = await seedUser("other-member");
    await seedRegion("region-cn-shenzhen", "深圳市");
    location = await seedLocation("location-1", "region-cn-shenzhen", ["hiking", "explore"]);
  });

  it("creates a V2 team only when the location supports its activity and never inserts the leader as a member", async () => {
    await testDb.insert(schema.tags).values({ id: "tag-weekend", name: "Weekend", slug: "weekend" });
    login(leader);

    const unsupported = await request(app, d1, "/teams", jsonRequest("POST", {
      locationId: location.id,
      activityType: "travel",
      title: "Unsupported",
      startAt: new Date(Date.now() + 86_400_000).toISOString(),
      endAt: new Date(Date.now() + 90_000_000).toISOString(),
      maxParticipants: 3,
    }));
    expect(unsupported.status).toBe(422);

    const response = await request(app, d1, "/teams", jsonRequest("POST", {
      locationId: location.id,
      activityType: "hiking",
      title: "Weekend hike",
      description: "A V2 team",
      startAt: new Date(Date.now() + 86_400_000).toISOString(),
      endAt: new Date(Date.now() + 90_000_000).toISOString(),
      maxParticipants: 3,
      requirements: ["Bring water"],
      tagIds: ["tag-weekend"],
    }));

    expect(response.status).toBe(201);
    const body = await response.json() as { team: { id: string; activityType: string; lifecycle: string } };
    expect(body.team.activityType).toBe("hiking");
    expect(body.team.lifecycle).toBe("pending");

    const members = await testDb.select().from(schema.teamMembers)
      .where(eq(schema.teamMembers.teamId, body.team.id));
    expect(members).toEqual([]);
    const tags = await testDb.select().from(schema.teamTags)
      .where(eq(schema.teamTags.teamId, body.team.id));
    expect(tags.map((tag) => tag.tagId)).toEqual(["tag-weekend"]);
  });

  it("filters more than 100 tagged teams without expanding IDs into D1 bindings", async () => {
    await testDb.insert(schema.tags).values({
      id: "tag-large-team-feed",
      name: "Large feed",
      slug: "large-team-feed",
    });
    const startAt = new Date(Date.now() + 7 * 86_400_000);
    const teamIds = Array.from({ length: 101 }, (_, index) =>
      `team-large-${String(index).padStart(3, "0")}`
    );
    await testDb.insert(schema.teams).values(teamIds.map((id, index) => ({
      id,
      locationId: location.id,
      leaderId: leader.id,
      activityType: "hiking" as const,
      title: id,
      startAt: new Date(startAt.getTime() + index * 60_000),
      endAt: new Date(startAt.getTime() + index * 60_000 + 3_600_000),
      maxParticipants: 3,
      requirements: [],
    })));
    await testDb.insert(schema.teamTags).values(teamIds.map((teamId) => ({
      teamId,
      tagId: "tag-large-team-feed",
    })));

    const response = await request(
      app,
      d1,
      "/teams?tagIds=tag-large-team-feed&limit=100",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      total: 101,
      nextCursor: expect.any(String),
      teams: expect.any(Array),
    });
  });

  it("creates a pending join request without creating a member row and rejects leader self-join", async () => {
    const team = await seedTeam("team-join", leader.id, location.id);
    login(member);

    const response = await request(
      app,
      d1,
      `/teams/${team.id}/join`,
      jsonRequest("POST", { message: "May I join?" }),
    );
    expect(response.status).toBe(201);

    const requests = await testDb.select().from(schema.teamJoinRequests)
      .where(and(
        eq(schema.teamJoinRequests.teamId, team.id),
        eq(schema.teamJoinRequests.userId, member.id),
      ));
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ status: "pending", message: "May I join?" });
    expect(await testDb.select().from(schema.teamMembers)).toEqual([]);

    login(leader);
    const leaderJoin = await request(app, d1, `/teams/${team.id}/join`, jsonRequest("POST"));
    expect(leaderJoin.status).toBe(409);
  });

  it("updates V2 fields and tags only for the leader and a supported activity", async () => {
    const team = await seedTeam("team-update", leader.id, location.id);
    await testDb.insert(schema.tags).values([
      { id: "tag-old", name: "Old", slug: "old" },
      { id: "tag-new", name: "New", slug: "new" },
    ]);
    await testDb.insert(schema.teamTags).values({ teamId: team.id, tagId: "tag-old" });

    login(member);
    const forbidden = await request(app, d1, `/teams/${team.id}`, jsonRequest("PUT", {
      activityType: "explore",
    }));
    expect(forbidden.status).toBe(403);

    login(leader);
    const unsupported = await request(app, d1, `/teams/${team.id}`, jsonRequest("PUT", {
      activityType: "travel",
      tagIds: ["tag-new"],
    }));
    expect(unsupported.status).toBe(409);
    expect((await testDb.select().from(schema.teamTags)
      .where(eq(schema.teamTags.teamId, team.id))).map(({ tagId }) => tagId))
      .toEqual(["tag-old"]);

    const updated = await request(app, d1, `/teams/${team.id}`, jsonRequest("PUT", {
      activityType: "explore",
      title: "Updated team",
      tagIds: ["tag-new"],
    }));
    expect(updated.status).toBe(200);
    const persisted = (await testDb.select().from(schema.teams)
      .where(eq(schema.teams.id, team.id)))[0]!;
    expect(persisted).toMatchObject({ activityType: "explore", title: "Updated team" });
    expect((await testDb.select().from(schema.teamTags)
      .where(eq(schema.teamTags.teamId, team.id))).map(({ tagId }) => tagId))
      .toEqual(["tag-new"]);
  });

  it("rolls tag replacement back when shrinking capacity fails", async () => {
    const team = await seedTeam("team-shrink", leader.id, location.id, { maxParticipants: 2 });
    await seedMember(team.id, member.id);
    await seedMember(team.id, otherMember.id);
    await testDb.insert(schema.tags).values([
      { id: "tag-before", name: "Before", slug: "before" },
      { id: "tag-after", name: "After", slug: "after" },
    ]);
    await testDb.insert(schema.teamTags).values({ teamId: team.id, tagId: "tag-before" });
    login(leader);

    const response = await request(app, d1, `/teams/${team.id}`, jsonRequest("PUT", {
      maxParticipants: 1,
      tagIds: ["tag-after"],
    }));
    expect(response.status).toBe(409);
    expect((await testDb.select().from(schema.teams)
      .where(eq(schema.teams.id, team.id)))[0]?.maxParticipants).toBe(2);
    expect((await testDb.select().from(schema.teamTags)
      .where(eq(schema.teamTags.teamId, team.id))).map(({ tagId }) => tagId))
      .toEqual(["tag-before"]);
  });

  it("does not replace tags when the location becomes unavailable after the precheck", async () => {
    const team = await seedTeam("team-location-race", leader.id, location.id);
    await testDb.insert(schema.tags).values([
      { id: "tag-race-before", name: "Race Before", slug: "race-before" },
      { id: "tag-race-after", name: "Race After", slug: "race-after" },
    ]);
    await testDb.insert(schema.teamTags).values({
      teamId: team.id,
      tagId: "tag-race-before",
    });
    const teamBefore = await testDb.query.teams.findFirst({
      where: eq(schema.teams.id, team.id),
    });
    const linksBefore = await testDb.select().from(schema.teamTags)
      .where(eq(schema.teamTags.teamId, team.id));
    const dictionaryBefore = await testDb.select().from(schema.tags)
      .orderBy(schema.tags.id);
    const now = teamBefore!.updatedAt.getTime();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    d1.beforeNextBatch = () => {
      testDb.update(schema.locations)
        .set({ status: "draft" })
        .where(eq(schema.locations.id, location.id))
        .run();
    };
    login(leader);

    try {
      const response = await request(
        app,
        d1,
        `/teams/${team.id}`,
        jsonRequest("PUT", { tagIds: ["tag-race-after"] }),
      );

      expect(response.status).toBe(409);
      expect(await testDb.query.teams.findFirst({
        where: eq(schema.teams.id, team.id),
      })).toEqual(teamBefore);
      expect(await testDb.select().from(schema.teamTags)
        .where(eq(schema.teamTags.teamId, team.id))).toEqual(linksBefore);
      expect(await testDb.select().from(schema.tags)
        .orderBy(schema.tags.id)).toEqual(dictionaryBefore);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("approves by requestId in one D1 batch and makes retry a conflict", async () => {
    const team = await seedTeam("team-approve", leader.id, location.id);
    const joinRequest = await seedJoinRequest("request-1", team.id, member.id);
    login(leader);

    const approve = await request(
      app,
      d1,
      `/teams/${team.id}/join-requests/${joinRequest.id}/approve`,
      jsonRequest("POST"),
    );
    expect(approve.status).toBe(200);

    const persistedRequest = (await testDb.select().from(schema.teamJoinRequests)
      .where(eq(schema.teamJoinRequests.id, joinRequest.id)))[0]!;
    expect(persistedRequest.status).toBe("approved");
    expect(persistedRequest.decidedByUserId).toBe(leader.id);

    const activeMember = (await testDb.select().from(schema.teamMembers)
      .where(and(
        eq(schema.teamMembers.teamId, team.id),
        eq(schema.teamMembers.userId, member.id),
        isNull(schema.teamMembers.leftAt),
      )))[0]!;
    expect(activeMember.role).toBe("member");
    expect(await testDb.select().from(schema.teamMembers)
      .where(eq(schema.teamMembers.userId, leader.id))).toEqual([]);

    const retry = await request(
      app,
      d1,
      `/teams/${team.id}/join-requests/${joinRequest.id}/approve`,
      jsonRequest("POST"),
    );
    expect(retry.status).toBe(409);
  });

  it("rolls the entire approval batch back when the capacity trigger rejects the member", async () => {
    const team = await seedTeam("team-full", leader.id, location.id, { maxParticipants: 1 });
    await seedMember(team.id, otherMember.id);
    const joinRequest = await seedJoinRequest("request-full", team.id, member.id);
    login(leader);

    const response = await request(
      app,
      d1,
      `/teams/${team.id}/join-requests/${joinRequest.id}/approve`,
      jsonRequest("POST"),
    );
    expect(response.status).toBe(409);

    const persistedRequest = (await testDb.select().from(schema.teamJoinRequests)
      .where(eq(schema.teamJoinRequests.id, joinRequest.id)))[0]!;
    expect(persistedRequest.status).toBe("pending");
    expect(await testDb.select().from(schema.teamMembers)
      .where(eq(schema.teamMembers.userId, member.id))).toEqual([]);
  });

  it("does not decide a pending request when the user is already active", async () => {
    const team = await seedTeam("team-already-active", leader.id, location.id);
    await seedMember(team.id, member.id, { joinedAt: new Date() });
    const joinRequest = await seedJoinRequest("request-already-active", team.id, member.id);
    login(leader);

    const response = await request(
      app,
      d1,
      `/teams/${team.id}/join-requests/${joinRequest.id}/approve`,
      jsonRequest("POST"),
    );
    expect(response.status).toBe(409);
    const persisted = (await testDb.select().from(schema.teamJoinRequests)
      .where(eq(schema.teamJoinRequests.id, joinRequest.id)))[0]!;
    expect(persisted.status).toBe("pending");
  });

  it("reactivates a historical member by clearing leftAt and refreshing joinedAt", async () => {
    const team = await seedTeam("team-reactivate", leader.id, location.id);
    const oldJoinedAt = new Date(Date.now() - 10_000);
    await seedMember(team.id, member.id, {
      joinedAt: oldJoinedAt,
      leftAt: new Date(Date.now() - 5_000),
    });
    const joinRequest = await seedJoinRequest("request-reactivate", team.id, member.id);
    login(leader);

    const response = await request(
      app,
      d1,
      `/teams/${team.id}/join-requests/${joinRequest.id}/approve`,
      jsonRequest("POST"),
    );
    expect(response.status).toBe(200);

    const membership = (await testDb.select().from(schema.teamMembers)
      .where(and(
        eq(schema.teamMembers.teamId, team.id),
        eq(schema.teamMembers.userId, member.id),
      )))[0]!;
    expect(membership.leftAt).toBeNull();
    expect(membership.joinedAt.getTime()).toBeGreaterThan(oldJoinedAt.getTime());
  });

  it("leave and leader removal preserve membership history by setting leftAt", async () => {
    const team = await seedTeam("team-leave", leader.id, location.id);
    await seedMember(team.id, member.id);
    await seedMember(team.id, otherMember.id);

    login(member);
    const leave = await request(app, d1, `/teams/${team.id}/leave`, jsonRequest("POST"));
    expect(leave.status).toBe(200);

    login(leader);
    const remove = await request(
      app,
      d1,
      `/teams/${team.id}/members/${otherMember.id}/remove`,
      jsonRequest("POST"),
    );
    expect(remove.status).toBe(200);

    const memberships = await testDb.select().from(schema.teamMembers)
      .where(eq(schema.teamMembers.teamId, team.id));
    expect(memberships).toHaveLength(2);
    expect(memberships.every((membership) => membership.leftAt !== null)).toBe(true);
  });

  it("forms and cancels through stored timestamps while lifecycle remains derived", async () => {
    const team = await seedTeam("team-actions", leader.id, location.id);
    login(leader);

    const form = await request(app, d1, `/teams/${team.id}/form`, jsonRequest("POST"));
    expect(form.status).toBe(200);
    const formedBody = await form.json() as { team: { lifecycle: string; recruitmentStatus: string } };
    expect(formedBody.team.lifecycle).toBe("formed");
    expect(formedBody.team.recruitmentStatus).toBe("closed");

    const cancel = await request(app, d1, `/teams/${team.id}/cancel`, jsonRequest("POST"));
    expect(cancel.status).toBe(200);
    const cancelledBody = await cancel.json() as { team: { lifecycle: string } };
    expect(cancelledBody.team.lifecycle).toBe("cancelled");
  });

  it("filters the V2 list by regionId and returns active participants without the leader", async () => {
    const otherRegion = await seedRegion("region-cn-guangzhou", "广州市");
    const otherLocation = await seedLocation("location-2", otherRegion.id);
    const expected = await seedTeam("team-shenzhen", leader.id, location.id);
    await seedTeam("team-guangzhou", leader.id, otherLocation.id);
    await seedMember(expected.id, member.id);
    await seedMember(expected.id, otherMember.id, { leftAt: new Date() });

    const response = await request(app, d1, "/teams?regionId=region-cn-shenzhen");
    expect(response.status).toBe(200);
    const body = await response.json() as {
      teams: Array<{
        id: string;
        activeParticipantCount: number;
        maxParticipants: number;
        leader: { extra: { wechat: string | null } };
      }>;
    };
    expect(body.teams).toHaveLength(1);
    expect(body.teams[0]).toMatchObject({
      id: expected.id,
      activeParticipantCount: 1,
      maxParticipants: 3,
    });
    expect(body.teams[0]?.leader.extra.wechat).toBeNull();

    login(member);
    const detail = await request(app, d1, `/teams/${expected.id}`);
    const detailBody = await detail.json() as {
      team: { leader: { extra: { wechat: string | null } } };
    };
    expect(detailBody.team.leader.extra.wechat).toBe("leader-wx");
  });

  it("paginates the team timeline by stable startAt/id keysets", async () => {
    const startAt = new Date("2026-09-01T01:00:00.000Z");
    const endAt = new Date("2026-09-01T05:00:00.000Z");
    for (const id of ["team-a", "team-b", "team-c"]) {
      await seedTeam(id, leader.id, location.id, { startAt, endAt });
    }

    const first = await request(app, d1, "/teams?limit=2");
    expect(first.status).toBe(200);
    const firstBody = await first.json() as {
      teams: Array<{ id: string }>;
      total: number;
      nextCursor: string | null;
    };
    expect(firstBody.teams.map(({ id }) => id)).toEqual(["team-a", "team-b"]);
    expect(firstBody.total).toBe(3);
    expect(firstBody.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/u);

    const second = await request(
      app,
      d1,
      `/teams?limit=2&cursor=${firstBody.nextCursor}`,
    );
    const secondBody = await second.json() as {
      teams: Array<{ id: string }>;
      total: number;
      nextCursor: string | null;
    };
    expect(secondBody.teams.map(({ id }) => id)).toEqual(["team-c"]);
    expect(secondBody.total).toBe(3);
    expect(secondBody.nextCursor).toBeNull();
    expect(
      new Set([
        ...firstBody.teams.map(({ id }) => id),
        ...secondBody.teams.map(({ id }) => id),
      ]).size,
    ).toBe(3);
  });

  it("rejects removed page parameters and malformed team cursors", async () => {
    expect((await request(app, d1, "/teams?page=2")).status).toBe(400);
    expect((await request(app, d1, "/teams?pageSize=12")).status).toBe(400);
    expect((await request(app, d1, "/teams?cursor=%%% ")).status).toBe(400);
    expect(
      (await request(app, d1, `/teams?cursor=${"a".repeat(513)}`)).status,
    ).toBe(400);
  });
});
