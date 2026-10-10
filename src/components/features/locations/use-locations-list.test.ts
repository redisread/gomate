import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Location } from "@/lib/types";
import { fetchCurrentUser, fetchPublicAPI } from "@/lib/api";
import { fetchSelectableRegions } from "@/lib/regions";
import { useLocationsList, type LocationsListInitialData } from "./use-locations-list";

vi.mock("@/lib/api", () => ({
  fetchCurrentUser: vi.fn(),
  fetchPublicAPI: vi.fn(),
}));
vi.mock("@/lib/regions", () => ({ fetchSelectableRegions: vi.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function response(data: unknown) {
  return { json: async () => data } as Response;
}

const initialLocation = { id: "initial", name: "初始地点" } as unknown as Location;
const nextLocation = { id: "next", name: "最新地点" } as unknown as Location;
const staleLocation = { id: "stale", name: "过期地点" } as unknown as Location;

const initialData: LocationsListInitialData = {
  locations: [initialLocation],
  pagination: { limit: 12, total: 1, nextCursor: null },
  popularTags: [],
  regions: [],
};

describe("useLocationsList", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/locations");
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(fetchPublicAPI).mockReset();
    vi.mocked(fetchSelectableRegions).mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("只应用最新请求，避免旧筛选结果覆盖用户当前选择", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
    const firstRequest = deferred<Response>();
    const secondRequest = deferred<Response>();
    vi.mocked(fetchPublicAPI).mockImplementation((path) => {
      if (path.includes("search=first")) return firstRequest.promise;
      return secondRequest.promise;
    });

    const { result } = renderHook(() => useLocationsList(initialData));

    let firstLoad: Promise<void> | undefined;
    let secondLoad: Promise<void> | undefined;
    await act(async () => {
      firstLoad = result.current.loadLocations({ search: "first" });
      secondLoad = result.current.loadLocations({ search: "second" });
      secondRequest.resolve(response({
        success: true,
        locations: [nextLocation],
        total: 1,
        nextCursor: null,
      }));
      await secondLoad;
      firstRequest.resolve(response({
        success: true,
        locations: [staleLocation],
        total: 1,
        nextCursor: null,
      }));
      await firstLoad;
    });

    expect(result.current.locations).toEqual([nextLocation]);
    expect(result.current.isRefreshing).toBe(false);
  });

  it("uses activityType and reads the current Region id from UserExtra", async () => {
    vi.mocked(fetchSelectableRegions).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      extra: { city: "region-sz" },
    } as Awaited<ReturnType<typeof fetchCurrentUser>>);
    vi.mocked(fetchPublicAPI).mockResolvedValue(response({
      success: true,
      locations: [],
      total: 0,
      nextCursor: null,
    }));

    const { result } = renderHook(() => useLocationsList(initialData));
    await act(async () => {
      await result.current.loadLocations({
        regionId: "region-sz",
        activityType: "hiking",
      });
    });

    expect(fetchPublicAPI).toHaveBeenCalledWith(
      "/locations?limit=12&regionId=region-sz&activityType=hiking",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.userRegionId).toBe("region-sz");
  });

  it("sends only an opaque cursor when loading the next result window", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
    vi.mocked(fetchPublicAPI).mockResolvedValue(response({
      success: true,
      locations: [],
      total: 20,
      nextCursor: null,
    }));
    const { result } = renderHook(() => useLocationsList({
      ...initialData,
      pagination: { limit: 12, total: 20, nextCursor: "opaque-next" },
    }));

    await act(async () => {
      await result.current.loadLocations({ cursor: "opaque-next" });
    });

    const path = vi.mocked(fetchPublicAPI).mock.calls[0]?.[0] as string;
    expect(path).toBe("/locations?limit=12&cursor=opaque-next");
    expect(path).not.toMatch(/page(Size)?=/u);
  });
  it("切换城市立即请求并保留兴趣，局部清除保留搜索与活动类型", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
    vi.mocked(fetchPublicAPI).mockResolvedValue(response({ success: true, locations: [nextLocation], total: 1 }));
    const { result } = renderHook(() => useLocationsList(initialData));
    await act(async () => {
      result.current.setSearchQuery("coffee");
      result.current.handleRoleSelect("leisure");
      result.current.handleTagToggle("cafe");
      result.current.handleRegionSelect("sz");
    });
    expect(fetchPublicAPI).toHaveBeenLastCalledWith(
      "/locations?limit=12&search=coffee&tagIds=cafe&regionId=sz&activityType=leisure",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(new URLSearchParams(window.location.search).get("tags")).toBe("cafe");
    await act(async () => result.current.handleClearFilters());
    expect(result.current.searchQuery).toBe("coffee");
    expect(result.current.activeRole).toBe("leisure");
    expect(result.current.selectedTags).toEqual([]);
    expect(result.current.selectedRegionId).toBe("");
    expect(new URLSearchParams(window.location.search).get("q")).toBe("coffee");
  });

  it("输入搜索时立即作废旧响应，防抖等待期间也不能覆盖当前选择", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
    const pending = deferred<Response>();
    vi.mocked(fetchPublicAPI).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useLocationsList(initialData));
    let load: Promise<void>;
    act(() => { load = result.current.loadLocations({ regionId: "sz" }); });
    await act(async () => {
      result.current.setSearchQuery("new");
      pending.resolve(response({ success: true, locations: [staleLocation], total: 1 }));
      await load;
    });
    expect(result.current.locations).toEqual([initialLocation]);
    expect(result.current.isRefreshing).toBe(true);
    expect(fetchPublicAPI).toHaveBeenCalledTimes(1);
  });

  it("请求失败保留旧结果并暴露可重试状态", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
    vi.mocked(fetchPublicAPI).mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useLocationsList(initialData));
    await act(async () => result.current.handleRegionSelect("sz"));
    expect(result.current.locations).toEqual([initialLocation]);
    expect(result.current.hasLoadError).toBe(true);
    vi.mocked(fetchPublicAPI).mockResolvedValue(response({ success: true, locations: [nextLocation], total: 1 }));
    await act(async () => result.current.handleRetry());
    expect(result.current.locations).toEqual([nextLocation]);
    expect(result.current.hasLoadError).toBe(false);
  });

  it("从 URL 恢复筛选并保存详情返回所需的游标与位置", async () => {
    window.history.replaceState(null, "", "/locations?q=coffee&tags=cafe&regionId=sz&activityType=leisure");
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
    const { result } = renderHook(() => useLocationsList(initialData));
    expect(result.current.searchQuery).toBe("coffee");
    expect(result.current.selectedTags).toEqual(["cafe"]);
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(window.history.state.gomateLocations).toEqual(expect.objectContaining({ scrollY: 0, page: 1 }));
  });

  it("从分享的游标窗口落地后，下一页再上一页回到落地窗口", async () => {
    window.history.replaceState(null, "", "/locations?cursor=landing-window");
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
    vi.mocked(fetchPublicAPI).mockResolvedValue(response({ success: true, locations: [nextLocation], total: 37, nextCursor: "third-window" }));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const landingData = { ...initialData, cursor: "landing-window", pagination: { limit: 12, total: 37, nextCursor: "next-window" } };
    const { result } = renderHook(() => useLocationsList(landingData));
    await act(async () => result.current.handlePageChange(2));
    await act(async () => result.current.handlePageChange(1));
    expect(fetchPublicAPI).toHaveBeenLastCalledWith("/locations?limit=12&cursor=landing-window", expect.anything());
  });

  it("从空结果切换条件保持空态容器，避免回到六张骨架", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
    const pending = deferred<Response>();
    vi.mocked(fetchPublicAPI).mockReturnValue(pending.promise);
    const emptyData = { ...initialData, locations: [] };
    const { result } = renderHook(() => useLocationsList(emptyData));
    act(() => result.current.handleRegionSelect("sz"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(true);
    await act(async () => pending.resolve(response({ success: true, locations: [], total: 0 })));
    expect(result.current.isRefreshing).toBe(false);
  });

});
