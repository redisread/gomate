import * as React from "react";
import type { City, Team } from "@/lib/types";
import { fetchPublicAPI } from "@/lib/api";
import { fetchAllCities } from "@/lib/cities";
import { parseTeamDifficultyFilters, parseTeamTagFilters } from "@/lib/team-filter-params";
import {
  getDateRangeByQuickType,
  getActiveDateQuickType,
} from "@/lib/date-beijing";

interface TeamsPagination {
  page?: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore?: boolean;
}

export interface TeamsInitialData {
  teams: Team[];
  pagination: TeamsPagination;
  availableTags: { id: string; name: string }[];
  availableCities: City[];
  citiesComplete?: boolean;
  filters?: {
    searchQuery: string;
    currentPage: number;
    selectedDifficulty: string[];
    selectedCityId: string;
    startDate: string;
    endDate: string;
    selectedTags: string[];
  };
}

export function useTeams(initialData?: TeamsInitialData) {
  const initialFilters = initialData?.filters;
  const hasInitialData = Boolean(initialData);
  const shouldLoadFullCities = !initialData || initialData.citiesComplete === false || initialData.availableCities.length === 0;
  const [teams, setTeams] = React.useState<Team[]>(initialData?.teams ?? []);
  const [isLoading, setIsLoading] = React.useState(!initialData);
  const [loadError, setLoadError] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState(initialFilters?.searchQuery ?? "");
  const [currentPage, setCurrentPage] = React.useState(initialFilters?.currentPage ?? 1);
  const [pagination, setPagination] = React.useState<TeamsPagination>(
    initialData?.pagination ?? { total: 0, totalPages: 0, pageSize: 12 },
  );
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string[]>(initialFilters?.selectedDifficulty ?? []);
  const [startDate, setStartDate] = React.useState(initialFilters?.startDate ?? "");
  const [endDate, setEndDate] = React.useState(initialFilters?.endDate ?? "");
  const [availableTags, setAvailableTags] = React.useState<{ id: string; name: string }[]>(initialData?.availableTags ?? []);
  const [selectedTags, setSelectedTags] = React.useState<string[]>(initialFilters?.selectedTags ?? []);
  const [availableCities, setAvailableCities] = React.useState<City[]>(initialData?.availableCities ?? []);
  const [citiesLoading, setCitiesLoading] = React.useState(shouldLoadFullCities);
  const [citiesError, setCitiesError] = React.useState(false);
  const [selectedCityId, setSelectedCityId] = React.useState(initialFilters?.selectedCityId ?? "");
  const [urlInitialized, setUrlInitialized] = React.useState(hasInitialData);
  const skipInitialFilterFetchRef = React.useRef(hasInitialData);
  const latestRequestIdRef = React.useRef(0);
  const requestAbortRef = React.useRef<AbortController | null>(null);
  const citiesAbortRef = React.useRef<AbortController | null>(null);
  const filterRequestTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTeams = React.useCallback(
    async (params: { page?: number; search?: string; difficulty?: string[]; cityId?: string; startDateFrom?: string; startDateTo?: string; tagIds?: string[] }) => {
      const requestId = ++latestRequestIdRef.current;
      requestAbortRef.current?.abort();
      const controller = new AbortController();
      requestAbortRef.current = controller;
      setIsLoading(true);
      setLoadError(false);
      try {
        const query = new URLSearchParams();
        query.set("status", "recruiting");
        if (params.page) query.set("page", params.page.toString());
        query.set("pageSize", "12");
        if (params.search) query.set("search", params.search);
        if (params.difficulty?.length) query.set("difficulty", params.difficulty.join(","));
        if (params.cityId) query.set("cityId", params.cityId);
        if (params.startDateFrom) query.set("startDateFrom", params.startDateFrom);
        if (params.startDateTo) query.set("startDateTo", params.startDateTo);
        if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));

        const res = await fetchPublicAPI(`/teams?${query}`, { signal: controller.signal });
        const data = await res.json();
        if (data.success && requestId === latestRequestIdRef.current) {
          setTeams(data.teams || []);
          setPagination(data.pagination || { total: 0, totalPages: 0, pageSize: 12 });
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
    const page = Math.min(1000, Math.max(1, parseInt(params.get("page") || "1", 10) || 1));
    const difficulty = parseTeamDifficultyFilters(params.get("difficulty"));
    const cityId = (params.get("cityId") || "").slice(0, 64);
    const timeFilter = params.get("timeFilter") || "";
    const tags = parseTeamTagFilters(params.get("tags"));

    setSearchQuery(q);
    setCurrentPage(page);
    setSelectedDifficulty(difficulty);
    setSelectedCityId(cityId);
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
    citiesAbortRef.current?.abort();
    if (filterRequestTimerRef.current) clearTimeout(filterRequestTimerRef.current);
  }, []);

  // 加载可用标签
  React.useEffect(() => {
    if (initialData?.availableTags) return;
    fetchPublicAPI("/tags?type=activity")
      .then((r) => r.json())
      .then((data) => { if (data.success && data.tags) setAvailableTags(data.tags); })
      .catch(() => {});
  }, [initialData?.availableTags]);

  const loadAllCities = React.useCallback(async () => {
    citiesAbortRef.current?.abort();
    const controller = new AbortController();
    citiesAbortRef.current = controller;
    setCitiesLoading(true);
    setCitiesError(false);
    try {
      const cities = await fetchAllCities({ signal: controller.signal });
      if (!controller.signal.aborted) setAvailableCities(cities);
    } catch {
      if (!controller.signal.aborted) setCitiesError(true);
    } finally {
      if (!controller.signal.aborted) setCitiesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!shouldLoadFullCities) return;
    loadAllCities();
    return () => citiesAbortRef.current?.abort();
  }, [shouldLoadFullCities, loadAllCities]);

  const updateURL = React.useCallback((page: number) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (page > 1) params.set("page", page.toString());
    if (selectedDifficulty.length) params.set("difficulty", selectedDifficulty.join(","));
    if (selectedCityId) params.set("cityId", selectedCityId);
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
  }, [searchQuery, selectedDifficulty, selectedCityId, startDate, endDate, selectedTags]);

  // 搜索防抖
  React.useEffect(() => {
    if (!urlInitialized) return;
    if (skipInitialFilterFetchRef.current) {
      skipInitialFilterFetchRef.current = false;
      return;
    }
    setCurrentPage(1);
    setIsLoading(true);
    filterRequestTimerRef.current = setTimeout(() => {
      loadTeams({ page: 1, search: searchQuery, difficulty: selectedDifficulty, cityId: selectedCityId, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
      updateURL(1);
    }, 300);
    return () => {
      if (filterRequestTimerRef.current) clearTimeout(filterRequestTimerRef.current);
      filterRequestTimerRef.current = null;
    };
  }, [urlInitialized, searchQuery, selectedDifficulty, selectedCityId, startDate, endDate, selectedTags, loadTeams, updateURL]);



  const handleDifficultyToggle = React.useCallback((id: string) => {
    const next = selectedDifficulty.includes(id) ? selectedDifficulty.filter((d) => d !== id) : [...selectedDifficulty, id];
    setSelectedDifficulty(next);
  }, [selectedDifficulty]);

  const handleTagToggle = React.useCallback((tagId: string) => {
    const next = selectedTags.includes(tagId) ? selectedTags.filter((t) => t !== tagId) : [...selectedTags, tagId];
    setSelectedTags(next);
  }, [selectedTags]);

  const handleCitySelect = React.useCallback((cityId: string) => {
    setSelectedCityId(cityId);
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
    setCurrentPage(page);
    loadTeams({ page, search: searchQuery, difficulty: selectedDifficulty, cityId: selectedCityId, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
    updateURL(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchQuery, selectedDifficulty, selectedCityId, startDate, endDate, selectedTags, loadTeams, updateURL]);

  const retryCurrentPage = React.useCallback(() => {
    loadTeams({ page: currentPage, search: searchQuery, difficulty: selectedDifficulty, cityId: selectedCityId, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
  }, [currentPage, searchQuery, selectedDifficulty, selectedCityId, startDate, endDate, selectedTags, loadTeams]);

  const clearFilters = React.useCallback(() => {
    setSelectedDifficulty([]);
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedTags([]);
    setSelectedCityId("");
    setShowFilters(false);
  }, []);

  const clearAdvancedFilters = React.useCallback(() => {
    setSelectedDifficulty([]);
    setSelectedTags([]);
  }, []);

  const activeFiltersCount = selectedDifficulty.length + (selectedCityId ? 1 : 0) + (startDate || endDate ? 1 : 0) + selectedTags.length;
  const advancedFiltersCount = selectedDifficulty.length + selectedTags.length;
  const hasDateFilter = Boolean(startDate || endDate);

  const activeDateQuickType = React.useMemo(
    () => getActiveDateQuickType(startDate, endDate),
    [startDate, endDate]
  );

  const selectedCityName = React.useMemo(
    () => availableCities.find((city) => city.id === selectedCityId)?.name,
    [availableCities, selectedCityId],
  );

  return {
    teams,
    isLoading,
    loadError,
    searchQuery,
    currentPage,
    pagination,
    showFilters,
    selectedDifficulty,
    startDate,
    endDate,
    availableTags,
    availableCities,
    citiesLoading,
    citiesError,
    selectedCityId,
    selectedCityName,
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
    handleDifficultyToggle,
    handleTagToggle,
    handleCitySelect,
    handleDateQuickSelect,
    handlePageChange,
    retryCurrentPage,
    retryCities: loadAllCities,
    clearAdvancedFilters,
    clearFilters,
  };
}
