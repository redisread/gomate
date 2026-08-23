import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionBlock } from "../components/features/location-detail/decision-block";
import type { Location } from "../lib/types";

/**
 * task #170（P0-B T3）DecisionBlock 状态机测试
 *
 * 覆盖矩阵：
 *   1. 全空 location → 整块不渲染（返回 null）
 *   2. 只有已退役 gear 数据 → 整块不渲染
 *   3. 有坐标 → 渲染 fallbackHint + openInMap CTA
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
  const base: Location = {
    id: "loc-1",
    name: "测试地点",
    slug: "test",
    supportedActivityTypes: ["hiking"],
    status: "published",
    subtitle: null,
    description: "",
    address: null,
    regionId: "region-sz",
    latitude: 22.54,
    longitude: 114.06,
    coverImageUrl: "https://gomate.cos.jiahongw.com/locations/test.jpg",
    images: [],
    extra: {},
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  };
  return {
    ...base,
    ...overrides,
    extra: {
      ...base.extra,
      ...overrides.extra,
      hiking: overrides.extra?.hiking
        ? { ...base.extra.hiking, ...overrides.extra.hiking }
        : base.extra.hiking,
    },
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
      latitude: Number.NaN,
      longitude: Number.NaN,
    });
    const { container } = render(<DecisionBlock location={location} />);
    expect(container.firstChild).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // task #170 CR B1（Martin）：sentinel {0,0} 不能通过 hasCoords，否则占位
  // 坐标漏过校验会触发 amap fetch → mapUrl 指向 (0,0) 非洲外海
  it("sentinel {0,0} 坐标 → hasCoords=false，transport sub-block 不渲染 + fetch 不发起", () => {
    const location = makeLocation({
      latitude: 0,
      longitude: 0,
    });
    const { container } = render(<DecisionBlock location={location} />);
    // 无 gear，整块空态
    expect(container.firstChild).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("只有已退役 gear 数据 → 不渲染装备或空壳区块", () => {
    const location = makeLocation({
      latitude: Number.NaN,
      longitude: Number.NaN,
      extra: {
        hiking: {
          gearEssential: ["登山鞋", "帽子"],
          gearOptional: ["登山杖"],
        },
      } as unknown as Location["extra"],
    });
    const { container } = render(<DecisionBlock location={location} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("locationDetail.gear.title")).toBeNull();
    expect(screen.queryByText("登山鞋")).toBeNull();
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
