import { describe, expect, it } from "vitest";
import type { Location } from "@/lib/types";
import {
  DEFAULT_LOCATION_FORM,
  formDataToLocationPayload,
  locationSaveRedirect,
  locationToFormData,
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
    },
    facilities: ["restroom"],
  },
  createdByUserId: "admin-1",
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
          gearEssential: ["登山鞋"],
        },
      },
      tagIds: ["tag-1"],
    });
  });

  it("emits the exact mutation payload and trims JSON arrays", () => {
    const form = locationToFormData(location);
    form.extra.hiking.tips = [" 早点出发 ", ""];
    form.extra.hiking.gearOptional = [];

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
          gearEssential: ["登山鞋"],
          gearOptional: [],
          overview: "泰山涧上山",
          tips: ["早点出发"],
          warnings: ["雨天路滑"],
        },
        facilities: ["restroom"],
      },
    });
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

  it("keeps non-public locations in the admin editor after save", () => {
    expect(locationSaveRedirect({ ...location, status: "draft" })).toBe(
      "/admin/locations/loc-1/edit",
    );
    expect(locationSaveRedirect({ ...location, status: "archived" })).toBe(
      "/admin/locations/loc-1/edit",
    );
    expect(locationSaveRedirect(location)).toBe("/locations/loc-1");
  });
});
