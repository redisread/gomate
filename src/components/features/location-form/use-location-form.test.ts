import { describe, expect, it } from "vitest";
import type { Location } from "@/lib/types";
import {
  DEFAULT_LOCATION_FORM,
  formDataToLocationPayload,
  locationSaveDestination,
  locationToFormData,
  resolveLocationSaveStatus,
} from "./use-location-form";

const location: Location = {
  id: "loc-1",
  regionId: "region-sz",
  name: "梧桐山",
  slug: "wutong-mountain",
  supportedActivityTypes: ["hiking", "travel"],
  status: "published",
  subtitle: "鹏城第一峰",
  description: "深圳第一高峰",
  address: "罗湖区",
  latitude: 22.58,
  longitude: 114.2,
  coverImageUrl: "https://gomate.cos.jiahongw.com/locations/wutong.jpg",
  images: ["https://gomate.cos.jiahongw.com/locations/wutong-2.jpg"],
  extra: {
    hiking: {
      difficulty: "moderate",
      durationMin: 120,
      durationMax: 180,
      distanceKm: 5.5,
      elevationGainM: 700,
      bestSeasons: ["autumn"],
      gearEssential: ["登山鞋"],
      gearOptional: ["登山杖"],
      overview: "泰山涧上山",
      tips: ["早点出发"],
      warnings: ["雨天路滑"],
    } as unknown as NonNullable<Location["extra"]["hiking"]>,
    facilities: ["restroom"],
  },
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
  tags: [{ id: "tag-1", name: "山野", slug: "mountain" }],
};

describe("Location form projection", () => {
  it("maps the public camelCase DTO without legacy flat fields", () => {
    expect(locationToFormData(location)).toMatchObject({
      regionId: "region-sz",
      supportedActivityTypes: ["hiking", "travel"],
      status: "published",
      latitude: 22.58,
      longitude: 114.2,
      coverImageUrl: location.coverImageUrl,
      extra: {
        hiking: {
          difficulty: "moderate",
          distanceKm: 5.5,
          elevationGainM: 700,
        },
      },
      tagIds: ["tag-1"],
    });
    expect(locationToFormData(location).extra.hiking).not.toHaveProperty("gearEssential");
    expect(locationToFormData(location).extra.hiking).not.toHaveProperty("gearOptional");
  });

  it("emits the exact mutation payload and trims JSON arrays", () => {
    const form = locationToFormData(location);
    form.extra.hiking.tips = [" 早点出发 ", ""];

    expect(formDataToLocationPayload(form)).toEqual({
      regionId: "region-sz",
      name: "梧桐山",
      slug: "wutong-mountain",
      supportedActivityTypes: ["hiking", "travel"],
      status: "published",
      subtitle: "鹏城第一峰",
      description: "深圳第一高峰",
      address: "罗湖区",
      latitude: 22.58,
      longitude: 114.2,
      coverImageUrl: location.coverImageUrl,
      images: location.images,
      extra: {
        hiking: {
          difficulty: "moderate",
          durationMin: 120,
          durationMax: 180,
          distanceKm: 5.5,
          elevationGainM: 700,
          bestSeasons: ["autumn"],
          overview: "泰山涧上山",
          tips: ["早点出发"],
          warnings: ["雨天路滑"],
        },
        facilities: ["restroom"],
      },
    });
    expect(formDataToLocationPayload(form).extra.hiking).not.toHaveProperty("gearEssential");
    expect(formDataToLocationPayload(form).extra.hiking).not.toHaveProperty("gearOptional");
  });

  it("omits an empty hiking object for non-hiking locations", () => {
    const payload = formDataToLocationPayload({
      ...DEFAULT_LOCATION_FORM,
      regionId: "region-sz",
      name: "咖啡馆",
      description: "社区咖啡馆",
      latitude: 22.5,
      longitude: 114.1,
      coverImageUrl: "https://gomate.cos.jiahongw.com/locations/cafe.jpg",
    });

    expect(payload.extra.hiking).toBeUndefined();
  });

  it("keeps unknown draft coordinates and cover as null", () => {
    const payload = formDataToLocationPayload({
      ...DEFAULT_LOCATION_FORM,
      regionId: "region-sz",
      name: "灵感地点",
      description: "先记录下来",
    });

    expect(payload).toMatchObject({
      status: "draft",
      latitude: null,
      longitude: null,
      coverImageUrl: null,
      supportedActivityTypes: [],
    });
  });

  it("resolves explicit save intents without inferring state from button copy", () => {
    expect(resolveLocationSaveStatus("draft", "keep")).toBe("draft");
    expect(resolveLocationSaveStatus("draft", "publish")).toBe("published");
    expect(resolveLocationSaveStatus("archived", "restore")).toBe("draft");
    expect(resolveLocationSaveStatus("archived", "publish")).toBe("archived");
    expect(resolveLocationSaveStatus("published", "keep")).toBe("published");
  });

  it("navigates only after first creation and always stays in the admin editor", () => {
    expect(locationSaveDestination("create", "loc-1")).toBe(
      "/admin/locations/loc-1/edit",
    );
    expect(locationSaveDestination("edit", "loc-1")).toBeNull();
  });
});
