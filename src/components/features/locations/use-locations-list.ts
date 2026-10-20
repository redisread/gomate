import type { ApiResult, LocationsResponse, TagsResponse } from "@/contracts/http-responses";
import * as React from "react";
import type { Location, Region } from "@/lib/types";
import { fetchPublicAPI, fetchCurrentUser } from "@/lib/api";
import { fetchSelectableRegions } from "@/lib/regions";
import { getRegionDisplayName } from "@/components/shared/quick-city-options";
import type { RoleKey } from "./constants";

interface LocationsPagination {
  limit: number;
  total: number;
  nextCursor: string | null;
}

export interface LocationFilters {
  searchQuery: string;
  selectedTags: string[];
  selectedRegionId: string;
  activeRole: RoleKey;
}

export function readLocationFilters(params: URLSearchParams): LocationFilters {
  const role = params.get("activityType");
  return {
    searchQuery: params.get("q") ?? "",
    selectedTags: [...new Set(params.get("tags")?.split(",").filter(Boolean) ?? [])],
    selectedRegionId: params.get("regionId") ?? "",
    activeRole: role === "hiking" || role === "explore" || role === "leisure" || role === "travel" ? role : "",
  };
}

export interface LocationsListInitialData {
  locations: Location[];
  pagination: LocationsPagination;
  popularTags: { id: string; name: string }[];
  regions: Region[];
  filters?: LocationFilters;
  cursor?: string | null;
}

interface LoadParams {
  cursor?: string | null;
  targetPage?: number;
  search?: string;
  tagIds?: string[];
  regionId?: string;
  activityType?: RoleKey;
}

function requestFilters(filters: LocationFilters): LoadParams {
  return { search: filters.searchQuery, tagIds: filters.selectedTags, regionId: filters.selectedRegionId, activityType: filters.activeRole };
}

export function useLocationsList(initialData?: LocationsListInitialData) {
  const initialDataRef = React.useRef(initialData);
  const [locations, setLocations] = React.useState(initialData?.locations ?? []);
  const [isLoading, setIsLoading] = React.useState(!initialData);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hasLoadError, setHasLoadError] = React.useState(false);
  const [filters, setFilters] = React.useState<LocationFilters>(initialData?.filters ?? readLocationFilters(new URLSearchParams()));
  const filtersRef = React.useRef(filters);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<LocationsPagination>(initialData?.pagination ?? { total: 0, nextCursor: null, limit: 12 });
  const [popularTags, setPopularTags] = React.useState(initialData?.popularTags ?? []);
  const [regions, setRegions] = React.useState(initialData?.regions ?? []);
  const [showRegionDropdown, setShowRegionDropdown] = React.useState(false);
  const [userRegionId, setUserRegionId] = React.useState<string | null | undefined>(undefined);
  const hasLoadedRef = React.useRef(Boolean(initialData));
  const requestIdRef = React.useRef(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentWindowRef = React.useRef({ cursor: initialData?.cursor ?? null, page: 1 });
  const retryParamsRef = React.useRef<LoadParams>({});
  const restoreScrollRef = React.useRef<number | null>(null);
  const [ready, setReady] = React.useState(false);
  const cursorsByPageRef = React.useRef(new Map<number, string | null>([
    [1, initialData?.cursor ?? null],
    ...(initialData?.pagination.nextCursor ? [[2, initialData.pagination.nextCursor] as const] : []),
  ]));

  const saveBrowsePosition = React.useCallback(() => {
    window.history.replaceState({
      ...window.history.state,
      gomateLocations: {
        href: window.location.pathname + window.location.search,
        ...currentWindowRef.current,
        cursors: [...cursorsByPageRef.current],
        scrollY: window.scrollY,
      },
    }, "");
  }, []);

  const updateURL = React.useCallback((next: LocationFilters, cursor: string | null = null) => {
    const url = new URL(window.location.href);
    const values = { q: next.searchQuery, tags: next.selectedTags.join(","), regionId: next.selectedRegionId, activityType: next.activeRole, cursor };
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, "", url);
    saveBrowsePosition();
  }, [saveBrowsePosition]);

  // Invalidate at the user's action, including the search debounce window.
  const invalidateRequest = React.useCallback(() => {
    ++requestIdRef.current;
    abortControllerRef.current?.abort();
    clearTimeout(searchTimerRef.current);
    setHasLoadError(false);
    setIsLoading(!hasLoadedRef.current);
    setIsRefreshing(hasLoadedRef.current);
  }, []);

  const loadLocations = React.useCallback(async (params: LoadParams) => {
    invalidateRequest();
    const requestId = requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    retryParamsRef.current = params;
    try {
      const query = new URLSearchParams({ limit: "12" });
      if (params.cursor) query.set("cursor", params.cursor);
      if (params.search) query.set("search", params.search);
      if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));
      if (params.regionId) query.set("regionId", params.regionId);
      if (params.activityType) query.set("activityType", params.activityType);
      const res = await fetchPublicAPI(`/locations?${query}`, { signal: controller.signal });
      const data = await res.json<ApiResult<LocationsResponse>>();
      if (requestId !== requestIdRef.current) return;
      if (!data.success) throw new Error("locations_load_failed");
      hasLoadedRef.current = true;
      setLocations(data.locations);
      const page = params.targetPage ?? 1;
      const nextCursor = data.nextCursor ?? null;
      currentWindowRef.current = { cursor: params.cursor ?? null, page };
      setCurrentPage(page);
      setPagination({ limit: 12, total: Number(data.total ?? 0), nextCursor });
      if (nextCursor) cursorsByPageRef.current.set(page + 1, nextCursor);
      else cursorsByPageRef.current.delete(page + 1);
      updateURL(filtersRef.current, params.cursor ?? null);
    } catch {
      if (requestId === requestIdRef.current && !controller.signal.aborted) setHasLoadError(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [invalidateRequest, updateURL]);

  React.useEffect(() => {
    const restore = () => {
      const next = readLocationFilters(new URLSearchParams(window.location.search));
      const cursor = new URLSearchParams(window.location.search).get("cursor");
      const saved = window.history.state?.gomateLocations;
      const matches = saved?.href === window.location.pathname + window.location.search;
      const page = matches && Number.isInteger(saved.page) && saved.page > 0 ? saved.page : 1;
      if (matches && Array.isArray(saved.cursors)) cursorsByPageRef.current = new Map(saved.cursors);
      else cursorsByPageRef.current = new Map([
        [1, cursor],
        ...(initialDataRef.current?.pagination.nextCursor ? [[2, initialDataRef.current.pagination.nextCursor] as const] : []),
      ]);
      currentWindowRef.current = { cursor, page };
      restoreScrollRef.current = matches && Number.isFinite(saved.scrollY) ? saved.scrollY : null;
      filtersRef.current = next;
      setFilters(next);
      setCurrentPage(page);
      return { ...requestFilters(next), cursor, targetPage: page };
    };
    const params = restore();
    setReady(true);
    if (!initialDataRef.current) void loadLocations(params);
    const onPopState = () => { void loadLocations(restore()); };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pagehide", saveBrowsePosition);
    const requests = requestIdRef;
    return () => {
      ++requests.current;
      abortControllerRef.current?.abort();
      clearTimeout(searchTimerRef.current);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pagehide", saveBrowsePosition);
    };
  }, [loadLocations, saveBrowsePosition]);

  React.useEffect(() => {
    if (!ready || isLoading || isRefreshing || restoreScrollRef.current === null) return;
    const top = restoreScrollRef.current;
    let secondFrame = 0;
    const frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (top > 0) window.scrollTo({ top, behavior: "instant" });
        restoreScrollRef.current = null;
      });
    });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(secondFrame); };
  }, [ready, isLoading, isRefreshing]);

  React.useEffect(() => {
    if (initialData?.popularTags) return;
    fetchPublicAPI("/tags?limit=200").then((r) => r.json<ApiResult<TagsResponse>>()).then((data) => { if (data.success && data.tags) setPopularTags(data.tags); }).catch(() => {});
  }, [initialData?.popularTags]);

  React.useEffect(() => {
    if (initialData?.regions) return;
    fetchSelectableRegions().then(setRegions).catch(() => {});
  }, [initialData?.regions]);

  React.useEffect(() => {
    fetchCurrentUser().then((user) => setUserRegionId(user?.extra.city ?? null)).catch(() => setUserRegionId(null));
  }, []);

  const changeFilters = React.useCallback((next: LocationFilters, debounce = false) => {
    if (JSON.stringify(next) === JSON.stringify(filtersRef.current)) return;
    invalidateRequest();
    restoreScrollRef.current = null;
    filtersRef.current = next;
    setFilters(next);
    setCurrentPage(1);
    currentWindowRef.current = { cursor: null, page: 1 };
    cursorsByPageRef.current = new Map([[1, null]]);
    updateURL(next);
    const params = requestFilters(next);
    retryParamsRef.current = params;
    if (debounce) searchTimerRef.current = setTimeout(() => { void loadLocations(params); }, 300);
    else void loadLocations(params);
  }, [invalidateRequest, loadLocations, updateURL]);

  const setSearchQuery = React.useCallback((searchQuery: string) => changeFilters({ ...filtersRef.current, searchQuery }, true), [changeFilters]);
  const handleTagToggle = React.useCallback((tagId: string) => {
    const next = filtersRef.current;
    changeFilters({ ...next, selectedTags: next.selectedTags.includes(tagId) ? next.selectedTags.filter((id) => id !== tagId) : [...next.selectedTags, tagId] });
  }, [changeFilters]);
  const handleRegionSelect = React.useCallback((selectedRegionId: string) => {
    changeFilters({ ...filtersRef.current, selectedRegionId });
    setShowRegionDropdown(false);
  }, [changeFilters]);
  const handleRoleSelect = React.useCallback((role: RoleKey) => changeFilters({ ...filtersRef.current, activeRole: filtersRef.current.activeRole === role ? "" : role }), [changeFilters]);
  const handleClearFilters = React.useCallback(() => changeFilters({ ...filtersRef.current, selectedTags: [], selectedRegionId: "" }), [changeFilters]);
  const handleClearTags = React.useCallback(() => changeFilters({ ...filtersRef.current, selectedTags: [] }), [changeFilters]);
  const handleClearAll = React.useCallback(() => changeFilters(readLocationFilters(new URLSearchParams())), [changeFilters]);
  const handleRetry = React.useCallback(() => loadLocations(retryParamsRef.current), [loadLocations]);
  const handlePageChange = React.useCallback((page: number) => {
    const cursor = cursorsByPageRef.current.get(page);
    if (page < 1 || cursor === undefined) return;
    void loadLocations({ ...requestFilters(filtersRef.current), cursor, targetPage: page });
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [loadLocations]);

  const selectedRegionName = React.useMemo(() => {
    const region = regions.find((item) => item.id === filters.selectedRegionId);
    return region ? getRegionDisplayName(region) : undefined;
  }, [regions, filters.selectedRegionId]);
  const hasActiveFilters = !!(filters.searchQuery || filters.selectedTags.length || filters.selectedRegionId || filters.activeRole);

  return {
    locations, isLoading, isRefreshing, hasLoadError, ...filters, currentPage, pagination, popularTags,
    regions, showRegionDropdown, selectedRegionName, hasActiveFilters, userRegionId,
    setSearchQuery, setShowRegionDropdown, loadLocations, handleTagToggle, handleRegionSelect,
    handleRoleSelect, handlePageChange, handleClearAll, handleClearFilters, handleClearTags, handleRetry,
    onClearSearch: () => setSearchQuery(""),
    onChangeRegion: () => setShowRegionDropdown(true),
    saveBrowsePosition,
  };
}
