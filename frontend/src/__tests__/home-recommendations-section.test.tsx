import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeRecommendationsSection } from "../components/features/home/recommendations/home-recommendations-section";
import type { RecommendationsResponse } from "../components/features/home/recommendations/types";

/**
 * P0-C T2 (task #173) — Section fetch flow / refresh state / error 态 / empty 态
 * Martin CR NIT-2 补测（B2 error 态 + refresh + seed 透传）
 */

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      if (!vars) return key;
      const varsStr = Object.entries(vars)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
      return varsStr ? `${key}[${varsStr}]` : key;
    },
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

// Mock fetchPublicAPI — 我们通过 mockFetch 变量控制每次 fetch 的返回
const mockFetch = vi.fn();
vi.mock("@/lib/api", () => ({
  fetchPublicAPI: (path: string) => mockFetch(path),
}));

function makeResponse(overrides: Partial<RecommendationsResponse> = {}): RecommendationsResponse {
  return {
    candidatePoolSize: 10,
    nextSeed: "seed-abc-123",
    recommendations: [
      {
        kind: "steady",
        locationId: "loc-1",
        reason: { key: "steady.season_close", params: { km: 10 } },
        location: {
          name: "梧桐山",
          coverImage: null,
          difficulty: "easy",
          durationMin: 180,
          distanceKm: 10,
          favCount: 5,
          storyCount: 2,
          ageDays: 100,
          futureTeams: 1,
        },
      },
      {
        kind: "worthy",
        locationId: "loc-2",
        reason: { key: "worthy.favorites", params: { n: 8 } },
        location: {
          name: "东西冲",
          coverImage: null,
          difficulty: "moderate",
          durationMin: 240,
          distanceKm: 30,
          favCount: 8,
          storyCount: 4,
          ageDays: 200,
          futureTeams: 0,
        },
      },
      {
        kind: "fresh",
        locationId: "loc-3",
        reason: { key: "fresh.new_location", params: { days: 3 } },
        location: {
          name: "七娘山",
          coverImage: null,
          difficulty: null,
          durationMin: null,
          distanceKm: null,
          favCount: 0,
          storyCount: 0,
          ageDays: 3,
          futureTeams: 1,
        },
      },
    ],
    ...overrides,
  };
}

function okResponse(body: RecommendationsResponse) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("HomeRecommendationsSection", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("首次挂载：先渲染 3 个 skeleton loading，再渲染 ready 卡片", async () => {
    // 用一个不 resolve 的 Promise 拿到 loading 快照
    let resolveFn: ((v: Response) => void) | undefined;
    mockFetch.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveFn = resolve;
      }),
    );

    render(<HomeRecommendationsSection />);
    // 双布局（mobile+desktop 都在 DOM），scoped to desktop container
    const desktopContainer = screen.getByTestId("recommendation-skeleton-desktop");
    expect(within(desktopContainer).getAllByTestId("recommendation-card-skeleton")).toHaveLength(3);

    resolveFn?.(okResponse(makeResponse()));
    await waitFor(() => {
      const desktopReadyContainer = screen.getByTestId("recommendation-cards-desktop");
      expect(within(desktopReadyContainer).getByTestId("recommendation-card-steady")).toBeTruthy();
      expect(within(desktopReadyContainer).getByTestId("recommendation-card-worthy")).toBeTruthy();
      expect(within(desktopReadyContainer).getByTestId("recommendation-card-fresh")).toBeTruthy();
    });
  });

  it("首次挂载 fetch 一次，路径不带 seed", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(makeResponse()));
    render(<HomeRecommendationsSection />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledWith("/api/recommendations/home");
  });

  it("换一批：点击后用 nextSeed 再 fetch 一次", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse(makeResponse({ nextSeed: "seed-round-1" })))
      .mockResolvedValueOnce(okResponse(makeResponse({ nextSeed: "seed-round-2" })));

    render(<HomeRecommendationsSection />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId("recommendation-refresh-btn"));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    // 第二次带 nextSeed
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/recommendations/home?seed=seed-round-1",
    );
  });

  it("error 态：fetch reject → 渲染 error banner + 重试按钮（Martin CR B2）", async () => {
    // 静默 console.error 以免污染测试输出
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    render(<HomeRecommendationsSection />);
    await waitFor(() => {
      expect(screen.getByTestId("home-recommendations-error")).toBeTruthy();
    });
    expect(document.body.textContent).toContain("home.recommendations.error");
    expect(screen.getByTestId("recommendation-retry-btn")).toBeTruthy();

    // 点击重试 → 再 fetch 一次并恢复到 ready（desktop container）
    mockFetch.mockResolvedValueOnce(okResponse(makeResponse()));
    fireEvent.click(screen.getByTestId("recommendation-retry-btn"));
    await waitFor(() => {
      const desktopReadyContainer = screen.getByTestId("recommendation-cards-desktop");
      expect(within(desktopReadyContainer).getByTestId("recommendation-card-steady")).toBeTruthy();
    });
    errSpy.mockRestore();
  });

  it("empty 态：recommendations = [] → 整个 section 不渲染（return null）", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(makeResponse({ recommendations: [] })));
    const { container } = render(<HomeRecommendationsSection />);
    await waitFor(() => {
      // section 不该在 DOM 里
      expect(screen.queryByTestId("home-recommendations-section")).toBeNull();
    });
    // 也没有 error banner
    expect(container.querySelector('[data-testid="home-recommendations-error"]')).toBeNull();
  });
});
