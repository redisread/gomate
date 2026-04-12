import * as React from "react";
import type { Team } from "@/lib/types";
import { fetchAPI } from "@/lib/api";

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
    const start = params.get("startDate") || "";
    const end = params.get("endDate") || "";
    const tags = params.get("tags")?.split(",").filter(Boolean) || [];

    setSearchQuery(q);
    setCurrentPage(page);
    setSelectedDifficulty(difficulty);
    setStartDate(start);
    setEndDate(end);
    setSelectedTags(tags);

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
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (selectedTags.length) params.set("tags", selectedTags.join(","));

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
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    switch (type) {
      case "today":
        setStartDate(formatDate(today));
        setEndDate(formatDate(today));
        break;
      case "tomorrow": {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setStartDate(formatDate(tomorrow));
        setEndDate(formatDate(tomorrow));
        break;
      }
      case "weekend": {
        const day = today.getDay();
        const daysUntilSaturday = day === 0 ? 6 : 6 - day;
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + daysUntilSaturday);
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        setStartDate(formatDate(saturday));
        setEndDate(formatDate(sunday));
        break;
      }
      case "7days": {
        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);
        setStartDate(formatDate(today));
        setEndDate(formatDate(next7Days));
        break;
      }
      case "30days": {
        const next30Days = new Date(today);
        next30Days.setDate(today.getDate() + 30);
        setStartDate(formatDate(today));
        setEndDate(formatDate(next30Days));
        break;
      }
      case "clear":
        setStartDate("");
        setEndDate("");
        break;
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

  const activeFiltersCount = selectedDifficulty.length + (startDate ? 1 : 0) + (endDate ? 1 : 0) + selectedTags.length;

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
