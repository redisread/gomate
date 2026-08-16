import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestDb } from "../helpers/db";
import { seedRegion } from "../helpers/seed";

type TestDb = ReturnType<typeof createTestDb>["db"];

let testDb: TestDb;

vi.mock("../../db", () => ({
  createDb: () => testDb,
}));

const { regionsRoute } = await import("../../routes/regions");

function createApp() {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route("/regions", regionsRoute);
  return app;
}

describe("Regions V2 API", () => {
  beforeEach(async () => {
    testDb = createTestDb().db;

    await seedRegion(testDb, {
      id: "region-cn-guangdong",
      name: "广东省",
      slug: "guangdong",
      code: "440000",
      level: "province",
      serviceEnabled: false,
      timezone: null,
      centerLatitude: null,
      centerLongitude: null,
    });
    await seedRegion(testDb, {
      id: "region-cn-shenzhen",
      parentId: "region-cn-guangdong",
      name: "深圳市",
      nameEn: "Shenzhen",
      slug: "shenzhen",
      code: "440300",
      level: "city",
      serviceEnabled: true,
      isHot: true,
    });
    await seedRegion(testDb, {
      id: "region-cn-guangzhou",
      parentId: "region-cn-guangdong",
      name: "广州市",
      slug: "guangzhou",
      code: "440100",
      level: "city",
      serviceEnabled: false,
      timezone: null,
      centerLatitude: null,
      centerLongitude: null,
    });
    await seedRegion(testDb, {
      id: "region-us-new-york",
      countryCode: "US",
      name: "New York City",
      nameEn: "New York City",
      slug: "new-york-city",
      code: "NYC",
      level: "city",
      serviceEnabled: true,
      timezone: "America/New_York",
      centerLatitude: 40.7128,
      centerLongitude: -74.006,
    });
  });

  it("defaults to enabled Chinese city Regions and returns only V2 fields", async () => {
    const response = await createApp().request("/regions", {}, { DB: {} } as never);

    expect(response.status).toBe(200);
    const body = await response.json() as {
      success: boolean;
      regions: Array<Record<string, unknown>>;
    };
    expect(body.success).toBe(true);
    expect(body.regions).toEqual([
      expect.objectContaining({
        id: "region-cn-shenzhen",
        countryCode: "CN",
        level: "city",
        serviceEnabled: true,
        name: "深圳市",
      }),
    ]);
    expect(body.regions[0]).not.toHaveProperty("province");
    expect(body.regions[0]).not.toHaveProperty("adcode");
  });

  it("applies countryCode, level, serviceEnabled and parentId filters together", async () => {
    const app = createApp();
    const disabledCities = await app.request(
      "/regions?countryCode=cn&level=city&serviceEnabled=false&parentId=region-cn-guangdong",
      {},
      { DB: {} } as never,
    );
    const disabledBody = await disabledCities.json() as {
      regions: Array<{ id: string }>;
    };
    expect(disabledBody.regions.map((region) => region.id)).toEqual([
      "region-cn-guangzhou",
    ]);

    const usCities = await app.request(
      "/regions?countryCode=us&level=city&serviceEnabled=true",
      {},
      { DB: {} } as never,
    );
    const usBody = await usCities.json() as {
      regions: Array<{ id: string }>;
    };
    expect(usBody.regions.map((region) => region.id)).toEqual([
      "region-us-new-york",
    ]);
  });

  it("returns the unified validation envelope for invalid filters", async () => {
    const response = await createApp().request(
      "/regions?level=continent&serviceEnabled=yes",
      {},
      { DB: {} } as never,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });
});
