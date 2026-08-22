import { describe, expect, it } from "vitest";
import * as schema from "../../db/schema";
import { projectLocation } from "./utils";

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
