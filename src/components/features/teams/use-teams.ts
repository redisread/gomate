import type { ApiResult, TagsResponse } from "@/contracts/http-responses";
import type { TeamListResponse } from "@/contracts/team-api";
import * as React from "react";
import { ACTIVITY_TYPES } from "@/contracts";
import type { ActivityType, RecruitmentStatus, Region, Team } from "@/lib/types";
import { fetchPublicAPI } from "@/lib/api";
import { fetchSelectableRegions } from "@/lib/regions";
import { getRegionDisplayName } from "@/components/shared/quick-city-options";
import { parseTeamFilters, buildTeamListQuery, type TeamFilters } from "@/lib/team-filter-params";
import {
  getDateRangeByQuickType,
  getActiveDateQuickType,
} from "@/lib/date-beijing";

interface TeamsPagination {
  limit: number;
  total: number;
  nextCursor: string | null;
}

export interface TeamsInitialData {
  teams: Team[];
  pagination: TeamsPagination;
  availableTags: { id: string; name: string }[];
  tagsComplete?: boolean;
  availableRegions: Region[];
  regionsComplete?: boolean;
  filters?: TeamFilters;
  cursor?: string | null;
}

export function useTeams(initialData?: TeamsInitialData) {
  const initialFilters = initialData?.filters;
  const hasInitialData = Boolean(initialData);
  const shouldLoadTags = !initialData || initialData.tagsComplete === false;
  const shouldLoadFullRegions = !initialData || initialData.regionsComplete === false || initialData.availableRegions.length === 0;
  const [teams, setTeams] = React.useState<Team[]>(initialData?.teams ?? []);
  const [isLoading, setIsLoading] = React.useState(!initialData);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const hasLoadedRef = React.useRef(Boolean(initialData));
  const currentWindowRef = React.useRef({ cursor: initialData?.cursor ?? null, page: 1 });
  const restoreScrollRef = React.useRef<number | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState(initialFilters?.searchQuery ?? "");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState<TeamsPagination>(
    initialData?.pagination ?? { total: 0, nextCursor: null, limit: 12 },
  );
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedActivityType, setSelectedActivityType] = React.useState<ActivityType | "">(initialFilters?.selectedActivityType ?? "");
  const [selectedRecruitmentStatus, setSelectedRecruitmentStatus] = React.useState<RecruitmentStatus | "">(initialFilters?.selectedRecruitmentStatus ?? "open");
  const [startDate, setStartDate] = React.useState(initialFilters?.startDate ?? "");
  const [endDate, setEndDate] = React.useState(initialFilters?.endDate ?? "");
  const [availableTags, setAvailableTags] = React.useState<{ id: string; name: string }[]>(initialData?.availableTags ?? []);
  const [selectedTags, setSelectedTags] = React.useState<string[]>(initialFilters?.selectedTags ?? []);
  const [availableRegions, setAvailableRegions] = React.useState<Region[]>(initialData?.availableRegions ?? []);
  const [regionsLoading, setRegionsLoading] = React.useState(shouldLoadFullRegions);
  const [tagsLoading, setTagsLoading] = React.useState(shouldLoadTags);
  const [tagsError, setTagsError] = React.useState(false);
  const tagsAbortRef = React.useRef<AbortController | null>(null);
  const [regionsError, setRegionsError] = React.useState(false);
  const [selectedRegionId, setSelectedRegionId] = React.useState(initialFilters?.selectedRegionId ?? "");
  const [urlInitialized, setUrlInitialized] = React.useState(hasInitialData);
  const skipInitialFilterFetchRef = React.useRef(hasInitialData);
  const firstClientLoadRef = React.useRef(!hasInitialData);
  const latestRequestIdRef = React.useRef(0);
  const requestAbortRef = React.useRef<AbortController | null>(null);
  const regionsAbortRef = React.useRef<AbortController | null>(null);
  const filterRequestTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorsByPageRef = React.useRef<Map<number, string | null>>(
    new Map([
      [1, initialData?.cursor ?? null],
      ...(initialData?.pagination.nextCursor
        ? [[2, initialData.pagination.nextCursor] as const]
        : []),
    ]),
  );

  const saveBrowsePosition = React.useCallback(() => {
    window.history.replaceState({ ...window.history.state, gomateTeams: {
      href: window.location.pathname + window.location.search,
      ...currentWindowRef.current,
      cursors: [...cursorsByPageRef.current], scrollY: window.scrollY,
    } }, "");
  }, []);

  const invalidateRequest = React.useCallback(() => {
    ++latestRequestIdRef.current;
    requestAbortRef.current?.abort();
    if (filterRequestTimerRef.current) clearTimeout(filterRequestTimerRef.current);
    setLoadError(false);
    setIsLoading(!hasLoadedRef.current);
    setIsRefreshing(hasLoadedRef.current);
    restoreScrollRef.current = null;
  }, []);

  React.useEffect(() => {
    const saved = window.history.state?.gomateTeams;
    if (saved?.href === window.location.pathname + window.location.search && Number.isInteger(saved.page) && saved.page > 0) {
      currentWindowRef.current = { cursor: saved.cursor ?? null, page: saved.page };
      setCurrentPage(saved.page);
      if (Array.isArray(saved.cursors)) cursorsByPageRef.current = new Map(saved.cursors);
      if (Number.isFinite(saved.scrollY)) restoreScrollRef.current = saved.scrollY;
    }
    window.addEventListener("pagehide", saveBrowsePosition);
    return () => window.removeEventListener("pagehide", saveBrowsePosition);
  }, [saveBrowsePosition]);

  React.useEffect(() => {
    if (isLoading || isRefreshing || restoreScrollRef.current === null) return;
    const top = restoreScrollRef.current;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: "instant" });
      restoreScrollRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [isLoading, isRefreshing]);

  const loadTeams = React.useCallback(
    async (params: { cursor?: string | null; targetPage?: number; search?: string; activityType?: ActivityType | ""; recruitmentStatus?: RecruitmentStatus | ""; regionId?: string; startDateFrom?: string; startDateTo?: string; tagIds?: string[] }) => {
      const requestId = ++latestRequestIdRef.current;
      requestAbortRef.current?.abort();
      const controller = new AbortController();
      requestAbortRef.current = controller;
      setIsLoading(!hasLoadedRef.current);
      setIsRefreshing(hasLoadedRef.current);
      setLoadError(false);
      try {
        const query = buildTeamListQuery({
          searchQuery: params.search ?? "",
          selectedActivityType: params.activityType ?? "",
          selectedRecruitmentStatus: params.recruitmentStatus ?? "",
          selectedRegionId: params.regionId ?? "",
          startDate: params.startDateFrom ?? "",
          endDate: params.startDateTo ?? "",
          selectedTags: params.tagIds ?? [],
        }, params.cursor);

        const res = await fetchPublicAPI(`/teams?${query}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        const data = await res.json<ApiResult<TeamListResponse>>();
        if (data.success && requestId === latestRequestIdRef.current) {
          hasLoadedRef.current = true;
          setTeams(data.teams || []);
          const targetPage = params.targetPage ?? 1;
          const nextCursor = data.nextCursor ?? null;
          currentWindowRef.current = { cursor: params.cursor ?? null, page: targetPage };
          const url = new URL(window.location.href);
          if (params.cursor) url.searchParams.set("cursor", params.cursor);
          else url.searchParams.delete("cursor");
          window.history.replaceState(window.history.state, "", url);
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
        } else if (requestId === latestRequestIdRef.current) {
          setLoadError(true);
        }
      } catch {
        if (!controller.signal.aborted && requestId === latestRequestIdRef.current) setLoadError(true);
      } finally {
        if (requestId === latestRequestIdRef.current) { setIsLoading(false); setIsRefreshing(false); saveBrowsePosition(); }
      }
    },
    [saveBrowsePosition]
  );

  // URL 参数初始化
  React.useEffect(() => {
    if (hasInitialData) return;
    const filters = parseTeamFilters(new URLSearchParams(window.location.search));
    setSearchQuery(filters.searchQuery);
    setSelectedActivityType(filters.selectedActivityType);
    setSelectedRecruitmentStatus(filters.selectedRecruitmentStatus);
    setSelectedRegionId(filters.selectedRegionId);
    setSelectedTags(filters.selectedTags);
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
    setUrlInitialized(true);
  }, [hasInitialData]);

  React.useEffect(() => () => {
    requestAbortRef.current?.abort();
    regionsAbortRef.current?.abort();
    if (filterRequestTimerRef.current) clearTimeout(filterRequestTimerRef.current);
  }, []);

  const loadTags = React.useCallback(async () => {
    tagsAbortRef.current?.abort();
    const controller = new AbortController();
    tagsAbortRef.current = controller;
    setTagsLoading(true);
    setTagsError(false);
    try {
      const response = await fetchPublicAPI("/tags?limit=200", { signal: controller.signal });
      const data = await response.json<ApiResult<TagsResponse>>();
      if (!data.success || !data.tags) throw new Error("Tag request failed");
      if (!controller.signal.aborted) setAvailableTags(data.tags);
    } catch {
      if (!controller.signal.aborted) setTagsError(true);
    } finally {
      if (!controller.signal.aborted) setTagsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (shouldLoadTags) void loadTags();
    return () => tagsAbortRef.current?.abort();
  }, [shouldLoadTags, loadTags]);

  const loadAllRegions = React.useCallback(async () => {
    regionsAbortRef.current?.abort();
    const controller = new AbortController();
    regionsAbortRef.current = controller;
    setRegionsLoading(true);
    setRegionsError(false);
    try {
      const regions = await fetchSelectableRegions({ signal: controller.signal });
      if (!controller.signal.aborted) setAvailableRegions(regions);
    } catch {
      if (!controller.signal.aborted) setRegionsError(true);
    } finally {
      if (!controller.signal.aborted) setRegionsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!shouldLoadFullRegions) return;
    loadAllRegions();
    return () => regionsAbortRef.current?.abort();
  }, [shouldLoadFullRegions, loadAllRegions]);

  const updateURL = React.useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedActivityType) params.set("activityType", selectedActivityType);
    if (selectedRecruitmentStatus === "") params.set("recruitmentStatus", "all");
    else if (selectedRecruitmentStatus !== "open") params.set("recruitmentStatus", selectedRecruitmentStatus);
    if (selectedRegionId) params.set("regionId", selectedRegionId);
    if (selectedTags.length) params.set("tags", selectedTags.join(","));

    // 时间筛选参数：优先使用 timeFilter 快捷选项
    const timeFilter = getActiveDateQuickType(startDate, endDate);
    if (timeFilter) {
      params.set("timeFilter", timeFilter);
    } else if (startDate || endDate) {
      // 自定义日期范围
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
    }

    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(window.history.state, "", newUrl);
  }, [searchQuery, selectedActivityType, selectedRecruitmentStatus, selectedRegionId, startDate, endDate, selectedTags]);

  // 搜索防抖
  React.useEffect(() => {
    if (!urlInitialized) return;
    if (skipInitialFilterFetchRef.current) {
      skipInitialFilterFetchRef.current = false;
      return;
    }
    const firstClientLoad = firstClientLoadRef.current;
    firstClientLoadRef.current = false;
    const cursor = firstClientLoad ? new URLSearchParams(window.location.search).get("cursor") : null;
    const targetPage = firstClientLoad ? currentWindowRef.current.page : 1;
    const restoredScroll = restoreScrollRef.current;
    if (!firstClientLoad) {
      setCurrentPage(1);
      currentWindowRef.current = { cursor: null, page: 1 };
      cursorsByPageRef.current = new Map([[1, null]]);
    } else {
      cursorsByPageRef.current.set(targetPage, cursor);
    }
    invalidateRequest();
    if (firstClientLoad) restoreScrollRef.current = restoredScroll;
    filterRequestTimerRef.current = setTimeout(() => {
      loadTeams({ cursor, targetPage, search: searchQuery, activityType: selectedActivityType, recruitmentStatus: selectedRecruitmentStatus, regionId: selectedRegionId, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
      if (!firstClientLoad) updateURL();
    }, 300);
    return () => {
      if (filterRequestTimerRef.current) clearTimeout(filterRequestTimerRef.current);
      filterRequestTimerRef.current = null;
    };
  }, [urlInitialized, searchQuery, selectedActivityType, selectedRecruitmentStatus, selectedRegionId, startDate, endDate, selectedTags, loadTeams, updateURL, invalidateRequest]);



  const handleActivityTypeSelect = React.useCallback((activityType: ActivityType | "") => {
    if (activityType === selectedActivityType) return;
    invalidateRequest();
    setSelectedActivityType(activityType);
  }, [invalidateRequest, selectedActivityType]);

  const handleRecruitmentStatusSelect = React.useCallback((status: RecruitmentStatus | "") => {
    if (status === selectedRecruitmentStatus) return;
    invalidateRequest();
    setSelectedRecruitmentStatus(status);
  }, [invalidateRequest, selectedRecruitmentStatus]);

  const handleTagToggle = React.useCallback((tagId: string) => {
    invalidateRequest();
    const next = selectedTags.includes(tagId) ? selectedTags.filter((t) => t !== tagId) : [...selectedTags, tagId];
    setSelectedTags(next);
  }, [selectedTags, invalidateRequest]);

  const handleRegionSelect = React.useCallback((regionId: string) => {
    if (regionId === selectedRegionId) return;
    invalidateRequest();
    setSelectedRegionId(regionId);
  }, [invalidateRequest, selectedRegionId]);

  const handleSearchChange = React.useCallback((query: string) => {
    if (query === searchQuery) return;
    invalidateRequest();
    setSearchQuery(query);
  }, [invalidateRequest, searchQuery]);

  const handleDateQuickSelect = React.useCallback((type: string) => {
    if ((type === "clear" && !startDate && !endDate) || type === getActiveDateQuickType(startDate, endDate)) return;
    invalidateRequest();
    if (type === "clear") {
      setStartDate("");
      setEndDate("");
    } else {
      const range = getDateRangeByQuickType(type);
      if (range) {
        setStartDate(range.start);
        setEndDate(range.end);
      }
    }
  }, [invalidateRequest, startDate, endDate]);

  const handlePageChange = React.useCallback((page: number) => {
    if (filterRequestTimerRef.current) {
      clearTimeout(filterRequestTimerRef.current);
      filterRequestTimerRef.current = null;
    }
    const cursor = cursorsByPageRef.current.get(page);
    if (page < 1 || cursor === undefined) return;
    loadTeams({ cursor, targetPage: page, search: searchQuery, activityType: selectedActivityType, recruitmentStatus: selectedRecruitmentStatus, regionId: selectedRegionId, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [searchQuery, selectedActivityType, selectedRecruitmentStatus, selectedRegionId, startDate, endDate, selectedTags, loadTeams]);

  const retryCurrentPage = React.useCallback(() => {
    const cursor = cursorsByPageRef.current.get(currentPage);
    if (cursor === undefined) return;
    loadTeams({ cursor, targetPage: currentPage, search: searchQuery, activityType: selectedActivityType, recruitmentStatus: selectedRecruitmentStatus, regionId: selectedRegionId, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
  }, [currentPage, searchQuery, selectedActivityType, selectedRecruitmentStatus, selectedRegionId, startDate, endDate, selectedTags, loadTeams]);

  const clearFilters = React.useCallback(() => {
    invalidateRequest();
    setSelectedActivityType("");
    setSelectedRecruitmentStatus("open");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedTags([]);
    setSelectedRegionId("");
    setShowFilters(false);
  }, [invalidateRequest]);

  const clearAdvancedFilters = React.useCallback(() => {
    invalidateRequest();
    setSelectedActivityType("");
    setSelectedRecruitmentStatus("open");
    setSelectedTags([]);
  }, [invalidateRequest]);

  const activeFiltersCount = (selectedActivityType ? 1 : 0) + (selectedRecruitmentStatus && selectedRecruitmentStatus !== "open" ? 1 : 0) + (selectedRegionId ? 1 : 0) + (startDate || endDate ? 1 : 0) + selectedTags.length;
  const advancedFiltersCount = (selectedActivityType ? 1 : 0) + (selectedRecruitmentStatus && selectedRecruitmentStatus !== "open" ? 1 : 0) + selectedTags.length;
  const hasDateFilter = Boolean(startDate || endDate);

  const activeDateQuickType = React.useMemo(
    () => getActiveDateQuickType(startDate, endDate),
    [startDate, endDate]
  );

  const selectedRegionName = React.useMemo(
    () => {
      const selectedRegion = availableRegions.find((region) => region.id === selectedRegionId);
      return selectedRegion ? getRegionDisplayName(selectedRegion) : undefined;
    },
    [availableRegions, selectedRegionId],
  );

  return {
    teams,
    isLoading,
    isRefreshing,
    saveBrowsePosition,
    loadError,
    searchQuery,
    currentPage,
    pagination,
    showFilters,
    selectedActivityType,
    selectedRecruitmentStatus,
    startDate,
    endDate,
    availableTags,
    tagsLoading,
    tagsError,
    retryTags: loadTags,
    availableActivityTypes: ACTIVITY_TYPES,
    availableRegions,
    regionsLoading,
    regionsError,
    selectedRegionId,
    selectedRegionName,
    selectedTags,
    activeFiltersCount,
    advancedFiltersCount,
    activeDateQuickType,
    hasDateFilter,
    setSearchQuery: handleSearchChange,
    handleSearchChange,
    setShowFilters,
    setStartDate: (value: string) => { if (value !== startDate) { invalidateRequest(); setStartDate(value); } },
    setEndDate: (value: string) => { if (value !== endDate) { invalidateRequest(); setEndDate(value); } },
    loadTeams,
    handleActivityTypeSelect,
    handleRecruitmentStatusSelect,
    handleTagToggle,
    handleRegionSelect,
    handleDateQuickSelect,
    handlePageChange,
    retryCurrentPage,
    retryRegions: loadAllRegions,
    clearAdvancedFilters,
    clearFilters,
  };
}
