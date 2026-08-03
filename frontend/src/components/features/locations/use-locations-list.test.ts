import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Location } from "@/lib/types";
import { fetchCurrentUser, fetchPublicAPI } from "@/lib/api";
import { useLocationsList, type LocationsListInitialData } from "./use-locations-list";

vi.mock("@/lib/api", () => ({
  fetchCurrentUser: vi.fn(),
  fetchPublicAPI: vi.fn(),
}));

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
  pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
  popularTags: [],
  cities: [],
};

describe("useLocationsList", () => {
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
      firstLoad = result.current.loadLocations({ page: 1, search: "first" });
      secondLoad = result.current.loadLocations({ page: 1, search: "second" });
      secondRequest.resolve(response({
        success: true,
        locations: [nextLocation],
        pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
      }));
      await secondLoad;
      firstRequest.resolve(response({
        success: true,
        locations: [staleLocation],
        pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
      }));
      await firstLoad;
    });

    expect(result.current.locations).toEqual([nextLocation]);
    expect(result.current.isRefreshing).toBe(false);
  });
});
