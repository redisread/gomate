import { describe, expect, it } from "vitest";
import {
  CHINA_MAP_BOUNDS,
  getMapTransform,
  parseMapProvince,
  projectChina,
  transformMapPoint,
} from "./china-map";

describe("china map navigation", () => {
  it("uses the national view when no province is selected", () => {
    expect(getMapTransform(null)).toEqual({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
  });

  it("centers a selected province in the map viewport", () => {
    const transform = getMapTransform("广东省");
    const center = { x: 511.5, y: 517.4 };
    const focused = transformMapPoint(center, transform);

    expect(focused.x).toBeCloseTo(CHINA_MAP_BOUNDS.width / 2);
    expect(focused.y).toBeCloseTo(CHINA_MAP_BOUNDS.height / 2);
    expect(transform.scale).toBeGreaterThan(1);
  });

  it("ignores unknown province values from the URL", () => {
    expect(parseMapProvince("?mapProvince=不存在的省份")).toBeNull();
    expect(parseMapProvince("?mapProvince=%E5%B9%BF%E4%B8%9C%E7%9C%81")).toBe("广东省");
  });

  it("keeps projected coordinates unchanged in the national view", () => {
    const point = projectChina(22.5, 114);
    expect(transformMapPoint(point, getMapTransform(null))).toEqual(point);
  });
});
