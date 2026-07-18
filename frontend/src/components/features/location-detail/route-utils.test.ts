import { describe, expect, it } from "vitest";
import { formatRouteMetric, normalizeLocationHiking } from "./route-utils";
import type { Location } from "@/lib/types";

describe("normalizeLocationHiking", () => {
  it("从 location 五字段 + extra.hiking 构造徒步攻略数据", () => {
    const hiking = normalizeLocationHiking({
      id: "loc-1",
      name: "梧桐山",
      difficulty: "moderate",
      durationMin: 120,
      durationMax: 180,
      distance: 5.5,
      elevation: 700,
      extra: {
        hiking: {
          overview: "沿泰山涧步道上山。",
          tips: ["后半段较陡"],
          equipmentNeeded: ["登山鞋", "登山杖"],
          warnings: ["雨天路滑"],
        },
      },
    } as unknown as Location);

    expect(hiking).toMatchObject({
      id: "loc-1-hiking",
      name: "梧桐山",
      difficulty: "moderate",
      duration: { value: "2-3", unit: "hour" },
      distance: { value: "5.5", unit: "kilometer" },
      elevation: { value: "700", unit: "meter" },
      equipmentNeeded: ["登山鞋", "登山杖"],
      warnings: ["雨天路滑"],
      routeGuide: {
        overview: "沿泰山涧步道上山。",
        tips: ["后半段较陡"],
      },
    });
  });

  it("时长换算：不足 1 小时用分钟单位，单值不重复", () => {
    const hiking = normalizeLocationHiking({
      id: "loc-2",
      name: "莲花山",
      durationMin: 45,
      durationMax: 45,
    } as unknown as Location);

    expect(hiking?.duration).toEqual({ value: "45", unit: "minute" });
  });

  it("无参数且无 hiking 内容时返回 null（区块整体不渲染）", () => {
    const hiking = normalizeLocationHiking({
      id: "loc-3",
      name: "昆明",
      extra: { facilities: ["停车场"] },
    } as unknown as Location);

    expect(hiking).toBeNull();
  });

  it("extra.hiking 键显式为 null 时按无内容处理", () => {
    const hiking = normalizeLocationHiking({
      id: "loc-4",
      name: "空攻略山",
      extra: {
        hiking: { overview: null, tips: null, equipmentNeeded: null, warnings: null },
      },
    } as unknown as Location);

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
