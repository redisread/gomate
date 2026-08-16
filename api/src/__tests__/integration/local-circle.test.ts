import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "../../db/schema";
import { createTestDb } from "../helpers/db";
import {
  seedLocation,
  seedRegion,
  seedStory,
  seedTeam,
  seedTeamMember,
  seedUser,
} from "../helpers/seed";

type TestDb = ReturnType<typeof createTestDb>["db"];

let currentSession: {
  user: { id: string; email: string; name: string };
} | null = null;
let testDb: TestDb;

vi.mock("../../db", () => ({
  createDb: () => testDb,
}));

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: { getSession: async () => currentSession },
  }),
}));

const { getLocalCircleHome, __test } = await import("../../services/local-circle");
const { localCircleHomeRoute } = await import("../../routes/local-circle/home");

function fakeKv() {
  const store = new Map<string, string>();
  return {
    store,
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace & { store: Map<string, string> };
}

async function seedFavorite(
  userId: string,
  locationId: string,
  createdAt: Date,
) {
  await testDb.insert(schema.userLocationFavorites).values({
    userId,
    locationId,
    createdAt,
  });
}

describe("Local Circle V2 service", () => {
  const NOW = 1_800_000_000_000;
  const DAY = 24 * 60 * 60 * 1_000;
  let shenzhen: schema.Region;

  beforeEach(async () => {
    testDb = createTestDb().db;
    currentSession = null;
    shenzhen = await seedRegion(testDb, {
      id: "region-cn-shenzhen",
      name: "深圳市",
      nameEn: "Shenzhen",
      slug: "shenzhen",
      code: "440300",
      isHot: true,
    });
  });

  it("builds public aggregates from completed Team members, dedicated favorites and published Team recaps", async () => {
    const user = await seedUser(testDb, {
      id: "signal-user",
      email: "signal@example.test",
      image: "https://gomate.cos.jiahongw.com/avatars/signal.jpg",
    });
    const departed = await seedUser(testDb, {
      id: "departed-user",
      email: "departed@example.test",
    });
    const leader = await seedUser(testDb, {
      id: "signal-team-leader",
      email: "signal-team-leader@example.test",
    });
    const location = await seedLocation(testDb, shenzhen.id, {
      id: "location-signals",
      name: "梧桐山",
      coverImageUrl: "https://gomate.cos.jiahongw.com/locations/wutong.jpg",
    });
    const completedTeam = await seedTeam(testDb, leader.id, location.id, {
      id: "team-active",
      startAt: new Date(NOW - 2 * DAY),
      endAt: new Date(NOW - DAY),
      formedAt: new Date(NOW - 3 * DAY),
    });
    await seedTeamMember(testDb, completedTeam.id, user.id, {
      joinedAt: new Date(NOW - DAY),
    });
    await seedTeamMember(testDb, completedTeam.id, departed.id, {
      joinedAt: new Date(NOW - DAY),
      leftAt: new Date(NOW - 1_000),
    });
    await seedFavorite(user.id, location.id, new Date(NOW - 2 * DAY));
    await seedStory(testDb, user.id, {
      id: "team-recap",
      teamId: completedTeam.id,
      locationId: location.id,
      title: null,
      status: "published",
      createdAt: new Date(NOW - DAY),
    });
    await seedStory(testDb, departed.id, {
      id: "normal-story",
      teamId: null,
      locationId: location.id,
      title: "普通地点故事",
      status: "published",
      createdAt: new Date(NOW - DAY),
    });

    const result = await getLocalCircleHome({
      db: testDb as never,
      regionId: shenzhen.id,
      language: "zh-CN",
      currentUserId: null,
      now: NOW,
    });

    expect(result).toMatchObject({
      regionId: shenzhen.id,
      regionName: "深圳市",
      activePeopleCount: 1,
      neighborTeams: [],
    });
    expect(result.topLocations).toEqual([
      expect.objectContaining({
        locationId: location.id,
        locationName: "梧桐山",
        coverImageUrl: "https://gomate.cos.jiahongw.com/locations/wutong.jpg",
        visitScore: 2.6,
        uniqueVisitors: 1,
      }),
    ]);
    expect(result.topLocations[0]).not.toHaveProperty("avatarStack");
  });

  it("stores only public data in one exact KV key while anonymous, user A and user B get isolated neighborTeams", async () => {
    const kv = fakeKv();
    const viewerA = await seedUser(testDb, {
      id: "viewer-a",
      email: "viewer-a@example.test",
      image: "https://gomate.cos.jiahongw.com/avatars/viewer-a.jpg",
      extra: { city: shenzhen.id },
    });
    const viewerB = await seedUser(testDb, {
      id: "viewer-b",
      email: "viewer-b@example.test",
      extra: { city: "region-cn-guangzhou" },
    });
    const neighborA = await seedUser(testDb, {
      id: "neighbor-a",
      email: "neighbor-a@example.test",
      image: "https://gomate.cos.jiahongw.com/avatars/a.jpg",
      extra: { city: shenzhen.id },
    });
    const neighborB = await seedUser(testDb, {
      id: "neighbor-b",
      email: "neighbor-b@example.test",
      image: "https://gomate.cos.jiahongw.com/avatars/b.jpg",
      extra: { city: "region-cn-guangzhou" },
    });
    const leader = await seedUser(testDb, {
      id: "leader",
      email: "leader@example.test",
    });
    const location = await seedLocation(testDb, shenzhen.id, {
      id: "location-neighbors",
    });
    const teamA = await seedTeam(testDb, leader.id, location.id, {
      id: "team-neighbor-a",
      title: "深圳邻居队",
      startAt: new Date(NOW + DAY),
      endAt: new Date(NOW + DAY + 3_600_000),
    });
    const teamB = await seedTeam(testDb, leader.id, location.id, {
      id: "team-neighbor-b",
      title: "广州邻居队",
      startAt: new Date(NOW + 2 * DAY),
      endAt: new Date(NOW + 2 * DAY + 3_600_000),
    });
    await seedTeamMember(testDb, teamA.id, neighborA.id);
    await seedTeamMember(testDb, teamB.id, neighborB.id);
    await seedFavorite(viewerA.id, location.id, new Date(NOW - DAY));

    const common = {
      db: testDb as never,
      kv,
      regionId: shenzhen.id,
      language: "zh-CN" as const,
      now: NOW,
    };
    const exactKey = `local-circle:v2:public:${shenzhen.id}:zh-CN`;
    kv.store.set(exactKey, JSON.stringify({
      data: {
        regionId: shenzhen.id,
        regionName: "深圳市",
        activePeopleCount: 1,
        topLocations: [{
          locationId: location.id,
          locationName: location.name,
          coverImageUrl: location.coverImageUrl,
          visitScore: 1,
          uniqueVisitors: 1,
          avatarStack: ["https://gomate.cos.jiahongw.com/avatars/legacy.jpg"],
        }],
      },
      storedAt: NOW,
    }));
    const anonymous = await getLocalCircleHome({
      ...common,
      currentUserId: null,
    });
    const forA = await getLocalCircleHome({
      ...common,
      currentUserId: viewerA.id,
    });
    const forB = await getLocalCircleHome({
      ...common,
      currentUserId: viewerB.id,
    });

    expect(anonymous.neighborTeams).toEqual([]);
    expect(forA.neighborTeams.map((team) => team.teamId)).toEqual([teamA.id]);
    expect(forB.neighborTeams.map((team) => team.teamId)).toEqual([teamB.id]);
    expect(forA.neighborTeams[0]?.startAt).toBe(
      new Date(NOW + DAY).toISOString(),
    );
    expect(typeof forA.neighborTeams[0]?.startAt).toBe("string");
    expect(kv.store.size).toBe(1);
    expect([...kv.store.keys()]).toEqual([exactKey]);
    const cached = JSON.parse(kv.store.get(exactKey)!) as {
      data: Record<string, unknown>;
    };
    expect(cached.data).not.toHaveProperty("neighborTeams");
    const serializedPublicCache = JSON.stringify(cached.data);
    expect(serializedPublicCache).not.toContain("avatars/");
    expect(serializedPublicCache).not.toMatch(
      /"(?:avatarStack|neighborAvatars|userId|neighborTeams)"/u,
    );
    expect(
      (cached.data.topLocations as Array<Record<string, unknown>>)[0],
    ).not.toHaveProperty("avatarStack");
    expect(__test.CACHE_KEY_PREFIX).toBe("local-circle:v2:public:");
  });
});

describe("Local Circle V2 route", () => {
  beforeEach(async () => {
    testDb = createTestDb().db;
    currentSession = null;
    await seedRegion(testDb, {
      id: "region-cn-shenzhen",
      name: "深圳市",
      nameEn: "Shenzhen",
      slug: "shenzhen",
      code: "440300",
      isHot: true,
    });
  });

  function createApp() {
    const app = new Hono<{ Bindings: Env }>();
    app.route("/local-circle/home", localCircleHomeRoute);
    return app;
  }

  function createEnv() {
    return {
      DB: {} as D1Database,
      CACHE_KV: fakeKv(),
    } as unknown as Env;
  }

  it("resolves an open Region from CF-IPCity and uses the requested language", async () => {
    const response = await createApp().fetch(
      new Request("http://localhost/local-circle/home?language=en", {
        headers: { "CF-IPCity": "Shenzhen" },
      }),
      createEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      regionId: "region-cn-shenzhen",
      regionName: "Shenzhen",
      neighborTeams: [],
    });
  });

  it("falls back to the stable Shenzhen Region ID when CF-IPCity cannot resolve", async () => {
    const response = await createApp().fetch(
      new Request("http://localhost/local-circle/home", {
        headers: { "CF-IPCity": "Unknown City" },
      }),
      createEnv(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      regionId: "region-cn-shenzhen",
      regionName: "深圳市",
    });
  });

  it("rejects an explicit Region that is not an enabled city", async () => {
    await testDb.insert(schema.region).values({
      id: "region-cn-disabled",
      countryCode: "CN",
      name: "未开放城市",
      slug: "disabled",
      level: "city",
      serviceEnabled: false,
    });

    const response = await createApp().fetch(
      new Request(
        "http://localhost/local-circle/home?regionId=region-cn-disabled",
      ),
      createEnv(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "BAD_REQUEST" },
    });

    const blank = await createApp().fetch(
      new Request("http://localhost/local-circle/home?regionId=%20%20"),
      createEnv(),
    );
    expect(blank.status).toBe(400);
  });
});
