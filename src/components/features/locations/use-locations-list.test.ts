import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(fetchPublicAPI).mockReset();
    vi.mocked(fetchSelectableRegions).mockReset();
  });

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
});
