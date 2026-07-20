import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionBlock } from "../components/features/location-detail/decision-block";
import type { Location, TransportationResponse } from "../lib/types";

/**
 * task #170（P0-B T3）DecisionBlock 状态机测试
 *
 * 覆盖矩阵：
 *   1. 全空 location → 整块不渲染（返回 null）
 *   2. 只有 parking 数据 → 只渲染 parking sub-block（跳过 transport fetch）
 *   3. 只有 gear 数据 → 只渲染 gear sub-block
 *   4. 有坐标，fetch 返回 ready（subway+driving）→ 渲染 subway / driving / openInMap
 *   5. 有坐标，fetch 返回 amapAllFailed → 只渲染 fallbackHint + openInMap CTA
 *   6. 有坐标，fetch 失败 → 渲染 error fallback（fallbackHint + retry + coord-based mapUrl）
 *   7. staleDays >= 7 → 渲染 stale 提示
 */

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

const fetchMock = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchAPI: (path: string, opts?: RequestInit) => fetchMock(path, opts),
}));

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "loc-1",
    name: "测试地点",
    slug: "test",
    description: "",
    cityId: "c1",
    cityName: "深圳",
    bestSeason: [],
    coverImage: "",
    images: [],
    coordinates: { lat: 22.54, lng: 114.06 },
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as unknown as Response;
}

describe("DecisionBlock", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("全空 location（无坐标 + 无停车 + 无装备）→ 不渲染", () => {
    const location = makeLocation({
      coordinates: { lat: Number.NaN, lng: Number.NaN },
    });
    const { container } = render(<DecisionBlock location={location} />);
    expect(container.firstChild).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("只有 parking 数据 → 只渲染 parking sub-block，不发起 transport 请求", () => {
    const location = makeLocation({
      coordinates: { lat: Number.NaN, lng: Number.NaN },
      parkingAvailable: true,
      parkingInfo: "免费停车",
    });
    render(<DecisionBlock location={location} />);
    expect(screen.getByText("locationDetail.parking.title")).toBeInTheDocument();
    expect(screen.getByText("locationDetail.parking.available")).toBeInTheDocument();
    expect(screen.getByText("免费停车")).toBeInTheDocument();
    expect(screen.queryByText("locationDetail.transport.title")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("只有 gear 数据 → 只渲染 gear sub-block", () => {
    const location = makeLocation({
      coordinates: { lat: Number.NaN, lng: Number.NaN },
      gearEssential: ["登山鞋", "帽子"],
      gearOptional: ["登山杖"],
    });
    render(<DecisionBlock location={location} />);
    expect(screen.getByText("locationDetail.gear.title")).toBeInTheDocument();
    expect(screen.getByText("登山鞋")).toBeInTheDocument();
    expect(screen.getByText("帽子")).toBeInTheDocument();
    expect(screen.getByText("登山杖")).toBeInTheDocument();
  });

  it("有坐标 + fetch ready（subway+driving）→ 渲染两条路线 + openInMap", async () => {
    const payload: TransportationResponse = {
      success: true,
      locationId: "loc-1",
      transportation: {
        mapUrl: "https://uri.amap.com/marker?position=114.06,22.54",
        subway: {
          station: "市民中心",
          lines: ["4号线"],
          distanceMeters: 500,
          walkMinutes: 8,
          approximate: false,
        },
        driving: {
          distanceKm: 12,
          durationMinutes: 25,
          referencePointLabel: { zh: "福田市民中心", en: "Futian Civic Center", ja: "" },
        },
        amapAllFailed: false,
      },
      meta: { cacheHit: false, staleDays: null },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));

    const location = makeLocation();
    render(<DecisionBlock location={location} />);

    await waitFor(() => {
      expect(screen.getByText("locationDetail.transport.openInMap")).toBeInTheDocument();
    });
    expect(screen.getByText("locationDetail.transport.subwayLabel")).toBeInTheDocument();
    expect(screen.getByText("locationDetail.transport.drivingLabel")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/locations/loc-1/transportation",
      undefined,
    );
  });

  it("amapAllFailed → 只渲染 fallbackHint + openInMap", async () => {
    const payload: TransportationResponse = {
      success: true,
      locationId: "loc-1",
      transportation: {
        mapUrl: "https://uri.amap.com/marker?position=114.06,22.54&callnative=1",
        subway: null,
        driving: null,
        amapAllFailed: true,
      },
      meta: { cacheHit: true, staleDays: null },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));

    render(<DecisionBlock location={makeLocation()} />);
    await waitFor(() => {
      expect(screen.getByText("locationDetail.transport.fallbackHint")).toBeInTheDocument();
    });
    expect(screen.getByText("locationDetail.transport.openInMap")).toBeInTheDocument();
    expect(screen.queryByText("locationDetail.transport.subwayLabel")).toBeNull();
    expect(screen.queryByText("locationDetail.transport.drivingLabel")).toBeNull();
  });

  it("fetch 失败 → 走 error fallback（retry + coord-based mapUrl）", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    render(<DecisionBlock location={makeLocation()} />);
    await waitFor(() => {
      expect(screen.getByText("locationDetail.transport.retry")).toBeInTheDocument();
    });
    expect(screen.getByText("locationDetail.transport.fallbackHint")).toBeInTheDocument();
    const link = screen.getByText("locationDetail.transport.openInMap").closest("a");
    expect(link?.getAttribute("href")).toContain("position=114.06,22.54");
  });

  it("staleDays >= 7 → 渲染 stale 提示", async () => {
    const payload: TransportationResponse = {
      success: true,
      locationId: "loc-1",
      transportation: {
        mapUrl: "https://uri.amap.com/marker?position=114.06,22.54",
        subway: {
          station: "市民中心",
          lines: [],
          distanceMeters: 500,
          walkMinutes: 8,
          approximate: false,
        },
        driving: null,
        amapAllFailed: false,
      },
      meta: { cacheHit: true, staleDays: 14 },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));

    render(<DecisionBlock location={makeLocation()} />);
    await waitFor(() => {
      expect(screen.getByText("locationDetail.transport.stale")).toBeInTheDocument();
    });
  });
});
