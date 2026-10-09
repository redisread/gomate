import { describe, expect, it } from "vitest";
import * as schema from "../../db/schema";
import {
  createLocationInputSchema,
  mapLocationExtra,
  normalizeLocationExtraForStorage,
  projectLocation,
  updateLocationInputSchema,
} from "./utils";

describe("location input", () => {
  it("accepts a draft with only name, description, and region", () => {
    const result = createLocationInputSchema.safeParse({
      name: "突然想到的地点",
      description: "先把灵感记录下来，稍后补齐坐标和封面。",
      regionId: "region-cn-shenzhen",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      status: "draft",
      supportedActivityTypes: [],
      latitude: null,
      longitude: null,
      coverImageUrl: null,
    });
  });

  it("allows publishing without coordinates but still requires a cover", () => {
    const incomplete = createLocationInputSchema.safeParse({
      name: "完整地点",
      description: "地点介绍",
      regionId: "region-cn-shenzhen",
      status: "published",
    });
    expect(incomplete.success).toBe(false);

    const withoutCoordinates = createLocationInputSchema.safeParse({
      name: "无坐标地点",
      description: "地点介绍",
      regionId: "region-cn-shenzhen",
      status: "published",
      coverImageUrl: "https://media.example.com/cover.jpg",
    });
    expect(withoutCoordinates.success).toBe(true);
    if (withoutCoordinates.success) {
      expect(withoutCoordinates.data).toMatchObject({
        latitude: null,
        longitude: null,
      });
    }

    const partialCoordinates = createLocationInputSchema.safeParse({
      name: "半坐标地点",
      description: "地点介绍",
      regionId: "region-cn-shenzhen",
      status: "published",
      latitude: 22.5,
      coverImageUrl: "https://media.example.com/cover.jpg",
    });
    expect(partialCoordinates.success).toBe(false);

    const complete = createLocationInputSchema.safeParse({
      name: "完整地点",
      description: "地点介绍",
      regionId: "region-cn-shenzhen",
      status: "published",
      latitude: 22.5,
      longitude: 114.1,
      coverImageUrl: "https://media.example.com/cover.jpg",
    });
    expect(complete.success).toBe(true);
    if (complete.success) {
      expect(complete.data.supportedActivityTypes).toEqual([]);
    }
  });

  it("rejects activity types outside the code enum", () => {
    expect(createLocationInputSchema.safeParse({
      name: "水上地点",
      description: "测试未知活动类型",
      regionId: "region-cn-shenzhen",
      supportedActivityTypes: ["paddling"],
    }).success).toBe(false);
  });

  it("stores only best seasons", () => {
    const result = updateLocationInputSchema.parse({ id: "loc-1", extra: { hiking: { bestSeasons: ["autumn"] } } });
    expect(normalizeLocationExtraForStorage(result.extra ?? {})).toEqual({ hiking: { best_seasons: ["autumn"] } });
  });

  it("continues to reject unrelated unknown hiking fields", () => {
    expect(createLocationInputSchema.safeParse({
      name: "未知字段",
      description: "严格校验必须保留",
      regionId: "region-cn-shenzhen",
      extra: { hiking: { routeColor: "blue" } },
    }).success).toBe(false);
  });
});

describe("location response projection", () => {
  it("does not expose the creator identifier in public DTOs", () => {
    const location = {
      id: "location-1",
      regionId: "region-1",
      name: "Test location",
      slug: "test-location",
      supportedActivityTypes: ["hiking"],
      status: "published",
      subtitle: null,
      description: "A public location",
      address: null,
      latitude: 22.5,
      longitude: 114.1,
      coverImageUrl: "",
      images: [],
      extra: {
        hiking: {
          difficulty: "moderate",
          gear_essential: ["登山鞋"],
          gear_optional: ["登山杖"],
          tips: ["早点出发"],
        },
      },
      createdByUserId: "private-user-id",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } as unknown as schema.Location;
    const region = {
      id: "region-1",
      countryCode: "CN",
      parentId: null,
      name: "Shenzhen",
      nameEn: "Shenzhen",
      slug: "shenzhen",
      code: null,
      level: "city",
      timezone: "Asia/Shanghai",
      centerLatitude: 22.5,
      centerLongitude: 114.1,
      serviceEnabled: true,
      isHot: true,
      sortOrder: 1,
    } as unknown as schema.Region;

    const projected = projectLocation(location, region, []);

    expect(projected).not.toHaveProperty("createdByUserId");
    expect(projected).toMatchObject({
      id: "location-1",
      region: { id: "region-1" },
    });
    expect(projected).not.toHaveProperty("activityTypes");
    expect(projected.extra.hiking).toBeUndefined();
  });
});

describe("retired hiking guides", () => {
  it("keeps seasons while omitting all guide data from stored records", () => {
    expect(mapLocationExtra({ hiking: { best_seasons: ["autumn"], difficulty: "hard", duration_min: 120, distance_km: 5, overview: "old guide", tips: ["old tip"], warnings: ["old warning"] } })).toEqual({ hiking: { bestSeasons: ["autumn"] } });
  });
  it.each(["difficulty", "durationMin", "durationMax", "distanceKm", "elevationGainM", "overview", "tips", "warnings"])("rejects retired input %s", (key) => {
    expect(updateLocationInputSchema.safeParse({ id: "loc-1", extra: { hiking: { [key]: key === "difficulty" ? "hard" : key === "overview" ? "guide" : ["tips", "warnings"].includes(key) ? ["guide"] : 5 } } }).success).toBe(false);
  });
});
