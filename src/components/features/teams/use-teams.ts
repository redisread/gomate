import * as React from "react";
import type { ActivityType, ActivityTypeInfo, RecruitmentStatus, Region, Team } from "@/lib/types";
import { fetchPublicAPI } from "@/lib/api";
import { fetchSelectableRegions } from "@/lib/regions";
import { parseTeamTagFilters } from "@/lib/team-filter-params";
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
  availableActivityTypes?: ActivityTypeInfo[];
  activityTypesComplete?: boolean;
  availableRegions: Region[];
  regionsComplete?: boolean;
  filters?: {
    searchQuery: string;
    selectedActivityType: ActivityType | "";
    selectedRecruitmentStatus: RecruitmentStatus | "";
    selectedRegionId: string;
    startDate: string;
    endDate: string;
    selectedTags: string[];
  };
}

export function useTeams(initialData?: TeamsInitialData) {
  const initialFilters = initialData?.filters;
  const hasInitialData = Boolean(initialData);
  const shouldLoadTags = !initialData || initialData.tagsComplete === false;
  const shouldLoadActivityTypes = !initialData ||
    initialData.activityTypesComplete === false ||
    initialData.availableActivityTypes === undefined;
  const shouldLoadFullRegions = !initialData || initialData.regionsComplete === false || initialData.availableRegions.length === 0;
  const [teams, setTeams] = React.useState<Team[]>(initialData?.teams ?? []);
  const [isLoading, setIsLoading] = React.useState(!initialData);
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
  const [availableActivityTypes, setAvailableActivityTypes] = React.useState<ActivityTypeInfo[]>(initialData?.availableActivityTypes ?? []);
  const [selectedTags, setSelectedTags] = React.useState<string[]>(initialFilters?.selectedTags ?? []);
  const [availableRegions, setAvailableRegions] = React.useState<Region[]>(initialData?.availableRegions ?? []);
  const [regionsLoading, setRegionsLoading] = React.useState(shouldLoadFullRegions);
  const [regionsError, setRegionsError] = React.useState(false);
  const [selectedRegionId, setSelectedRegionId] = React.useState(initialFilters?.selectedRegionId ?? "");
  const [urlInitialized, setUrlInitialized] = React.useState(hasInitialData);
  const skipInitialFilterFetchRef = React.useRef(hasInitialData);
  const latestRequestIdRef = React.useRef(0);
  const requestAbortRef = React.useRef<AbortController | null>(null);
  const regionsAbortRef = React.useRef<AbortController | null>(null);
  const filterRequestTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorsByPageRef = React.useRef<Map<number, string | null>>(
    new Map([
      [1, null],
      ...(initialData?.pagination.nextCursor
        ? [[2, initialData.pagination.nextCursor] as const]
        : []),
    ]),
  );

  const loadTeams = React.useCallback(
    async (params: { cursor?: string | null; targetPage?: number; search?: string; activityType?: ActivityType | ""; recruitmentStatus?: RecruitmentStatus | ""; regionId?: string; startDateFrom?: string; startDateTo?: string; tagIds?: string[] }) => {
      const requestId = ++latestRequestIdRef.current;
      requestAbortRef.current?.abort();
      const controller = new AbortController();
      requestAbortRef.current = controller;
      setIsLoading(true);
      setLoadError(false);
      try {
        const query = new URLSearchParams();
        query.set("limit", "12");
        if (params.cursor) query.set("cursor", params.cursor);
        if (params.search) query.set("search", params.search);
        if (params.activityType) query.set("activityType", params.activityType);
        if (params.recruitmentStatus) query.set("recruitmentStatus", params.recruitmentStatus);
        if (params.regionId) query.set("regionId", params.regionId);
        if (params.startDateFrom) query.set("startDateFrom", params.startDateFrom);
        if (params.startDateTo) query.set("startDateTo", params.startDateTo);
        if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));

        const res = await fetchPublicAPI(`/teams?${query}`, { signal: controller.signal });
        const data = await res.json();
        if (data.success && requestId === latestRequestIdRef.current) {
          setTeams(data.teams || []);
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
        } else if (requestId === latestRequestIdRef.current) {
          setLoadError(true);
        }
      } catch {
        if (!controller.signal.aborted && requestId === latestRequestIdRef.current) setLoadError(true);
      } finally {
        if (requestId === latestRequestIdRef.current) setIsLoading(false);
      }
    },
    []
  );

  // URL 参数初始化
  React.useEffect(() => {
    if (hasInitialData) return;
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("q") || "").slice(0, 120);
    const activityTypeParam = params.get("activityType");
    const activityType = activityTypeParam && activityTypeParam.length <= 128
      ? activityTypeParam as ActivityType
      : "";
    const recruitmentStatusParam = params.get("recruitmentStatus");
    const recruitmentStatus = recruitmentStatusParam === "all"
      ? ""
      : recruitmentStatusParam === "closed"
        ? "closed"
        : "open";
    const regionId = (params.get("regionId") || "").slice(0, 64);
    const timeFilter = params.get("timeFilter") || "";
    const tags = parseTeamTagFilters(params.get("tags"));

    setSearchQuery(q);
    setCurrentPage(1);
    setSelectedActivityType(activityType);
    setSelectedRecruitmentStatus(recruitmentStatus);
    setSelectedRegionId(regionId);
    setSelectedTags(tags);

    // 处理时间筛选：优先使用 timeFilter，回退到 startDate/endDate
    let start = "";
    let end = "";
    if (timeFilter) {
      const range = getDateRangeByQuickType(timeFilter);
      if (range) {
        start = range.start;
        end = range.end;
      }
    }
    if (!start && !end) {
      start = params.get("startDate") || "";
      end = params.get("endDate") || "";
    }
    setStartDate(start);
    setEndDate(end);
    setUrlInitialized(true);
  }, [hasInitialData]);

  React.useEffect(() => () => {
    requestAbortRef.current?.abort();
    regionsAbortRef.current?.abort();
    if (filterRequestTimerRef.current) clearTimeout(filterRequestTimerRef.current);
  }, []);

  // 加载可用标签
  React.useEffect(() => {
    if (!shouldLoadTags) return;
    fetchPublicAPI("/tags?limit=200")
      .then((r) => r.json())
      .then((data) => { if (data.success && data.tags) setAvailableTags(data.tags); })
      .catch(() => {});
  }, [shouldLoadTags]);

  React.useEffect(() => {
    if (!shouldLoadActivityTypes) return;
    fetchPublicAPI("/activity-types")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.activityTypes) {
          setAvailableActivityTypes(data.activityTypes);
        }
      })
      .catch(() => {});
  }, [shouldLoadActivityTypes]);

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
    window.history.replaceState({}, "", newUrl);
  }, [searchQuery, selectedActivityType, selectedRecruitmentStatus, selectedRegionId, startDate, endDate, selectedTags]);

  // 搜索防抖
  React.useEffect(() => {
    if (!urlInitialized) return;
    if (skipInitialFilterFetchRef.current) {
      skipInitialFilterFetchRef.current = false;
      return;
    }
    setCurrentPage(1);
    cursorsByPageRef.current = new Map([[1, null]]);
    setIsLoading(true);
    filterRequestTimerRef.current = setTimeout(() => {
      loadTeams({ search: searchQuery, activityType: selectedActivityType, recruitmentStatus: selectedRecruitmentStatus, regionId: selectedRegionId, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
      updateURL();
    }, 300);
    return () => {
      if (filterRequestTimerRef.current) clearTimeout(filterRequestTimerRef.current);
      filterRequestTimerRef.current = null;
    };
  }, [urlInitialized, searchQuery, selectedActivityType, selectedRecruitmentStatus, selectedRegionId, startDate, endDate, selectedTags, loadTeams, updateURL]);



  const handleActivityTypeSelect = React.useCallback((activityType: ActivityType | "") => {
    setSelectedActivityType(activityType);
  }, []);

  const handleRecruitmentStatusSelect = React.useCallback((status: RecruitmentStatus | "") => {
    setSelectedRecruitmentStatus(status);
  }, []);

  const handleTagToggle = React.useCallback((tagId: string) => {
    const next = selectedTags.includes(tagId) ? selectedTags.filter((t) => t !== tagId) : [...selectedTags, tagId];
    setSelectedTags(next);
  }, [selectedTags]);

  const handleRegionSelect = React.useCallback((regionId: string) => {
    setSelectedRegionId(regionId);
  }, []);

  const handleSearchChange = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleDateQuickSelect = React.useCallback((type: string) => {
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
  }, []);

  const handlePageChange = React.useCallback((page: number) => {
    if (filterRequestTimerRef.current) {
      clearTimeout(filterRequestTimerRef.current);
      filterRequestTimerRef.current = null;
    }
    const cursor = cursorsByPageRef.current.get(page);
    if (page < 1 || cursor === undefined) return;
    loadTeams({ cursor, targetPage: page, search: searchQuery, activityType: selectedActivityType, recruitmentStatus: selectedRecruitmentStatus, regionId: selectedRegionId, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchQuery, selectedActivityType, selectedRecruitmentStatus, selectedRegionId, startDate, endDate, selectedTags, loadTeams]);

  const retryCurrentPage = React.useCallback(() => {
    const cursor = cursorsByPageRef.current.get(currentPage);
    if (cursor === undefined) return;
    loadTeams({ cursor, targetPage: currentPage, search: searchQuery, activityType: selectedActivityType, recruitmentStatus: selectedRecruitmentStatus, regionId: selectedRegionId, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
  }, [currentPage, searchQuery, selectedActivityType, selectedRecruitmentStatus, selectedRegionId, startDate, endDate, selectedTags, loadTeams]);

  const clearFilters = React.useCallback(() => {
    setSelectedActivityType("");
    setSelectedRecruitmentStatus("open");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedTags([]);
    setSelectedRegionId("");
    setShowFilters(false);
  }, []);

  const clearAdvancedFilters = React.useCallback(() => {
    setSelectedActivityType("");
    setSelectedRecruitmentStatus("open");
    setSelectedTags([]);
  }, []);

  const activeFiltersCount = (selectedActivityType ? 1 : 0) + (selectedRecruitmentStatus && selectedRecruitmentStatus !== "open" ? 1 : 0) + (selectedRegionId ? 1 : 0) + (startDate || endDate ? 1 : 0) + selectedTags.length;
  const advancedFiltersCount = (selectedActivityType ? 1 : 0) + (selectedRecruitmentStatus && selectedRecruitmentStatus !== "open" ? 1 : 0) + selectedTags.length;
  const hasDateFilter = Boolean(startDate || endDate);

  const activeDateQuickType = React.useMemo(
    () => getActiveDateQuickType(startDate, endDate),
    [startDate, endDate]
  );

  const selectedRegionName = React.useMemo(
    () => availableRegions.find((region) => region.id === selectedRegionId)?.name,
    [availableRegions, selectedRegionId],
  );

  return {
    teams,
    isLoading,
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
    availableActivityTypes,
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
    setSearchQuery,
    handleSearchChange,
    setShowFilters,
    setStartDate,
    setEndDate,
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
