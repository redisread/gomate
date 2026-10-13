import { describe, expect, it } from "vitest";
import {
  CHINA_MAP_BOUNDS,
  getMapTransform,
  parseMapProvince,
  projectChina,
  parseMapSelection,
  getMapSelectionUrl,
  getMapPointCandidates,
  transformMapPoint,
} from "./china-map";

describe("china map navigation", () => {
  it("restores a location selection without treating an invalid province as valid", () => {
    expect(parseMapSelection("?mapProvince=广东省&mapLocation=loc-1")).toEqual({
      province: "广东省",
      locationId: "loc-1",
    });
    expect(parseMapSelection("?mapProvince=invalid&mapLocation=loc-1")).toEqual(
      { province: null, locationId: "loc-1" },
    );
  });

  it("updates only map parameters and preserves other homepage state", () => {
    expect(
      getMapSelectionUrl(
        "https://example.test/?q=山&mapProvince=广东省&mapLocation=loc-1#map",
        { province: null, locationId: null },
      ),
    ).toBe("/?q=%E5%B1%B1#map");
  });

  it("chooses the closest screen-space point and exposes indistinguishable candidates", () => {
    const points = [
      { id: "a", x: 100, y: 100 },
      { id: "b", x: 102, y: 100 },
      { id: "c", x: 125, y: 100 },
    ];
    expect(
      getMapPointCandidates(points, { x: 98, y: 100 }).map((p) => p.id),
    ).toEqual(["a", "b"]);
    expect(
      getMapPointCandidates(points, { x: 126, y: 100 }).map((p) => p.id),
    ).toEqual(["c"]);
    expect(getMapPointCandidates(points, { x: 200, y: 200 })).toEqual([]);
  });
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
    for (const province of [
      "不存在的省份",
      "__proto__",
      "constructor",
      "toString",
    ]) {
      expect(parseMapProvince(`?mapProvince=${province}`)).toBeNull();
    }
    expect(parseMapProvince("?mapProvince=%E5%B9%BF%E4%B8%9C%E7%9C%81")).toBe(
      "广东省",
    );
  });

  it("keeps projected coordinates unchanged in the national view", () => {
    const point = projectChina(22.5, 114);
    expect(transformMapPoint(point, getMapTransform(null))).toEqual(point);
  });
});
