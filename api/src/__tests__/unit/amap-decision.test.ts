/**
 * P0-B T2 (task #169) — amap-decision 单测
 *
 * 覆盖：
 *  - toAmapCoord: "lng,lat" 顺序（amap 反直觉）
 *  - buildAmapNavigationUrl: 无 amap 依赖始终返回可点击 URL
 *  - fetchNearestSubway: happy path / amap 5xx / status != 1 / 无 pois / distance 解析
 *  - fetchDrivingToCityCenter: happy path / 5xx / 非法 distance
 *  - computeTransportation: 全成功 / subway 挂 driving 成功（独立降级）/ 双挂（amapAllFailed）/ 无 amapKey
 *
 * amap API 通过注入 `fetchImpl` mock 掉，不发真实请求。
 */

import { describe, it, expect } from "vitest";
import { computeTransportation, __test, buildAmapNavigationUrl, toAmapCoord } from "../../lib/amap-decision";

const { fetchNearestSubway, fetchDrivingToCityCenter } = __test;

const AMAP_KEY = "test-key";
const SZ_LAT = 22.5478;
const SZ_LNG = 114.0596;

/** 快速造 Response 的 helper */
function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// ==================== toAmapCoord ====================

describe("amap-decision: toAmapCoord", () => {
  it('输出 "lng,lat" 顺序（amap 反直觉，别写反）', () => {
    // 深圳市民中心：lat 22.5478, lng 114.0596
    expect(toAmapCoord(114.0596, 22.5478)).toBe("114.059600,22.547800");
  });

  it("6 位小数固定", () => {
    expect(toAmapCoord(1, 2)).toBe("1.000000,2.000000");
  });
});

// ==================== buildAmapNavigationUrl ====================

describe("amap-decision: buildAmapNavigationUrl", () => {
  it("返回 uri.amap.com marker URL，坐标 encode 后 lng 在前 lat 在后", () => {
    const url = buildAmapNavigationUrl(22.5478, 114.0596);
    expect(url).toMatch(/^https:\/\/uri\.amap\.com\/marker\?position=/);
    // encodeURIComponent("114.059600,22.547800") = "114.059600%2C22.547800"
    expect(url).toContain("114.059600%2C22.547800");
  });

  it("零 amap 依赖（无需 fetch）", () => {
    expect(() => buildAmapNavigationUrl(0, 0)).not.toThrow();
  });
});

// ==================== fetchNearestSubway ====================

describe("amap-decision: fetchNearestSubway", () => {
  it("happy path：返回 station/lines/distance/walkMinutes", async () => {
    const fetchImpl = async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/place/around")) {
        return jsonResp({
          status: "1",
          pois: [
            {
              name: "福田口岸站（4号线）",
              location: "114.060000,22.520000",
              distance: "500",
            },
          ],
        });
      }
      if (u.includes("/direction/walking")) {
        return jsonResp({
          status: "1",
          route: { paths: [{ duration: "480", distance: "500" }] },
        });
      }
      throw new Error("unexpected url " + u);
    };

    const res = await fetchNearestSubway({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).not.toBeNull();
    expect(res!.station).toBe("福田口岸");
    expect(res!.lines).toEqual(["4号线"]);
    expect(res!.distanceMeters).toBe(500);
    expect(res!.walkMinutes).toBe(8); // 480 / 60
    expect(res!.approximate).toBe(false);
  });

  it("walking direction 挂 → fallback 匀速 80m/min，approximate=true", async () => {
    const fetchImpl = async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/place/around")) {
        return jsonResp({
          status: "1",
          pois: [{ name: "test站", location: "1,1", distance: "800" }],
        });
      }
      if (u.includes("/direction/walking")) {
        return jsonResp({}, 500);
      }
      throw new Error("unexpected url");
    };

    const res = await fetchNearestSubway({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).not.toBeNull();
    expect(res!.walkMinutes).toBe(10); // 800 / 80
    expect(res!.approximate).toBe(true);
  });

  it("amap around 5xx → 返回 null（不 throw）", async () => {
    const fetchImpl = async () => jsonResp({}, 502);
    const res = await fetchNearestSubway({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).toBeNull();
  });

  it("amap status != 1 → 返回 null", async () => {
    const fetchImpl = async () => jsonResp({ status: "0", info: "INVALID_USER_KEY" });
    const res = await fetchNearestSubway({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).toBeNull();
  });

  it("周边无地铁（远郊）→ 返回 null，不 throw", async () => {
    const fetchImpl = async () => jsonResp({ status: "1", pois: [] });
    const res = await fetchNearestSubway({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).toBeNull();
  });

  it("distance=0 或 NaN → 返回 null（防脏数据）", async () => {
    const fetchImpl = async () =>
      jsonResp({
        status: "1",
        pois: [{ name: "test", location: "1,1", distance: "0" }],
      });
    const res = await fetchNearestSubway({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).toBeNull();
  });

  it("name 带 (1号线·2号线) → lines 拆多条", async () => {
    const fetchImpl = async (url: string | URL | Request) => {
      if (String(url).includes("/place/around")) {
        return jsonResp({
          status: "1",
          pois: [
            {
              name: "会展中心站(1号线·4号线)",
              location: "1,1",
              distance: "200",
            },
          ],
        });
      }
      return jsonResp({ status: "1", route: { paths: [{ duration: "120", distance: "200" }] } });
    };
    const res = await fetchNearestSubway({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res!.station).toBe("会展中心");
    expect(res!.lines).toEqual(["1号线", "4号线"]);
  });
});

// ==================== fetchDrivingToCityCenter ====================

describe("amap-decision: fetchDrivingToCityCenter", () => {
  it("happy path：distance km 保留 1 位 + duration min", async () => {
    const fetchImpl = async () =>
      jsonResp({
        status: "1",
        route: { paths: [{ distance: "35450", duration: "3060" }] },
      });
    const res = await fetchDrivingToCityCenter({
      lat: 22.7,
      lng: 114.5,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).not.toBeNull();
    expect(res!.distanceKm).toBe(35.5); // 35450m → 35.45 → round to 35.5
    expect(res!.durationMinutes).toBe(51); // 3060 / 60
    expect(res!.referencePointLabel.zh).toBe("深圳市中心");
    expect(res!.referencePointLabel.en).toBe("Shenzhen City Center");
  });

  it("amap 5xx → null", async () => {
    const fetchImpl = async () => jsonResp({}, 503);
    const res = await fetchDrivingToCityCenter({
      lat: 22.7,
      lng: 114.5,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).toBeNull();
  });

  it("路径为空数组 → null", async () => {
    const fetchImpl = async () => jsonResp({ status: "1", route: { paths: [] } });
    const res = await fetchDrivingToCityCenter({
      lat: 22.7,
      lng: 114.5,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).toBeNull();
  });

  it("distance=0 → null（防脏数据）", async () => {
    const fetchImpl = async () =>
      jsonResp({ status: "1", route: { paths: [{ distance: "0", duration: "60" }] } });
    const res = await fetchDrivingToCityCenter({
      lat: 22.7,
      lng: 114.5,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res).toBeNull();
  });

  it("未知 city → fallback 深圳中心 label", async () => {
    const fetchImpl = async () =>
      jsonResp({ status: "1", route: { paths: [{ distance: "1000", duration: "60" }] } });
    const res = await fetchDrivingToCityCenter({
      lat: 22.7,
      lng: 114.5,
      city: "gzhou-unknown",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res!.referencePointLabel.zh).toBe("深圳市中心");
  });
});

// ==================== computeTransportation ====================

describe("amap-decision: computeTransportation", () => {
  it("全成功 → mapUrl + subway + driving，amapAllFailed=false", async () => {
    const fetchImpl = async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/place/around")) {
        return jsonResp({
          status: "1",
          pois: [{ name: "梅林关站(4号线)", location: "1,1", distance: "300" }],
        });
      }
      if (u.includes("/direction/walking")) {
        return jsonResp({ status: "1", route: { paths: [{ duration: "180", distance: "300" }] } });
      }
      if (u.includes("/direction/driving")) {
        return jsonResp({ status: "1", route: { paths: [{ distance: "12000", duration: "1200" }] } });
      }
      throw new Error("unexpected url " + u);
    };

    const res = await computeTransportation({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.mapUrl).toContain("uri.amap.com");
    expect(res.subway).not.toBeNull();
    expect(res.subway!.station).toBe("梅林关");
    expect(res.driving).not.toBeNull();
    expect(res.driving!.distanceKm).toBe(12);
    expect(res.amapAllFailed).toBe(false);
  });

  it("subway 挂 + driving 成功 → 独立降级（subway=null，driving 有值）", async () => {
    const fetchImpl = async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/place/around")) {
        return jsonResp({}, 502); // subway 挂
      }
      if (u.includes("/direction/driving")) {
        return jsonResp({ status: "1", route: { paths: [{ distance: "1000", duration: "60" }] } });
      }
      return jsonResp({}, 500);
    };
    const res = await computeTransportation({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.subway).toBeNull();
    expect(res.driving).not.toBeNull();
    expect(res.amapAllFailed).toBe(false); // 只要有一个成功就不算全挂
  });

  it("subway + driving 双挂 → amapAllFailed=true，仅 mapUrl 可用", async () => {
    const fetchImpl = async () => jsonResp({}, 503);
    const res = await computeTransportation({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.subway).toBeNull();
    expect(res.driving).toBeNull();
    expect(res.amapAllFailed).toBe(true);
    expect(res.mapUrl).toContain("uri.amap.com");
  });

  it("amapKey 空 → 直接 amapAllFailed（不发请求）", async () => {
    let fetchCalled = 0;
    const fetchImpl = async () => {
      fetchCalled++;
      return jsonResp({});
    };
    const res = await computeTransportation({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: "",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchCalled).toBe(0);
    expect(res.amapAllFailed).toBe(true);
    expect(res.mapUrl).toContain("uri.amap.com");
  });

  it("fetch 抛异常（network error）→ 该字段 null，不 raise", async () => {
    const fetchImpl = async () => {
      throw new Error("ECONNRESET");
    };
    const res = await computeTransportation({
      lat: SZ_LAT,
      lng: SZ_LNG,
      city: "shenzhen",
      amapKey: AMAP_KEY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.subway).toBeNull();
    expect(res.driving).toBeNull();
    expect(res.amapAllFailed).toBe(true);
  });
});
