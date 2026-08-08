import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTeams } from "./use-teams";
import { fetchPublicAPI } from "@/lib/api";
import { getDateRangeByQuickType } from "@/lib/date-beijing";

vi.mock("@/lib/api", () => ({
  fetchPublicAPI: vi.fn(),
}));

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
        pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        availableTags: [],
        availableCities: [{ id: "city", adcode: "1", name: "城市", level: "city", isHot: true }],
      }),
    );

    act(() => {
      result.current.setStartDate("2026-08-08");
    });

    expect(result.current.activeFiltersCount).toBe(1);
  });

  it("hydrates the selected city from SSR filters and counts it as active", () => {
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        availableTags: [],
        availableCities: [
          {
            id: "city-shenzhen",
            adcode: "440300",
            name: "深圳",
            level: "city",
            isHot: true,
          },
        ],
        filters: {
          searchQuery: "",
          currentPage: 1,
          selectedDifficulty: [],
          selectedCityId: "city-shenzhen",
          startDate: "",
          endDate: "",
          selectedTags: [],
        },
      }),
    );

    expect(result.current.selectedCityId).toBe("city-shenzhen");
    expect(result.current.selectedCityName).toBe("深圳");
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
        pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        availableTags: [],
        availableCities: [{ id: "city", adcode: "1", name: "城市", level: "city", isHot: true }],
      }),
    );

    let firstLoad!: Promise<void>;
    let secondLoad!: Promise<void>;
    act(() => {
      firstLoad = result.current.loadTeams({ cityId: "old-city" });
      secondLoad = result.current.loadTeams({ cityId: "new-city" });
    });

    resolveSecond({
      json: async () => ({ success: true, teams: [{ id: "new-team" }], pagination: { total: 1, totalPages: 1, pageSize: 12 } }),
    } as Response);
    await act(async () => { await secondLoad; });

    resolveFirst({
      json: async () => ({ success: true, teams: [{ id: "old-team" }], pagination: { total: 1, totalPages: 1, pageSize: 12 } }),
    } as Response);
    await act(async () => { await firstLoad; });

    expect(result.current.teams[0]?.id).toBe("new-team");
    expect(result.current.isLoading).toBe(false);
  });

  it("retries city loading on the client when SSR returned no cities", async () => {
    vi.mocked(fetchPublicAPI).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        cities: [{ id: "sz", adcode: "440300", name: "深圳", level: "city", isHot: true }],
        pagination: { hasMore: false },
      }),
    } as Response);

    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        availableTags: [],
        availableCities: [],
      }),
    );

    await waitFor(() => expect(result.current.availableCities).toHaveLength(1));
    expect(result.current.availableCities[0]?.name).toBe("深圳");
  });

  it("hydrates the 30-day shortcut instead of hiding it as an unlimited date", () => {
    const range = getDateRangeByQuickType("30days")!;
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        availableTags: [],
        availableCities: [{ id: "city", adcode: "1", name: "城市", level: "city", isHot: true }],
        filters: {
          searchQuery: "",
          currentPage: 1,
          selectedDifficulty: [],
          selectedCityId: "",
          startDate: range.start,
          endDate: range.end,
          selectedTags: [],
        },
      }),
    );

    expect(result.current.activeDateQuickType).toBe("30days");
    expect(result.current.hasDateFilter).toBe(true);
  });

  it("keeps page navigation on the requested page without a delayed page-one request", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchPublicAPI).mockResolvedValueOnce({
      json: async () => ({ success: true, teams: [{ id: "page-2-team" }], pagination: { page: 2, total: 20, totalPages: 2, pageSize: 12 } }),
    } as Response);

    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { page: 1, pageSize: 12, total: 20, totalPages: 2 },
        availableTags: [],
        availableCities: [{ id: "city", adcode: "1", name: "城市", level: "city", isHot: true }],
      }),
    );

    act(() => result.current.handlePageChange(2));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });

    expect(fetchPublicAPI).toHaveBeenCalledTimes(1);
    expect(result.current.currentPage).toBe(2);
    expect(window.location.search).toBe("?page=2");
    vi.useRealTimers();
  });

  it("resets pagination when search changes", () => {
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { page: 2, pageSize: 12, total: 20, totalPages: 2 },
        availableTags: [],
        availableCities: [{ id: "city", adcode: "1", name: "城市", level: "city", isHot: true }],
        filters: {
          searchQuery: "",
          currentPage: 2,
          selectedDifficulty: [],
          selectedCityId: "",
          startDate: "",
          endDate: "",
          selectedTags: [],
        },
      }),
    );

    act(() => result.current.handleSearchChange("徒步"));
    expect(result.current.currentPage).toBe(1);
    expect(result.current.isLoading).toBe(true);
  });

  it("keeps the current page when an already-selected empty filter is clicked", () => {
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { page: 2, pageSize: 12, total: 20, totalPages: 2 },
        availableTags: [],
        availableCities: [{ id: "city", adcode: "1", name: "城市", level: "city", isHot: true }],
        filters: {
          searchQuery: "",
          currentPage: 2,
          selectedDifficulty: [],
          selectedCityId: "",
          startDate: "",
          endDate: "",
          selectedTags: [],
        },
      }),
    );

    act(() => {
      result.current.handleCitySelect("");
      result.current.handleDateQuickSelect("clear");
    });
    expect(result.current.currentPage).toBe(2);
  });

  it("shows an explicit error state when the latest request fails", async () => {
    vi.mocked(fetchPublicAPI).mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() =>
      useTeams({
        teams: [],
        pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
        availableTags: [],
        availableCities: [{ id: "city", adcode: "1", name: "城市", level: "city", isHot: true }],
      }),
    );

    await act(async () => { await result.current.loadTeams({ cityId: "city" }); });
    expect(result.current.loadError).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
