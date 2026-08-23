import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTeams } from "./use-teams";
import { fetchPublicAPI } from "@/lib/api";
import { getDateRangeByQuickType } from "@/lib/date-beijing";
import type { Region } from "@/lib/types";

vi.mock("@/lib/api", () => ({
  fetchPublicAPI: vi.fn(),
}));

function selectableRegion(overrides: Partial<Region> = {}): Region {
  return {
    id: "city",
    countryCode: "CN",
    parentId: null,
    name: "城市",
    nameEn: null,
    slug: "city",
    code: "1",
    level: "city",
    timezone: "Asia/Shanghai",
    centerLatitude: null,
    centerLongitude: null,
    serviceEnabled: true,
    isHot: true,
    sortOrder: 0,
    ...overrides,
  };
}

const EMPTY_FILTERS = {
  searchQuery: "",
  selectedActivityType: "" as const,
  selectedRecruitmentStatus: "open" as const,
  selectedRegionId: "",
  startDate: "",
  endDate: "",
  selectedTags: [] as string[],
};

describe("useTeams", () => {
  beforeEach(() => {
    vi.mocked(fetchPublicAPI).mockReset().mockRejectedValue(new Error("not requested in this test"));
    window.history.replaceState({}, "", "/teams");
    window.scrollTo = vi.fn();
  });

  it("counts a partially specified custom date range as an active filter", () => {
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 0, nextCursor: null },
        availableTags: [],
        availableRegions: [selectableRegion()],
      }),
    );

    act(() => {
      result.current.setStartDate("2026-08-08");
    });

    expect(result.current.activeFiltersCount).toBe(1);
  });

  it("hydrates the selected region from SSR filters and counts it as active", () => {
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 0, nextCursor: null },
        availableTags: [],
        availableRegions: [
          selectableRegion({ id: "city-shenzhen", code: "440300", name: "深圳", slug: "shenzhen" }),
        ],
        filters: {
          ...EMPTY_FILTERS,
          selectedRegionId: "city-shenzhen",
        },
      }),
    );

    expect(result.current.selectedRegionId).toBe("city-shenzhen");
    expect(result.current.selectedRegionName).toBe("深圳");
    expect(result.current.activeFiltersCount).toBe(1);
  });

  it("keeps the newest results when filter requests finish out of order", async () => {
    let resolveFirst!: (value: Response) => void;
    let resolveSecond!: (value: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const secondResponse = new Promise<Response>((resolve) => { resolveSecond = resolve; });
    vi.mocked(fetchPublicAPI)
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(secondResponse);

    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 0, nextCursor: null },
        availableTags: [],
        availableRegions: [selectableRegion()],
      }),
    );

    let firstLoad!: Promise<void>;
    let secondLoad!: Promise<void>;
    act(() => {
      firstLoad = result.current.loadTeams({ regionId: "old-city" });
      secondLoad = result.current.loadTeams({ regionId: "new-city" });
    });

    resolveSecond({
      json: async () => ({ success: true, teams: [{ id: "new-team" }], total: 1, nextCursor: null }),
    } as Response);
    await act(async () => { await secondLoad; });

    resolveFirst({
      json: async () => ({ success: true, teams: [{ id: "old-team" }], total: 1, nextCursor: null }),
    } as Response);
    await act(async () => { await firstLoad; });

    expect(result.current.teams[0]?.id).toBe("new-team");
    expect(result.current.isLoading).toBe(false);
  });

  it("sends only Team list filters to the backend", async () => {
    vi.mocked(fetchPublicAPI).mockResolvedValueOnce({
      json: async () => ({ success: true, teams: [], total: 0, nextCursor: null }),
    } as Response);
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 0, nextCursor: null },
        availableTags: [],
        availableRegions: [selectableRegion()],
      }),
    );

    await act(async () => {
      await result.current.loadTeams({
        activityType: "hiking",
        recruitmentStatus: "closed",
        regionId: "city",
      });
    });

    const requestPath = vi.mocked(fetchPublicAPI).mock.calls[0]?.[0] as string;
    const query = new URL(requestPath, "https://gomate.live").searchParams;
    expect(query.get("activityType")).toBe("hiking");
    expect(query.get("recruitmentStatus")).toBe("closed");
    expect(query.get("regionId")).toBe("city");
    expect(query.get("limit")).toBe("12");
    expect(query.has("page")).toBe(false);
    expect(query.has("pageSize")).toBe(false);
    expect(query.has("status")).toBe(false);
    expect(query.has("difficulty")).toBe(false);
  });

  it("retries region loading on the client when SSR returned no regions", async () => {
    vi.mocked(fetchPublicAPI).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        regions: [selectableRegion({ id: "sz", code: "440300", name: "深圳", slug: "shenzhen" })],
      }),
    } as Response);

    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 0, nextCursor: null },
        availableTags: [],
        availableRegions: [],
      }),
    );

    await waitFor(() => expect(result.current.availableRegions).toHaveLength(1));
    expect(result.current.availableRegions[0]?.name).toBe("深圳");
  });

  it("retries the tag dictionary when the SSR tag request failed", async () => {
    vi.mocked(fetchPublicAPI).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        tags: [{ id: "sunrise", name: "日出" }],
      }),
    } as Response);

    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 0, nextCursor: null },
        availableTags: [],
        tagsComplete: false,
        availableRegions: [selectableRegion()],
      }),
    );

    await waitFor(() => expect(result.current.availableTags).toEqual([
      { id: "sunrise", name: "日出" },
    ]));
    expect(fetchPublicAPI).toHaveBeenCalledWith("/tags?limit=200");
  });

  it("uses the code activity enum without fetching a catalog", () => {
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 0, nextCursor: null },
        availableTags: [],
        availableRegions: [selectableRegion()],
      }),
    );

    expect(result.current.availableActivityTypes).toEqual([
      "hiking",
      "explore",
      "leisure",
      "travel",
    ]);
    expect(fetchPublicAPI).not.toHaveBeenCalledWith("/activity-types");
  });

  it("hydrates the 30-day shortcut instead of hiding it as an unlimited date", () => {
    const range = getDateRangeByQuickType("30days")!;
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 0, nextCursor: null },
        availableTags: [],
        availableRegions: [selectableRegion()],
        filters: {
          ...EMPTY_FILTERS,
          startDate: range.start,
          endDate: range.end,
        },
      }),
    );

    expect(result.current.activeDateQuickType).toBe("30days");
    expect(result.current.hasDateFilter).toBe(true);
  });

  it("uses the opaque next cursor without serializing a page alias", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchPublicAPI).mockResolvedValueOnce({
      json: async () => ({ success: true, teams: [{ id: "page-2-team" }], total: 20, nextCursor: null }),
    } as Response);

    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 20, nextCursor: "cursor-page-2" },
        availableTags: [],
        availableRegions: [selectableRegion()],
      }),
    );

    act(() => result.current.handlePageChange(2));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });

    expect(fetchPublicAPI).toHaveBeenCalledTimes(1);
    const requestPath = vi.mocked(fetchPublicAPI).mock.calls[0]?.[0] as string;
    const query = new URL(requestPath, "https://gomate.live").searchParams;
    expect(query.get("cursor")).toBe("cursor-page-2");
    expect(query.has("page")).toBe(false);
    expect(query.has("pageSize")).toBe(false);
    expect(result.current.currentPage).toBe(2);
    expect(window.location.search).toBe("");
    vi.useRealTimers();
  });

  it("resets pagination when search changes", () => {
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 20, nextCursor: "cursor-page-3" },
        availableTags: [],
        availableRegions: [selectableRegion()],
        filters: {
          ...EMPTY_FILTERS,
        },
      }),
    );

    act(() => result.current.handleSearchChange("徒步"));
    expect(result.current.currentPage).toBe(1);
    expect(result.current.isLoading).toBe(true);
  });

  it("keeps the current page when an already-selected empty region filter is clicked", () => {
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 20, nextCursor: "cursor-page-3" },
        availableTags: [],
        availableRegions: [selectableRegion()],
        filters: {
          ...EMPTY_FILTERS,
        },
      }),
    );

    act(() => {
      result.current.handleRegionSelect("");
      result.current.handleDateQuickSelect("clear");
    });
    expect(result.current.currentPage).toBe(1);
  });

  it("shows an explicit error state when the latest request fails", async () => {
    vi.mocked(fetchPublicAPI).mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { limit: 12, total: 0, nextCursor: null },
        availableTags: [],
        availableRegions: [selectableRegion()],
      }),
    );

    await act(async () => { await result.current.loadTeams({ regionId: "city" }); });
    expect(result.current.loadError).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
