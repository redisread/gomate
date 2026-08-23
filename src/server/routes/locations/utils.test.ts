import { describe, expect, it } from "vitest";
import * as schema from "../../db/schema";
import { createLocationInputSchema, projectLocation } from "./utils";

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

  it("requires coordinates and a cover to publish but not an activity type", () => {
    const incomplete = createLocationInputSchema.safeParse({
      name: "完整地点",
      description: "地点介绍",
      regionId: "region-cn-shenzhen",
      status: "published",
    });
    expect(incomplete.success).toBe(false);

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
      extra: {},
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
  });
});
