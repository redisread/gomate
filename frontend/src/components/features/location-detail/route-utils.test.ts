import { describe, expect, it } from "vitest";
import { normalizeLocationRoutes } from "./route-utils";
import type { Location } from "@/lib/types";

describe("normalizeLocationRoutes", () => {
  it("normalizes API route metrics and parses stringified extra data", () => {
    const routes = normalizeLocationRoutes({
      id: "loc-1",
      name: "梧桐山",
      routes: [
        {
          id: "route-1",
          name: "泰山涧线路",
          difficulty: "moderate",
          durationMin: 120,
          durationMax: 180,
          distance: 5.5,
          elevation: 700,
          extra: JSON.stringify({
            equipmentNeeded: ["登山鞋", "登山杖"],
            warnings: ["雨天路滑"],
          }),
          routeGuide: JSON.stringify({
            overview: "沿泰山涧步道上山。",
            tips: ["后半段较陡"],
          }),
        },
      ],
    } as unknown as Location);

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      id: "route-1",
      name: "泰山涧线路",
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

  it("falls back to location-level route facts when route records are missing", () => {
    const routes = normalizeLocationRoutes({
      id: "loc-2",
      name: "临时地点",
      difficulty: "easy",
      duration: "约 1 小时",
      distance: "3 km",
      elevation: "120 m",
      equipmentNeeded: ["运动鞋"],
      extra: {
        warnings: ["注意防晒"],
      },
    } as unknown as Location);

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      id: "loc-2-fallback-route",
      name: "临时地点",
      difficulty: "easy",
      duration: { value: "约 1 小时" },
      distance: { value: "3", unit: "kilometer" },
      elevation: { value: "120", unit: "meter" },
      equipmentNeeded: ["运动鞋"],
      warnings: ["注意防晒"],
    });
  });
});
