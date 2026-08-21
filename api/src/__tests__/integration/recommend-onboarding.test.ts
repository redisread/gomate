import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../../db/schema";
import { createTestDb } from "../helpers/db";

type TestDb = ReturnType<typeof createTestDb>["db"];

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
const DAY = 24 * 60 * 60 * 1_000;

function createApp() {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route("/teams", teamsRoute);
  return app;
}

async function request(app: ReturnType<typeof createApp>, path: string) {
  return app.fetch(new Request(`http://localhost${path}`), { DB: {} as D1Database });
}

async function seedUser(id: string, city: string | null = null) {
  await testDb.insert(schema.users).values({
    id,
    name: id,
    email: `${id}@example.com`,
    emailVerified: true,
    extra: city ? { city } : {},
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
}

async function seedLocation(id: string, regionId: string) {
  await testDb.insert(schema.locations).values({
    id,
    regionId,
    name: id,
    slug: id,
    supportedActivityTypes: ["hiking", "explore", "leisure", "travel"],
    status: "published",
    description: `${id} description`,
    latitude: 22.5,
    longitude: 114,
    coverImageUrl: `https://example.com/${id}.jpg`,
  });
}

async function seedTeam(
  id: string,
  leaderId: string,
  locationId: string,
  overrides: Partial<typeof schema.teams.$inferInsert> = {},
) {
  const startAt = new Date(Date.now() + DAY);
  await testDb.insert(schema.teams).values({
    id,
    leaderId,
    locationId,
    activityType: "hiking",
    title: id,
    startAt,
    endAt: new Date(startAt.getTime() + 4 * 60 * 60 * 1_000),
    maxParticipants: 3,
    ...overrides,
  });
  return (await testDb.select().from(schema.teams).where(eq(schema.teams.id, id)))[0]!;
}

async function seedMember(teamId: string, userId: string, leftAt: Date | null = null) {
  await testDb.insert(schema.teamMembers).values({
    teamId,
    userId,
    leftAt,
  });
}

interface Candidate {
  id: string;
  title: string;
  activityType: schema.ActivityType;
  startAt: string;
  maxParticipants: number;
  activeParticipantCount: number;
  locationName: string;
  regionName: string;
  coverImageUrl: string;
}

interface RecommendResponse {
  hasAnyMembership: boolean;
  candidates: Candidate[];
  fallbackNoType: boolean;
  regionId: string;
}

describe("GET /teams/recommend-onboarding V2", () => {
  let app: ReturnType<typeof createApp>;
  let user: schema.User;
  let leader: schema.User;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    app = createApp();
    currentSession = null;

    user = await seedUser("new-user");
    leader = await seedUser("leader");
    await seedRegion("region-cn-shenzhen", "深圳市");
    await seedRegion("region-cn-guangzhou", "广州市");
    await seedLocation("location-shenzhen", "region-cn-shenzhen");
    await seedLocation("location-guangzhou", "region-cn-guangzhou");
  });

  function login(as = user) {
    currentSession = { user: { id: as.id, email: as.email, name: as.name } };
  }

  async function call(path = "/teams/recommend-onboarding") {
    const response = await request(app, path);
    expect(response.status).toBe(200);
    return response.json() as Promise<RecommendResponse>;
  }

  it("requires authentication and rejects unknown activity types", async () => {
    expect((await request(app, "/teams/recommend-onboarding")).status).toBe(401);
    login();
    expect((await request(app, "/teams/recommend-onboarding?activityType=unknown")).status).toBe(400);
  });

  it("filters by Team activityType and falls back without the preference", async () => {
    await seedTeam("hike", leader.id, "location-shenzhen", {
      title: "徒步队",
      activityType: "hiking",
    });
    await seedTeam("leisure", leader.id, "location-shenzhen", {
      title: "休闲队",
      activityType: "leisure",
    });
    login();

    const hiking = await call("/teams/recommend-onboarding?activityType=hiking");
    expect(hiking.candidates.map(({ title }) => title)).toEqual(["徒步队"]);
    expect(hiking.candidates[0]).toMatchObject({
      activityType: "hiking",
      locationName: "location-shenzhen",
      regionName: "深圳市",
    });
    expect(hiking.fallbackNoType).toBe(false);

    const fallback = await call("/teams/recommend-onboarding?activityType=travel");
    expect(fallback.candidates.map(({ title }) => title)).toEqual(["徒步队", "休闲队"]);
    expect(fallback.fallbackNoType).toBe(true);
  });

  it("uses regionId query, then users.extra.city, then the stable Shenzhen fallback", async () => {
    await seedTeam("sz", leader.id, "location-shenzhen", { title: "深圳队" });
    await seedTeam("gz", leader.id, "location-guangzhou", { title: "广州队" });

    login();
    const fallback = await call();
    expect(fallback.regionId).toBe("region-cn-shenzhen");
    expect(fallback.candidates.map(({ title }) => title)).toEqual(["深圳队"]);

    const guangzhouUser = await seedUser("guangzhou-user", "region-cn-guangzhou");
    login(guangzhouUser);
    const fromProfile = await call();
    expect(fromProfile.regionId).toBe("region-cn-guangzhou");
    expect(fromProfile.candidates.map(({ title }) => title)).toEqual(["广州队"]);

    const explicit = await call("/teams/recommend-onboarding?regionId=region-cn-shenzhen");
    expect(explicit.regionId).toBe("region-cn-shenzhen");
    expect(explicit.candidates.map(({ title }) => title)).toEqual(["深圳队"]);
  });

  it("excludes full, closed, cancelled, formed and out-of-window teams", async () => {
    const other = await seedUser("other-member");
    const full = await seedTeam("full", leader.id, "location-shenzhen", {
      maxParticipants: 1,
    });
    await seedMember(full.id, other.id);
    const leftOnly = await seedTeam("left-only", leader.id, "location-shenzhen", {
      title: "仍有空位",
      maxParticipants: 1,
    });
    await seedMember(leftOnly.id, user.id, new Date());
    await seedTeam("closed", leader.id, "location-shenzhen", { recruitmentStatus: "closed" });
    await seedTeam("cancelled", leader.id, "location-shenzhen", { cancelledAt: new Date() });
    await seedTeam("formed", leader.id, "location-shenzhen", { formedAt: new Date() });
    await seedTeam("past", leader.id, "location-shenzhen", {
      startAt: new Date(Date.now() - DAY),
      endAt: new Date(Date.now() - DAY / 2),
    });
    await seedTeam("far", leader.id, "location-shenzhen", {
      startAt: new Date(Date.now() + 15 * DAY),
      endAt: new Date(Date.now() + 16 * DAY),
    });
    login();

    const body = await call();
    expect(body.candidates.map(({ title }) => title)).toEqual(["仍有空位"]);
    expect(body.candidates[0]?.activeParticipantCount).toBe(0);
  });

  it("counts leadership, active membership and pending requests, but not history", async () => {
    const team = await seedTeam("membership-team", leader.id, "location-shenzhen");
    login();
    expect((await call()).hasAnyMembership).toBe(false);

    await testDb.insert(schema.teamJoinRequests).values({
      id: "rejected-request",
      teamId: team.id,
      userId: user.id,
      status: "rejected",
      decidedByUserId: leader.id,
      decidedAt: new Date(),
    });
    expect((await call()).hasAnyMembership).toBe(false);

    await seedMember(team.id, user.id, new Date());
    expect((await call()).hasAnyMembership).toBe(false);
    await testDb.update(schema.teamMembers).set({ leftAt: null })
      .where(eq(schema.teamMembers.userId, user.id));
    expect((await call()).hasAnyMembership).toBe(true);

    const pendingUser = await seedUser("pending-user");
    await testDb.insert(schema.teamJoinRequests).values({
      id: "pending-request",
      teamId: team.id,
      userId: pendingUser.id,
    });
    login(pendingUser);
    expect((await call()).hasAnyMembership).toBe(true);

    login(leader);
    expect((await call()).hasAnyMembership).toBe(true);
  });

  it("sorts by departure, then by active participant count", async () => {
    const member1 = await seedUser("member-1");
    const member2 = await seedUser("member-2");
    const sameStart = new Date(Date.now() + 2 * DAY);
    const fewer = await seedTeam("fewer", leader.id, "location-shenzhen", {
      title: "同日人少",
      startAt: sameStart,
      endAt: new Date(sameStart.getTime() + DAY / 2),
    });
    const more = await seedTeam("more", leader.id, "location-shenzhen", {
      title: "同日人多",
      startAt: sameStart,
      endAt: new Date(sameStart.getTime() + DAY / 2),
    });
    await seedTeam("later", leader.id, "location-shenzhen", {
      title: "更晚",
      startAt: new Date(Date.now() + 3 * DAY),
      endAt: new Date(Date.now() + 4 * DAY),
    });
    await seedMember(fewer.id, member1.id);
    await seedMember(more.id, member1.id);
    await seedMember(more.id, member2.id);
    login();

    const body = await call();
    expect(body.candidates.map(({ title }) => title)).toEqual(["同日人多", "同日人少", "更晚"]);
  });
});
