import * as React from "react";
import type { Team } from "@/lib/types";
import { fetchAPI } from "@/lib/api";
import {
  getDateRangeByQuickType,
  getActiveDateQuickType,
} from "@/lib/date-beijing";

export function useTeams() {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({ total: 0, totalPages: 0, pageSize: 12 });
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string[]>([]);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [availableTags, setAvailableTags] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  const loadTeams = React.useCallback(
    async (params: { page?: number; search?: string; difficulty?: string[]; startDateFrom?: string; startDateTo?: string; tagIds?: string[] }) => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams();
        query.set("status", "recruiting");
        if (params.page) query.set("page", params.page.toString());
        query.set("pageSize", "12");
        if (params.search) query.set("search", params.search);
        if (params.difficulty?.length) query.set("difficulty", params.difficulty.join(","));
        if (params.startDateFrom) query.set("startDateFrom", params.startDateFrom);
        if (params.startDateTo) query.set("startDateTo", params.startDateTo);
        if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));

        const res = await fetchAPI(`/teams?${query}`);
        const data = await res.json();
        if (data.success) {
          setTeams(data.teams || []);
          setPagination(data.pagination || { total: 0, totalPages: 0, pageSize: 12 });
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // URL 参数初始化
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const page = parseInt(params.get("page") || "1", 10);
    const difficulty = params.get("difficulty")?.split(",").filter(Boolean) || [];
    const timeFilter = params.get("timeFilter") || "";
    const tags = params.get("tags")?.split(",").filter(Boolean) || [];

    setSearchQuery(q);
    setCurrentPage(page);
    setSelectedDifficulty(difficulty);
    setSelectedTags(tags);

    // 处理时间筛选：优先使用 timeFilter，回退到 startDate/endDate
    let start = "";
    let end = "";
    if (timeFilter && ["today", "tomorrow", "weekend", "7days"].includes(timeFilter)) {
      const range = getDateRangeByQuickType(timeFilter);
      if (range) {
        start = range.start;
        end = range.end;
        setStartDate(start);
        setEndDate(end);
      }
    } else {
      start = params.get("startDate") || "";
      end = params.get("endDate") || "";
      setStartDate(start);
      setEndDate(end);
    }

    loadTeams({ page, search: q, difficulty, startDateFrom: start, startDateTo: end, tagIds: tags });
  }, [loadTeams]);

  // 加载可用标签
  React.useEffect(() => {
    fetchAPI("/tags?type=activity")
      .then((r) => r.json())
      .then((data) => { if (data.success && data.tags) setAvailableTags(data.tags); })
      .catch(() => {});
  }, []);

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadTeams({ page: 1, search: searchQuery, difficulty: selectedDifficulty, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
      updateURL();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedDifficulty, startDate, endDate, selectedTags]);

  const updateURL = React.useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (selectedDifficulty.length) params.set("difficulty", selectedDifficulty.join(","));
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
  }, [searchQuery, currentPage, selectedDifficulty, startDate, endDate, selectedTags]);

  const handleDifficultyToggle = React.useCallback((id: string) => {
    const next = selectedDifficulty.includes(id) ? selectedDifficulty.filter((d) => d !== id) : [...selectedDifficulty, id];
    setSelectedDifficulty(next);
    setCurrentPage(1);
  }, [selectedDifficulty]);

  const handleTagToggle = React.useCallback((tagId: string) => {
    const next = selectedTags.includes(tagId) ? selectedTags.filter((t) => t !== tagId) : [...selectedTags, tagId];
    setSelectedTags(next);
    setCurrentPage(1);
  }, [selectedTags]);

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
    setCurrentPage(1);
  }, []);

  const handlePageChange = React.useCallback((page: number) => {
    setCurrentPage(page);
    loadTeams({ page, search: searchQuery, difficulty: selectedDifficulty, startDateFrom: startDate, startDateTo: endDate, tagIds: selectedTags });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchQuery, selectedDifficulty, startDate, endDate, selectedTags, loadTeams]);

  const clearFilters = React.useCallback(() => {
    setSelectedDifficulty([]);
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedTags([]);
    setCurrentPage(1);
    setShowFilters(false);
  }, []);

  const activeFiltersCount = selectedDifficulty.length + (startDate && endDate ? 1 : 0) + selectedTags.length;

  const activeDateQuickType = React.useMemo(
    () => getActiveDateQuickType(startDate, endDate),
    [startDate, endDate]
  );

  return {
    teams,
    isLoading,
    searchQuery,
    currentPage,
    pagination,
    showFilters,
    selectedDifficulty,
    startDate,
    endDate,
    availableTags,
    selectedTags,
    activeFiltersCount,
    activeDateQuickType,
    setSearchQuery,
    setShowFilters,
    setStartDate,
    setEndDate,
    loadTeams,
    handleDifficultyToggle,
    handleTagToggle,
    handleDateQuickSelect,
    handlePageChange,
    clearFilters,
  };
}
