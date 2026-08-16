import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "../../db/schema";
import { ContentD1Database } from "../helpers/content-db";
import { createTestDb } from "../helpers/db";
import {
  seedLocation,
  seedLocationTag,
  seedRegion,
  seedTag,
  seedTeam,
  seedUser,
} from "../helpers/seed";

type TestDb = ReturnType<typeof createTestDb>["db"];

let currentSession: {
  user: { id: string; email: string; name: string };
} | null = null;
let testDb: TestDb;
let sqlite: ReturnType<typeof createTestDb>["sqlite"];
let d1: ContentD1Database;
let r2: FakeR2Bucket;

class FakeR2Bucket {
  readonly objects = new Map<string, ArrayBuffer>();
  deleteFailuresRemaining = 0;
  deleteAttempts = 0;

  seed(key: string) {
    this.objects.set(key, new Uint8Array([1, 2, 3]).buffer);
  }

  async get(key: string) {
    const body = this.objects.get(key);
    return body
      ? {
          body,
          arrayBuffer: async () => body,
          httpMetadata: { contentType: "image/png" },
        }
      : null;
  }

  async put(key: string, value: ArrayBuffer) {
    this.objects.set(key, value);
    return {};
  }

  async delete(keys: string | string[]) {
    this.deleteAttempts += 1;
    if (this.deleteFailuresRemaining > 0) {
      this.deleteFailuresRemaining -= 1;
      throw new Error("simulated R2 cleanup failure");
    }
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.objects.delete(key);
    }
  }
}

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: { getSession: async () => currentSession },
  }),
}));

vi.mock("../../db", () => ({
  createDb: () => testDb,
}));

const { locationsRoute } = await import("../../routes/locations");
const { isAllowedLocationImageUrl } = await import(
  "../../routes/locations/utils"
);

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/locations", locationsRoute);
  return app;
}

function request(path: string, options: RequestInit = {}) {
  return createApp().fetch(
    new Request(`http://localhost${path}`, options),
    {
      DB: d1 as unknown as D1Database,
      R2: r2 as unknown as R2Bucket,
      R2_PUBLIC_URL: "https://gomate.cos.jiahongw.com",
    } as unknown as Env,
  );
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function login(user: schema.User | null) {
  currentSession = user
    ? { user: { id: user.id, email: user.email, name: user.name } }
    : null;
}

describe("Locations V2 API", () => {
  let admin: schema.User;
  let shenzhen: schema.Region;
  let guangzhou: schema.Region;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    sqlite = fresh.sqlite;
    d1 = new ContentD1Database(sqlite);
    r2 = new FakeR2Bucket();
    currentSession = null;

    admin = await seedUser(testDb, {
      id: "admin",
      name: "Admin",
      email: "admin@example.test",
      role: "admin",
    });
    shenzhen = await seedRegion(testDb, {
      id: "region-cn-shenzhen",
      name: "深圳市",
      nameEn: "Shenzhen",
      slug: "shenzhen",
      code: "440300",
      isHot: true,
      sortOrder: 1,
    });
    guangzhou = await seedRegion(testDb, {
      id: "region-cn-guangzhou",
      name: "广州市",
      nameEn: "Guangzhou",
      slug: "guangzhou",
      code: "440100",
      sortOrder: 2,
    });
  });

  it("lists only published locations and filters by Region, activity and location_tags", async () => {
    const closedRegion = await seedRegion(testDb, {
      id: "region-cn-closed-list",
      name: "未开放城市",
      slug: "closed-list",
      code: "closed-list",
      serviceEnabled: false,
      timezone: null,
      centerLatitude: null,
      centerLongitude: null,
    });
    const hikingTag = await seedTag(testDb, {
      id: "tag-hiking",
      name: "徒步",
      slug: "hiking",
    });
    const published = await seedLocation(testDb, shenzhen.id, {
      id: "location-published",
      name: "梧桐山",
      slug: "wutongshan",
      supportedActivityTypes: ["hiking", "explore"],
      status: "published",
      subtitle: "深圳之巅",
      description: "完整的 V2 地点描述",
      address: "罗湖区",
      latitude: 22.5833,
      longitude: 114.2147,
      coverImageUrl: "https://gomate.cos.jiahongw.com/locations/wutong-cover.jpg",
      images: ["https://gomate.cos.jiahongw.com/locations/wutong-1.jpg"],
      extra: {
        hiking: {
          difficulty: "moderate",
          duration_min: 180,
          tips: ["带足饮水"],
        },
      },
    });
    await seedLocationTag(testDb, published.id, hikingTag.id);
    await seedLocation(testDb, shenzhen.id, {
      id: "location-draft",
      name: "未发布地点",
      slug: "draft-location",
      status: "draft",
      supportedActivityTypes: [],
    });
    await seedLocation(testDb, guangzhou.id, {
      id: "location-other-region",
      name: "广州地点",
      slug: "guangzhou-location",
      supportedActivityTypes: ["hiking"],
    });
    await seedLocation(testDb, closedRegion.id, {
      id: "location-closed-region",
      name: "未开放地点",
      slug: "closed-region-location",
      supportedActivityTypes: ["hiking"],
    });

    const response = await request(
      `/locations?regionId=${shenzhen.id}&activityType=hiking&tagIds=${hikingTag.id}&limit=10`,
    );

    expect(response.status).toBe(200);
    const body = await response.json() as {
      success: boolean;
      locations: Array<Record<string, unknown>>;
      total: number;
      nextCursor: string | null;
    };
    expect(body.success).toBe(true);
    expect(body.total).toBe(1);
    expect(body.nextCursor).toBeNull();
    expect(body.locations).toEqual([
      expect.objectContaining({
        id: published.id,
        regionId: shenzhen.id,
        region: {
          id: shenzhen.id,
          countryCode: "CN",
          parentId: null,
          name: "深圳市",
          nameEn: "Shenzhen",
          slug: "shenzhen",
          code: "440300",
          level: "city",
          timezone: "Asia/Shanghai",
          centerLatitude: 22.5431,
          centerLongitude: 114.0579,
          serviceEnabled: true,
          isHot: true,
          sortOrder: 1,
        },
        supportedActivityTypes: ["hiking", "explore"],
        status: "published",
        latitude: 22.5833,
        longitude: 114.2147,
        coverImageUrl: "https://gomate.cos.jiahongw.com/locations/wutong-cover.jpg",
        images: ["https://gomate.cos.jiahongw.com/locations/wutong-1.jpg"],
        extra: expect.objectContaining({ hiking: expect.any(Object) }),
        tags: [{ id: hikingTag.id, name: "徒步", slug: "hiking" }],
      }),
    ]);
    expect(body.locations[0]).not.toHaveProperty("cityId");
    expect(body.locations[0]).not.toHaveProperty("cityName");
    expect(body.locations[0]).not.toHaveProperty("type");
    expect(body.locations[0]).not.toHaveProperty("coverImage");
    expect(body.locations[0]).not.toHaveProperty("coordinates");
    expect(body.locations[0]).not.toHaveProperty("regionName");
    expect(body.locations[0]).not.toHaveProperty("regionNameEn");
    expect(body.locations[0]).toMatchObject({
      extra: {
        hiking: expect.objectContaining({
          difficulty: "moderate",
          durationMin: 180,
          tips: ["带足饮水"],
        }),
      },
    });
    expect(
      (body.locations[0].extra as { hiking: Record<string, unknown> }).hiking,
    ).not.toHaveProperty("duration_min");

    const unfiltered = await request("/locations?limit=100");
    const unfilteredBody = await unfiltered.json() as {
      locations: Array<{ id: string }>;
    };
    expect(unfilteredBody.locations.map((location) => location.id)).not.toContain(
      "location-closed-region",
    );
  });

  it("uses stable createdAt/id keyset pagination without duplicates or omissions", async () => {
    const createdAt = new Date("2026-08-16T08:00:00.000Z");
    for (const id of ["location-a", "location-b", "location-c"]) {
      await seedLocation(testDb, shenzhen.id, {
        id,
        slug: id,
        createdAt,
      });
    }

    const first = await request(`/locations?regionId=${shenzhen.id}&limit=2`);
    expect(first.status).toBe(200);
    const firstBody = await first.json() as {
      locations: Array<{ id: string }>;
      total: number;
      nextCursor: string | null;
    };
    expect(firstBody.locations.map(({ id }) => id)).toEqual([
      "location-c",
      "location-b",
    ]);
    expect(firstBody.total).toBe(3);
    expect(firstBody.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/u);

    const second = await request(
      `/locations?regionId=${shenzhen.id}&limit=2&cursor=${firstBody.nextCursor}`,
    );
    const secondBody = await second.json() as {
      locations: Array<{ id: string }>;
      total: number;
      nextCursor: string | null;
    };
    expect(secondBody.locations.map(({ id }) => id)).toEqual(["location-a"]);
    expect(secondBody.total).toBe(3);
    expect(secondBody.nextCursor).toBeNull();
    expect(
      new Set([
        ...firstBody.locations.map(({ id }) => id),
        ...secondBody.locations.map(({ id }) => id),
      ]).size,
    ).toBe(3);
  });

  it("rejects removed page parameters and malformed location cursors", async () => {
    expect((await request("/locations?page=2")).status).toBe(400);
    expect((await request("/locations?pageSize=12")).status).toBe(400);
    expect((await request("/locations?cursor=%%% ")).status).toBe(400);
    expect(
      (await request(`/locations?cursor=${"a".repeat(513)}`)).status,
    ).toBe(400);
  });

  it("returns a published V2 detail by ID with structured JSON and dedicated tags", async () => {
    const tag = await seedTag(testDb, {
      id: "tag-weekend",
      name: "周末",
      slug: "weekend",
    });
    const location = await seedLocation(testDb, shenzhen.id, {
      id: "location-detail",
      slug: "detail-location",
      supportedActivityTypes: ["leisure"],
      images: ["https://gomate.cos.jiahongw.com/locations/detail.jpg"],
      extra: {
        hiking: {
          distance_km: 5.5,
          elevation_gain_m: 700,
          best_seasons: ["spring", "autumn"],
        },
        internal_storage_field: { should_not_leak: true },
      },
    });
    await seedLocationTag(testDb, location.id, tag.id);

    const response = await request(`/locations/${location.id}`);

    expect(response.status).toBe(200);
    const body = await response.json() as { location: Record<string, unknown> };
    expect(body.location).toMatchObject({
      id: location.id,
      regionId: shenzhen.id,
      region: expect.objectContaining({
        id: shenzhen.id,
        name: "深圳市",
        nameEn: "Shenzhen",
        level: "city",
        serviceEnabled: true,
      }),
      supportedActivityTypes: ["leisure"],
      images: ["https://gomate.cos.jiahongw.com/locations/detail.jpg"],
      extra: {
        hiking: expect.objectContaining({
          distanceKm: 5.5,
          elevationGainM: 700,
          bestSeasons: ["spring", "autumn"],
        }),
      },
      tags: [{ id: tag.id, name: "周末", slug: "weekend" }],
    });
    expect(body.location.extra).not.toHaveProperty("internal_storage_field");
  });

  it("uses an ID-only detail contract because location slugs are only unique within a Region", async () => {
    const first = await seedLocation(testDb, shenzhen.id, {
      id: "location-shenzhen-shared-slug",
      slug: "shared-slug",
    });
    await seedLocation(testDb, guangzhou.id, {
      id: "location-guangzhou-shared-slug",
      slug: "shared-slug",
    });

    expect((await request("/locations/shared-slug")).status).toBe(404);
    const byId = await request(`/locations/${first.id}`);
    expect(byId.status).toBe(200);
    await expect(byId.json()).resolves.toMatchObject({
      location: { id: first.id, regionId: shenzhen.id },
    });
  });

  it("hides detail and tags unless the location is published in an enabled city Region", async () => {
    const closedRegion = await seedRegion(testDb, {
      id: "region-cn-closed-detail",
      name: "未开放详情城市",
      slug: "closed-detail",
      code: "closed-detail",
      serviceEnabled: false,
      timezone: null,
      centerLatitude: null,
      centerLongitude: null,
    });
    const tag = await seedTag(testDb, {
      id: "tag-private-location",
      name: "不可见",
      slug: "private-location",
    });
    const draft = await seedLocation(testDb, shenzhen.id, {
      id: "location-detail-draft",
      status: "draft",
      supportedActivityTypes: [],
    });
    const closed = await seedLocation(testDb, closedRegion.id, {
      id: "location-detail-closed",
    });
    await seedLocationTag(testDb, draft.id, tag.id);
    await seedLocationTag(testDb, closed.id, tag.id);

    for (const locationId of [draft.id, closed.id]) {
      expect((await request(`/locations/${locationId}`)).status).toBe(404);
      expect((await request(`/locations/${locationId}/tags`)).status).toBe(404);
    }
  });

  it("lets only active administrators load draft locations for editing", async () => {
    const draft = await seedLocation(testDb, shenzhen.id, {
      id: "location-admin-draft",
      name: "后台草稿",
      status: "draft",
      supportedActivityTypes: [],
    });
    const member = await seedUser(testDb, {
      id: "location-admin-member",
      email: "location-admin-member@example.test",
      role: "user",
    });

    expect((await request(`/locations/${draft.id}`)).status).toBe(404);
    expect((await request(`/locations/${draft.id}/admin`)).status).toBe(401);

    login(member);
    expect((await request(`/locations/${draft.id}/admin`)).status).toBe(403);

    login(admin);
    const response = await request(`/locations/${draft.id}/admin`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      location: {
        id: draft.id,
        status: "draft",
        region: { id: shenzhen.id },
      },
    });
  });

  it("keeps /locations/stats ahead of the detail route and excludes drafts", async () => {
    const closedRegion = await seedRegion(testDb, {
      id: "region-cn-closed-stats",
      name: "未开放统计城市",
      slug: "closed-stats",
      code: "closed-stats",
      serviceEnabled: false,
      timezone: null,
      centerLatitude: null,
      centerLongitude: null,
    });
    await seedLocation(testDb, shenzhen.id, {
      id: "location-map",
      name: "地图地点",
      slug: "map-location",
      latitude: 22.6,
      longitude: 114.2,
      supportedActivityTypes: ["hiking"],
    });
    await seedLocation(testDb, shenzhen.id, {
      id: "location-map-draft",
      name: "地图草稿",
      slug: "map-draft",
      status: "draft",
      supportedActivityTypes: [],
    });
    await seedLocation(testDb, closedRegion.id, {
      id: "location-map-closed",
      name: "未开放地图地点",
      slug: "map-closed",
      supportedActivityTypes: ["hiking"],
    });

    const response = await request("/locations/stats");

    expect(response.status).toBe(200);
    const body = await response.json() as {
      success: boolean;
      total: number;
      regions: Array<{ region: schema.Region; count: number }>;
      points: Array<Record<string, unknown>>;
    };
    expect(body.success).toBe(true);
    expect(body.total).toBe(1);
    expect(body.regions).toEqual([
      {
        region: expect.objectContaining({
          id: shenzhen.id,
          name: "深圳市",
          nameEn: "Shenzhen",
          serviceEnabled: true,
        }),
        count: 1,
      },
    ]);
    expect(body.points).toEqual([
      expect.objectContaining({
        id: "location-map",
        regionId: shenzhen.id,
        region: expect.objectContaining({
          id: shenzhen.id,
          name: "深圳市",
          nameEn: "Shenzhen",
        }),
        latitude: 22.6,
        longitude: 114.2,
        supportedActivityTypes: ["hiking"],
      }),
    ]);
    expect(body.points[0]).not.toHaveProperty("regionName");
  });

  it("creates a complete V2 location only in an enabled city Region", async () => {
    login(admin);
    const payload = {
      regionId: shenzhen.id,
      name: "七娘山",
      slug: "qiniangshan",
      supportedActivityTypes: ["hiking", "explore"],
      status: "published",
      subtitle: "山海相逢",
      description: "深圳东部代表性山野地点",
      address: "大鹏新区",
      latitude: 22.531,
      longitude: 114.548,
      coverImageUrl: "https://gomate.cos.jiahongw.com/locations/qiniang-cover.jpg",
      images: ["https://gomate.cos.jiahongw.com/locations/qiniang-1.jpg"],
      extra: {
        hiking: {
          difficulty: "hard",
          durationMin: 240,
          warnings: ["注意防晒"],
        },
      },
    };

    const response = await request("/locations", jsonRequest("POST", payload));

    expect(response.status).toBe(201);
    const body = await response.json() as { location: Record<string, unknown> };
    expect(body.location).toMatchObject(payload);
    const [stored] = await testDb.select().from(schema.locations)
      .where(eq(schema.locations.id, body.location.id as string));
    expect(stored).toMatchObject({
      regionId: shenzhen.id,
      supportedActivityTypes: ["hiking", "explore"],
      images: payload.images,
      extra: {
        hiking: {
          difficulty: "hard",
          duration_min: 240,
          warnings: ["注意防晒"],
        },
      },
      createdByUserId: admin.id,
    });
    expect(body.location).toMatchObject({
      region: expect.objectContaining({ id: shenzhen.id, name: "深圳市" }),
      tags: [],
      extra: payload.extra,
    });

    await testDb.insert(schema.region).values({
      id: "region-cn-closed",
      countryCode: "CN",
      name: "未开放城市",
      slug: "closed-city",
      level: "city",
      serviceEnabled: false,
    });
    const closed = await request(
      "/locations",
      jsonRequest("POST", { ...payload, regionId: "region-cn-closed", slug: "closed" }),
    );
    expect(closed.status).toBe(400);
    await expect(closed.json()).resolves.toMatchObject({
      success: false,
      error: { code: "BAD_REQUEST" },
    });
  });

  it("promotes admin-owned temporary media only when location creation commits", async () => {
    login(admin);
    const tempKey = `temp/locations/${admin.id}/cover.png`;
    r2.seed(tempKey);
    const payload = {
      regionId: shenzhen.id,
      name: "临时图归档地点",
      slug: "promoted-location-media",
      supportedActivityTypes: ["hiking"],
      status: "published",
      description: "验证 R2 与 D1 的补偿一致性",
      latitude: 22.5,
      longitude: 114.1,
      coverImageUrl: `https://gomate.cos.jiahongw.com/${tempKey}`,
      images: [],
      extra: {},
    };

    const response = await request("/locations", jsonRequest("POST", payload));

    expect(response.status).toBe(201);
    const body = await response.json() as {
      location: { id: string; coverImageUrl: string };
    };
    const finalKey = new URL(body.location.coverImageUrl).pathname.slice(1);
    expect(finalKey).toMatch(
      new RegExp(`^locations/${body.location.id}/[0-9a-f-]+\\.png$`),
    );
    expect(r2.objects.has(tempKey)).toBe(false);
    expect(r2.objects.has(finalKey)).toBe(true);
  });

  it("rechecks the target Region in the conditional insert and compensates R2 on a create race", async () => {
    login(admin);
    const tempKey = `temp/locations/${admin.id}/region-race-create.png`;
    r2.seed(tempKey);
    d1.beforeNextRun = () => {
      sqlite.prepare("UPDATE region SET service_enabled = 0 WHERE id = ?")
        .run(shenzhen.id);
    };

    const response = await request("/locations", jsonRequest("POST", {
      regionId: shenzhen.id,
      name: "竞态创建地点",
      slug: "region-race-create",
      supportedActivityTypes: ["hiking"],
      status: "published",
      description: "Region 在预查后关闭时不得留下 D1 或 R2 部分提交",
      latitude: 22.5,
      longitude: 114.1,
      coverImageUrl: `https://gomate.cos.jiahongw.com/${tempKey}`,
      images: [],
      extra: {},
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "CONFLICT" },
    });
    expect(await testDb.$count(
      schema.locations,
      eq(schema.locations.slug, "region-race-create"),
    )).toBe(0);
    expect([...r2.objects.keys()]).toEqual([]);
  });

  it("does not report 500 when post-commit temporary media cleanup is exhausted", async () => {
    login(admin);
    const tempKey = `temp/locations/${admin.id}/cleanup.png`;
    r2.seed(tempKey);
    r2.deleteFailuresRemaining = 3;

    const response = await request("/locations", jsonRequest("POST", {
      regionId: shenzhen.id,
      name: "清理失败仍已提交",
      slug: "post-commit-cleanup",
      supportedActivityTypes: ["hiking"],
      status: "published",
      description: "D1 已提交后不能误导客户端重试",
      latitude: 22.5,
      longitude: 114.1,
      coverImageUrl: `https://gomate.cos.jiahongw.com/${tempKey}`,
      images: [],
      extra: {},
    }));

    expect(response.status).toBe(201);
    const body = await response.json() as {
      location: { id: string; coverImageUrl: string };
    };
    expect(r2.deleteAttempts).toBe(3);
    const finalKey = new URL(body.location.coverImageUrl).pathname.slice(1);
    expect(r2.objects.has(finalKey)).toBe(true);
    const [stored] = await testDb.select().from(schema.locations)
      .where(eq(schema.locations.id, body.location.id));
    expect(stored.coverImageUrl).toBe(body.location.coverImageUrl);
  });

  it("removes temporary and copied location objects when the D1 insert fails", async () => {
    login(admin);
    await seedLocation(testDb, shenzhen.id, { slug: "duplicate-media-slug" });
    const tempKey = `temp/locations/${admin.id}/duplicate.png`;
    r2.seed(tempKey);

    const response = await request("/locations", jsonRequest("POST", {
      regionId: shenzhen.id,
      name: "重复 slug",
      slug: "duplicate-media-slug",
      supportedActivityTypes: ["hiking"],
      status: "published",
      description: "触发 D1 唯一约束",
      latitude: 22.5,
      longitude: 114.1,
      coverImageUrl: `https://gomate.cos.jiahongw.com/${tempKey}`,
      images: [],
      extra: {},
    }));

    expect(response.status).toBe(500);
    expect([...r2.objects.keys()]).toEqual([]);
  });

  it("rejects another administrator's temporary location object", async () => {
    login(admin);
    const foreignKey = "temp/locations/other-admin/foreign.png";
    r2.seed(foreignKey);

    const response = await request("/locations", jsonRequest("POST", {
      regionId: shenzhen.id,
      name: "越权临时图",
      slug: "foreign-temp-media",
      supportedActivityTypes: ["hiking"],
      status: "published",
      description: "不能归档其他管理员上传的对象",
      latitude: 22.5,
      longitude: 114.1,
      coverImageUrl: `https://gomate.cos.jiahongw.com/${foreignKey}`,
      images: [],
      extra: {},
    }));

    expect(response.status).toBe(403);
    expect(r2.objects.has(foreignKey)).toBe(true);
    expect(await testDb.$count(schema.locations)).toBe(0);
  });

  it("archives replacement media and deletes superseded owned objects after update", async () => {
    login(admin);
    const location = await seedLocation(testDb, shenzhen.id, {
      id: "location-media-update",
      coverImageUrl: "https://gomate.cos.jiahongw.com/locations/location-media-update/old.png",
      images: [],
    });
    const oldKey = `locations/${location.id}/old.png`;
    const tempKey = `temp/locations/${admin.id}/new.png`;
    r2.seed(oldKey);
    r2.seed(tempKey);

    const response = await request("/locations", jsonRequest("PUT", {
      id: location.id,
      coverImageUrl: `https://gomate.cos.jiahongw.com/${tempKey}`,
    }));

    expect(response.status).toBe(200);
    const [stored] = await testDb.select().from(schema.locations)
      .where(eq(schema.locations.id, location.id));
    const finalKey = new URL(stored.coverImageUrl).pathname.slice(1);
    expect(finalKey).toMatch(
      new RegExp(`^locations/${location.id}/[0-9a-f-]+\\.png$`),
    );
    expect(r2.objects.has(finalKey)).toBe(true);
    expect(r2.objects.has(tempKey)).toBe(false);
    expect(r2.objects.has(oldKey)).toBe(false);
    expect(stored.coverImageUrl).toBe(
      `https://gomate.cos.jiahongw.com/${finalKey}`,
    );
  });

  it("rechecks the target Region in the conditional update and compensates R2 on an update race", async () => {
    login(admin);
    const location = await seedLocation(testDb, shenzhen.id, {
      id: "location-region-update-race",
      name: "竞态前地点",
      coverImageUrl: "https://gomate.cos.jiahongw.com/locations/location-region-update-race/old.png",
      images: [],
    });
    const oldKey = `locations/${location.id}/old.png`;
    const tempKey = `temp/locations/${admin.id}/region-race-update.png`;
    r2.seed(oldKey);
    r2.seed(tempKey);
    d1.beforeNextRun = () => {
      sqlite.prepare("UPDATE region SET service_enabled = 0 WHERE id = ?")
        .run(shenzhen.id);
    };

    const response = await request("/locations", jsonRequest("PUT", {
      id: location.id,
      name: "不应提交的新名称",
      coverImageUrl: `https://gomate.cos.jiahongw.com/${tempKey}`,
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "CONFLICT" },
    });
    const [stored] = await testDb.select().from(schema.locations)
      .where(eq(schema.locations.id, location.id));
    expect(stored).toMatchObject({
      name: "竞态前地点",
      regionId: shenzhen.id,
      coverImageUrl: location.coverImageUrl,
      images: [],
    });
    expect([...r2.objects.keys()]).toEqual([oldKey]);
  });

  it("deletes owned media with the location and restores it if D1 rejects deletion", async () => {
    login(admin);
    const location = await seedLocation(testDb, shenzhen.id, {
      id: "location-media-delete",
      coverImageUrl: "https://gomate.cos.jiahongw.com/locations/location-media-delete/cover.png",
      images: [],
    });
    const key = `locations/${location.id}/cover.png`;
    r2.seed(key);

    const deleted = await request(`/locations/${location.id}`, { method: "DELETE" });
    expect(deleted.status).toBe(200);
    expect([...r2.objects.keys()]).toEqual([]);

    const guarded = await seedLocation(testDb, shenzhen.id, {
      id: "location-media-delete-guarded",
      coverImageUrl: "https://gomate.cos.jiahongw.com/locations/location-media-delete-guarded/cover.png",
      images: [],
    });
    const guardedKey = `locations/${guarded.id}/cover.png`;
    r2.seed(guardedKey);
    await seedTeam(testDb, admin.id, guarded.id, { id: "team-location-delete-guard" });

    const rejected = await request(`/locations/${guarded.id}`, { method: "DELETE" });

    expect(rejected.status).toBe(500);
    expect([...r2.objects.keys()]).toEqual([guardedKey]);
    expect(await testDb.$count(
      schema.locations,
      eq(schema.locations.id, guarded.id),
    )).toBe(1);
  });

  it("rejects duplicate activities and image URLs outside the explicit HTTPS host allowlist", async () => {
    login(admin);
    const base = {
      regionId: shenzhen.id,
      name: "非法地点",
      slug: "invalid-location",
      supportedActivityTypes: ["hiking"],
      status: "published",
      description: "用于验证输入边界",
      latitude: 22.5,
      longitude: 114,
      coverImageUrl: "https://gomate.cos.jiahongw.com/locations/valid.jpg",
      images: [],
      extra: {},
    };

    const duplicate = await request(
      "/locations",
      jsonRequest("POST", { ...base, supportedActivityTypes: ["hiking", "hiking"] }),
    );
    expect(duplicate.status).toBe(400);

    const insecure = await request(
      "/locations",
      jsonRequest("POST", { ...base, coverImageUrl: "http://gomate.cos.jiahongw.com/x.jpg" }),
    );
    expect(insecure.status).toBe(400);

    const malformed = await request(
      "/locations",
      jsonRequest("POST", { ...base, coverImageUrl: "not-a-url" }),
    );
    expect(malformed.status).toBe(400);

    const wrongHost = await request(
      "/locations",
      jsonRequest("POST", { ...base, coverImageUrl: "https://example.com/x.jpg" }),
    );
    expect(wrongHost.status).toBe(400);

    const storageShapedExtra = await request(
      "/locations",
      jsonRequest("POST", {
        ...base,
        extra: { hiking: { duration_min: 120 } },
      }),
    );
    expect(storageShapedExtra.status).toBe(400);
  });

  it("accepts only the configured R2 host and the explicit CDN wildcard rules", () => {
    const env = {
      R2_PUBLIC_URL: "https://assets.gomate.test/public",
    } as unknown as Env;

    expect(
      isAllowedLocationImageUrl("https://assets.gomate.test/location.jpg", env),
    ).toBe(true);
    expect(
      isAllowedLocationImageUrl(
        "https://gomate.cos.jiahongw.com/location.jpg",
        env,
      ),
    ).toBe(true);
    expect(
      isAllowedLocationImageUrl("https://cdn.discordapp.com/a.jpg", env),
    ).toBe(true);
    expect(
      isAllowedLocationImageUrl(
        "https://avatars.githubusercontent.com/a.jpg",
        env,
      ),
    ).toBe(true);
    expect(
      isAllowedLocationImageUrl("https://lh3.googleusercontent.com/a.jpg", env),
    ).toBe(true);
    expect(
      isAllowedLocationImageUrl("https://githubusercontent.com/a.jpg", env),
    ).toBe(false);
    expect(
      isAllowedLocationImageUrl("https://example.com/a.jpg", env),
    ).toBe(false);
    expect(
      isAllowedLocationImageUrl("http://assets.gomate.test/a.jpg", env),
    ).toBe(false);
  });

  it("atomically prevents removing an activity used by a future uncancelled Team", async () => {
    login(admin);
    const location = await seedLocation(testDb, shenzhen.id, {
      id: "location-team-guard",
      supportedActivityTypes: ["hiking", "travel"],
    });
    const leader = await seedUser(testDb, { id: "leader", email: "leader@example.test" });
    const futureTeam = await seedTeam(testDb, leader.id, location.id, {
      id: "future-travel-team",
      activityType: "travel",
      startAt: new Date(Date.now() + 86_400_000),
      endAt: new Date(Date.now() + 90_000_000),
      cancelledAt: null,
    });

    const blocked = await request(
      "/locations",
      jsonRequest("PUT", {
        id: location.id,
        supportedActivityTypes: ["hiking"],
      }),
    );
    expect(blocked.status).toBe(409);
    await expect(blocked.json()).resolves.toMatchObject({
      success: false,
      error: { code: "CONFLICT" },
    });
    const [unchanged] = await testDb.select().from(schema.locations)
      .where(eq(schema.locations.id, location.id));
    expect(unchanged.supportedActivityTypes).toEqual(["hiking", "travel"]);

    await testDb.update(schema.teams)
      .set({ cancelledAt: new Date() })
      .where(eq(schema.teams.id, futureTeam.id));
    const allowed = await request(
      "/locations",
      jsonRequest("PUT", {
        id: location.id,
        supportedActivityTypes: ["hiking"],
        extra: {
          hiking: { durationMin: 90, distanceKm: 3.2 },
          facilities: ["restroom"],
        },
      }),
    );
    expect(allowed.status).toBe(200);
    const [updated] = await testDb.select().from(schema.locations)
      .where(eq(schema.locations.id, location.id));
    expect(updated.supportedActivityTypes).toEqual(["hiking"]);
    expect(updated.extra).toEqual({
      hiking: { duration_min: 90, distance_km: 3.2 },
      facilities: ["restroom"],
    });
    const allowedBody = await allowed.json() as {
      location: Record<string, unknown>;
    };
    expect(allowedBody.location).toMatchObject({
      region: expect.objectContaining({ id: shenzhen.id }),
      tags: [],
      extra: {
        hiking: expect.objectContaining({ durationMin: 90, distanceKm: 3.2 }),
        facilities: ["restroom"],
      },
    });
  });

  it("replaces tags only through location_tags and validates all targets before deletion", async () => {
    login(admin);
    const location = await seedLocation(testDb, shenzhen.id, {
      id: "location-tags",
    });
    const oldTag = await seedTag(testDb, { id: "tag-old", slug: "old", name: "旧标签" });
    const newTag = await seedTag(testDb, { id: "tag-new", slug: "new", name: "新标签" });
    await seedLocationTag(testDb, location.id, oldTag.id);

    const invalid = await request(
      `/locations/${location.id}/tags`,
      jsonRequest("PUT", { tagIds: [newTag.id, "tag-missing"] }),
    );
    expect(invalid.status).toBe(400);
    const afterInvalid = await testDb.select().from(schema.locationTags)
      .where(eq(schema.locationTags.locationId, location.id));
    expect(afterInvalid.map((row) => row.tagId)).toEqual([oldTag.id]);

    const response = await request(
      `/locations/${location.id}/tags`,
      jsonRequest("PUT", { tagIds: [newTag.id] }),
    );
    expect(response.status).toBe(200);
    const stored = await testDb.select().from(schema.locationTags)
      .where(and(
        eq(schema.locationTags.locationId, location.id),
        eq(schema.locationTags.tagId, newTag.id),
      ));
    expect(stored).toHaveLength(1);
    const body = await response.json() as { tags: Array<{ id: string }> };
    expect(body.tags).toEqual([
      expect.objectContaining({ id: newTag.id }),
    ]);
  });

  it("filters more than 100 tagged locations without expanding IDs into D1 bindings", async () => {
    const tag = await seedTag(testDb, {
      id: "tag-large-location-feed",
      name: "大列表",
      slug: "large-location-feed",
    });
    const locationIds = Array.from({ length: 101 }, (_, index) =>
      `location-large-${String(index).padStart(3, "0")}`
    );
    await testDb.insert(schema.locations).values(locationIds.map((id) => ({
      id,
      regionId: shenzhen.id,
      name: id,
      slug: id,
      supportedActivityTypes: ["hiking"] as schema.ActivityType[],
      status: "published" as const,
      description: `${id} description`,
      latitude: 22.5,
      longitude: 114,
      coverImageUrl: `https://gomate.cos.jiahongw.com/${id}.jpg`,
    })));
    await testDb.insert(schema.locationTags).values(locationIds.map((locationId) => ({
      locationId,
      tagId: tag.id,
    })));

    const response = await request(
      `/locations?tagIds=${tag.id}&limit=100`,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      total: 101,
      nextCursor: expect.any(String),
      locations: expect.any(Array),
    });
  });
});
