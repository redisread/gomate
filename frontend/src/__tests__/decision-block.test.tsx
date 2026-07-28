import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionBlock } from "../components/features/location-detail/decision-block";
import type { Location } from "../lib/types";

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

  // task #170 CR B1（Martin）：sentinel {0,0} 不能通过 hasCoords，否则占位
  // 坐标漏过校验会触发 amap fetch → mapUrl 指向 (0,0) 非洲外海
  it("sentinel {0,0} 坐标 → hasCoords=false，transport sub-block 不渲染 + fetch 不发起", () => {
    const location = makeLocation({
      coordinates: { lat: 0, lng: 0 },
    });
    const { container } = render(<DecisionBlock location={location} />);
    // 无 parking / gear，整块空态
    expect(container.firstChild).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sentinel {0,0} 坐标 + parking 数据 → parking 渲染但 transport 不发起 + 不显 CTA", () => {
    const location = makeLocation({
      coordinates: { lat: 0, lng: 0 },
      parkingAvailable: false,
    });
    render(<DecisionBlock location={location} />);
    expect(screen.getByText("locationDetail.parking.title")).toBeInTheDocument();
    expect(screen.queryByText("locationDetail.transport.title")).toBeNull();
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

;

  it("amapAllFailed → 只渲染 fallbackHint + openInMap", async () => {
    const payload = {
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

;

;

  // task #170 CR Nit 1（Martin）：AbortController — unmount 时 fetch 应被 abort
  // 且 AbortError 不能触发 error setState
;
});
