import * as React from "react";
import type { Location, Region } from "@/lib/types";
import { fetchPublicAPI, fetchCurrentUser } from "@/lib/api";
import { fetchSelectableRegions } from "@/lib/regions";
import type { RoleKey } from "./constants";

interface LocationsPagination {
  limit: number;
  total: number;
  nextCursor: string | null;
}

export interface LocationsListInitialData {
  locations: Location[];
  pagination: LocationsPagination;
  popularTags: { id: string; name: string }[];
  regions: Region[];
}

export function useLocationsList(initialData?: LocationsListInitialData) {
  const [locations, setLocations] = React.useState<Location[]>(initialData?.locations ?? []);
  const [isLoading, setIsLoading] = React.useState(!initialData);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<LocationsPagination>(
    initialData?.pagination ?? { total: 0, nextCursor: null, limit: 12 },
  );
  const [popularTags, setPopularTags] = React.useState<{ id: string; name: string }[]>(initialData?.popularTags ?? []);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [regions, setRegions] = React.useState<Region[]>(initialData?.regions ?? []);
  const [selectedRegionId, setSelectedRegionId] = React.useState("");
  const [activeRole, setActiveRole] = React.useState<RoleKey>("");
  const [showRegionDropdown, setShowRegionDropdown] = React.useState(false);
  const [regionDropdownPos, setRegionDropdownPos] = React.useState({ top: 0, left: 0 });
  const [userRegionId, setUserRegionId] = React.useState<string | null | undefined>(undefined);
  const hasInitialDataRef = React.useRef(Boolean(initialData));
  const skipInitialFilterFetchRef = React.useRef(true);
  const locationsRef = React.useRef(locations);
  const requestIdRef = React.useRef(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const cursorsByPageRef = React.useRef<Map<number, string | null>>(
    new Map([
      [1, null],
      ...(initialData?.pagination.nextCursor
        ? [[2, initialData.pagination.nextCursor] as const]
        : []),
    ]),
  );

  const loadLocations = React.useCallback(
    async (params: { cursor?: string | null; targetPage?: number; search?: string; tagIds?: string[]; regionId?: string; activityType?: RoleKey }) => {
      const requestId = ++requestIdRef.current;
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const hasExistingLocations = locationsRef.current.length > 0;
      setIsLoading(!hasExistingLocations);
      setIsRefreshing(hasExistingLocations);
      try {
        const query = new URLSearchParams();
        query.set("limit", "12");
        if (params.cursor) query.set("cursor", params.cursor);
        if (params.search) query.set("search", params.search);
        if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));
        if (params.regionId) query.set("regionId", params.regionId);
        if (params.activityType) query.set("activityType", params.activityType);
        const res = await fetchPublicAPI(`/locations?${query}`, { signal: controller.signal });
        const data = await res.json();
        if (requestId !== requestIdRef.current) return;
        if (data.success) {
          locationsRef.current = data.locations;
          setLocations(data.locations);
          const targetPage = params.targetPage ?? 1;
          const nextCursor = data.nextCursor ?? null;
          setCurrentPage(targetPage);
          setPagination({
            limit: 12,
            total: Number(data.total ?? 0),
            nextCursor,
          });
          if (nextCursor) {
            cursorsByPageRef.current.set(targetPage + 1, nextCursor);
          } else {
            cursorsByPageRef.current.delete(targetPage + 1);
          }
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          console.error("[locations] Failed to load locations:", error);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    []
  );

  React.useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  // URL 参数初始化
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const tags = params.get("tags")?.split(",").filter(Boolean) || [];
    const regionId = params.get("regionId") || "";
    const activityType = (params.get("activityType") || "") as RoleKey;
    setSearchQuery(q);
    setSelectedTags(tags);
    setSelectedRegionId(regionId);
    setActiveRole(activityType);
    if (hasInitialDataRef.current) {
      hasInitialDataRef.current = false;
      return;
    }
    loadLocations({ search: q, tagIds: tags, regionId, activityType });
  }, [loadLocations]);

  // 加载标签
  React.useEffect(() => {
    if (initialData?.popularTags) return;
    fetchPublicAPI("/tags?limit=200")
      .then((r) => r.json())
      .then((data) => { if (data.success && data.tags) setPopularTags(data.tags); })
      .catch(() => {});
  }, [initialData?.popularTags]);

  // Load service-enabled city-level Regions from the canonical endpoint.
  React.useEffect(() => {
    if (initialData?.regions) return;
    fetchSelectableRegions()
      .then(setRegions)
      .catch(() => {});
  }, [initialData?.regions]);

  // UserExtra.city stores the selected city-level Region id.
  React.useEffect(() => {
    fetchCurrentUser()
      .then((user) => setUserRegionId(user?.extra.city ?? null))
      .catch(() => setUserRegionId(null));
  }, []);

  // 搜索防抖
  React.useEffect(() => {
    if (skipInitialFilterFetchRef.current) {
      skipInitialFilterFetchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      cursorsByPageRef.current = new Map([[1, null]]);
      setCurrentPage(1);
      loadLocations({ search: searchQuery, tagIds: selectedTags, regionId: selectedRegionId, activityType: activeRole });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTags, selectedRegionId, activeRole, loadLocations]);

  const handleTagToggle = React.useCallback((tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newTags);
    setCurrentPage(1);
  }, [selectedTags]);

  const handleRegionSelect = React.useCallback((regionId: string) => {
    setSelectedRegionId(regionId);
    setCurrentPage(1);
    setShowRegionDropdown(false);
  }, []);

  const handleRoleSelect = React.useCallback((role: RoleKey) => {
    const newRole = role === activeRole ? "" : role;
    setActiveRole(newRole);
    setCurrentPage(1);
  }, [activeRole]);

  const handlePageChange = React.useCallback((page: number) => {
    const cursor = cursorsByPageRef.current.get(page);
    if (page < 1 || cursor === undefined) return;
    loadLocations({ cursor, targetPage: page, search: searchQuery, tagIds: selectedTags, regionId: selectedRegionId, activityType: activeRole });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchQuery, selectedTags, selectedRegionId, activeRole, loadLocations]);

  const handleClearAll = React.useCallback(() => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedRegionId("");
    setActiveRole("");
    setCurrentPage(1);
  }, []);

  const selectedRegionName = regions.find((region) => region.id === selectedRegionId)?.name;
  const hasActiveFilters = !!(searchQuery || selectedTags.length > 0 || selectedRegionId || activeRole);

  return {
    locations,
    isLoading,
    isRefreshing,
    searchQuery,
    currentPage,
    pagination,
    popularTags,
    selectedTags,
    regions,
    selectedRegionId,
    activeRole,
    showRegionDropdown,
    regionDropdownPos,
    selectedRegionName,
    hasActiveFilters,
    userRegionId,
    setSearchQuery,
    setShowRegionDropdown,
    setRegionDropdownPos,
    loadLocations,
    handleTagToggle,
    handleRegionSelect,
    handleRoleSelect,
    handlePageChange,
    handleClearAll,
    onClearSearch: () => setSearchQuery(""),
    onClearAll: handleClearAll,
    onChangeRegion: () => setShowRegionDropdown(true),
    onSetRegion: () => { window.location.href = "/profile/edit"; },
  };
}
