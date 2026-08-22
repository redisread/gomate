import { describe, expect, it } from "vitest";
import { formatRouteMetric, normalizeLocationHiking } from "./route-utils";
import type { Location } from "@/lib/types";

function locationFixture(overrides: Partial<Location> = {}): Location {
  return {
    id: "loc-1",
    regionId: "region-sz",
    name: "梧桐山",
    slug: "wutong-mountain",
    supportedActivityTypes: ["hiking"],
    status: "published",
    subtitle: null,
    description: "深圳第一高峰",
    address: "深圳市罗湖区",
    latitude: 22.58,
    longitude: 114.2,
    coverImageUrl: "https://gomate.cos.jiahongw.com/locations/wutong.jpg",
    images: [],
    extra: {},
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalizeLocationHiking", () => {
  it("strictly maps the extra.hiking contract", () => {
    const hiking = normalizeLocationHiking(locationFixture({
      extra: {
        hiking: {
          difficulty: "moderate",
          durationMin: 120,
          durationMax: 180,
          distanceKm: 5.5,
          elevationGainM: 700,
          overview: "沿泰山涧步道上山。",
          tips: ["后半段较陡"],
          gearEssential: ["登山鞋"],
          gearOptional: ["登山杖"],
          warnings: ["雨天路滑"],
        },
      },
    }));

    expect(hiking).toMatchObject({
      id: "loc-1-hiking",
      name: "梧桐山",
      difficulty: "moderate",
      duration: { value: "2-3", unit: "hour" },
      distance: { value: "5.5", unit: "kilometer" },
      elevation: { value: "700", unit: "meter" },
      gearEssential: ["登山鞋"],
      gearOptional: ["登山杖"],
      warnings: ["雨天路滑"],
      routeGuide: {
        overview: "沿泰山涧步道上山。",
        tips: ["后半段较陡"],
      },
    });
  });

  it("时长换算：不足 1 小时用分钟单位，单值不重复", () => {
    const hiking = normalizeLocationHiking(locationFixture({
      id: "loc-2",
      name: "莲花山",
      extra: { hiking: { durationMin: 45, durationMax: 45 } },
    }));

    expect(hiking?.duration).toEqual({ value: "45", unit: "minute" });
  });

  it("无参数且无 hiking 内容时返回 null（区块整体不渲染）", () => {
    const hiking = normalizeLocationHiking(locationFixture({
      id: "loc-3",
      name: "昆明",
      extra: { facilities: ["停车场"] },
    }));

    expect(hiking).toBeNull();
  });

  it("empty optional hiking properties do not create a route", () => {
    const hiking = normalizeLocationHiking(locationFixture({
      id: "loc-4",
      name: "空攻略山",
      extra: {
        hiking: { overview: null, tips: [], gearEssential: [], gearOptional: [], warnings: [] },
      },
    }));

    expect(hiking).toBeNull();
  });
});

describe("formatRouteMetric", () => {
  const t = (key: string) => ({ "locationDetail.metricUnits.hour": "小时" })[key] ?? key;

  it("拼接值与 i18n 单位", () => {
    expect(formatRouteMetric({ value: "2-3", unit: "hour" }, t)).toBe("2-3 小时");
  });

  it("无单位时只返回值；metric 为空返回 undefined", () => {
    expect(formatRouteMetric({ value: "约 1 小时" }, t)).toBe("约 1 小时");
    expect(formatRouteMetric(undefined, t)).toBeUndefined();
  });
});
