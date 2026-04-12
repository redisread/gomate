import * as React from "react";
import type { Location } from "@/lib/types";
import { fetchAPI } from "@/lib/api";
import type { RoleKey } from "./constants";

export function useLocationsList() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [gridKey, setGridKey] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({ total: 0, totalPages: 0, pageSize: 12 });
  const [popularTags, setPopularTags] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [cities, setCities] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = React.useState("");
  const [activeRole, setActiveRole] = React.useState<RoleKey>("");
  const [showCityDropdown, setShowCityDropdown] = React.useState(false);
  const [cityDropdownPos, setCityDropdownPos] = React.useState({ top: 0, left: 0 });
  const [gridFading, setGridFading] = React.useState(false);

  const loadLocations = React.useCallback(
    async (params: { page?: number; search?: string; tagIds?: string[]; cityId?: string; type?: string }) => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams();
        if (params.page) query.set("page", params.page.toString());
        query.set("pageSize", "12");
        if (params.search) query.set("search", params.search);
        if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));
        if (params.cityId) query.set("cityId", params.cityId);
        if (params.type) query.set("type", params.type);
        const res = await fetchAPI(`/locations?${query}`);
        const data = await res.json();
        if (data.success) {
          setLocations(data.locations);
          setPagination(data.pagination);
          setGridKey((k) => k + 1);
        }
      } finally {
        setIsLoading(false);
        setGridFading(false);
      }
    },
    []
  );

  // URL 参数初始化
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const tags = params.get("tags")?.split(",").filter(Boolean) || [];
    const page = parseInt(params.get("page") || "1", 10);
    const cityId = params.get("cityId") || "";
    const type = (params.get("type") || "") as RoleKey;
    setSearchQuery(q);
    setSelectedTags(tags);
    setCurrentPage(page);
    setSelectedCityId(cityId);
    setActiveRole(type);
    loadLocations({ page, search: q, tagIds: tags, cityId, type });
  }, [loadLocations]);

  // 加载标签
  React.useEffect(() => {
    fetchAPI("/locations?tags=true")
      .then((r) => r.json())
      .then((data) => { if (data.success && data.tags) setPopularTags(data.tags); })
      .catch(() => {});
  }, []);

  // 加载城市
  React.useEffect(() => {
    fetchAPI("/cities")
      .then((r) => r.json())
      .then((data) => { if (data.success && data.cities) setCities(data.cities); })
      .catch(() => {});
  }, []);

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadLocations({ page: 1, search: searchQuery, tagIds: selectedTags, cityId: selectedCityId, type: activeRole });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTags, selectedCityId, activeRole, loadLocations]);

  const handleTagToggle = React.useCallback((tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newTags);
    setCurrentPage(1);
  }, [selectedTags]);

  const handleCitySelect = React.useCallback((cityId: string) => {
    setSelectedCityId(cityId);
    setCurrentPage(1);
    setShowCityDropdown(false);
  }, []);

  const handleRoleSelect = React.useCallback((role: RoleKey) => {
    const newRole = role === activeRole ? "" : role;
    setActiveRole(newRole);
    setCurrentPage(1);
  }, [activeRole]);

  const handlePageChange = React.useCallback((page: number) => {
    setGridFading(true);
    setCurrentPage(page);
    loadLocations({ page, search: searchQuery, tagIds: selectedTags, cityId: selectedCityId, type: activeRole });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchQuery, selectedTags, selectedCityId, activeRole, loadLocations]);

  const handleClearAll = React.useCallback(() => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedCityId("");
    setActiveRole("");
    setCurrentPage(1);
  }, []);

  const selectedCityName = cities.find((c) => c.id === selectedCityId)?.name;
  const hasActiveFilters = !!(searchQuery || selectedTags.length > 0 || selectedCityId || activeRole);

  const getPageNumbers = React.useCallback(() => {
    const total = pagination.totalPages;
    const current = currentPage;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    if (current <= 3) {
      pages.push(1, 2, 3, 4, "...", total);
    } else if (current >= total - 2) {
      pages.push(1, "...", total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, "...", current - 1, current, current + 1, "...", total);
    }
    return pages;
  }, [pagination.totalPages, currentPage]);

  return {
    locations,
    isLoading,
    gridKey,
    searchQuery,
    currentPage,
    pagination,
    popularTags,
    selectedTags,
    cities,
    selectedCityId,
    activeRole,
    showCityDropdown,
    cityDropdownPos,
    gridFading,
    selectedCityName,
    hasActiveFilters,
    setSearchQuery,
    setShowCityDropdown,
    setCityDropdownPos,
    loadLocations,
    handleTagToggle,
    handleCitySelect,
    handleRoleSelect,
    handlePageChange,
    handleClearAll,
    getPageNumbers,
  };
}
