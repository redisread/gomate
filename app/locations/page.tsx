"use client";

import * as React from "react";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import { Navbar } from "@/app/components/layout/navbar";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/types";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Filter } from "@/components/features/filter";
import { Pagination } from "@/app/components/features/pagination";
import { useLocations } from "@/lib/locations-context";
import { Skeleton } from "@/components/ui/skeleton";

// 难度标签映射
const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "简单", color: "bg-emerald-100 text-emerald-700" },
  moderate: { label: "中等", color: "bg-amber-100 text-amber-700" },
  hard: { label: "困难", color: "bg-orange-100 text-orange-700" },
  expert: { label: "专家", color: "bg-red-100 text-red-700" },
};

// 热门标签类型
interface PopularTag {
  id: string;
  name: string;
  type: string;
  count: number;
}

// 地点卡片骨架屏
function LocationCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <Skeleton className="h-48 w-full" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

// 内部组件 - 使用 useSearchParams
function LocationsPageContent() {
  const { locations, isLoading, pagination, fetchLocations } = useLocations();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 URL 读取状态
  const [selectedFilters, setSelectedFilters] = React.useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get("q") || "");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = React.useState(false);
  const [selectedTags, setSelectedTags] = React.useState<string[]>(
    searchParams.get("tags")?.split(",").filter(Boolean) || []
  );
  const [currentPage, setCurrentPage] = React.useState(
    parseInt(searchParams.get("page") || "1", 10)
  );

  // 热门标签
  const [popularTags, setPopularTags] = React.useState<PopularTag[]>([]);
  const [isTagsLoading, setIsTagsLoading] = React.useState(true);

  // 城市列表（从当前页数据聚合）
  const [allCities, setAllCities] = React.useState<{ id: string; name: string }[]>([]);

  // 加载热门标签和城市列表
  React.useEffect(() => {
    async function loadTagsAndCities() {
      try {
        setIsTagsLoading(true);
        const [popularRes, allTagsRes] = await Promise.all([
          fetch("/api/locations?tags=true"),
          fetch("/api/locations?allTags=true"),
        ]);

        if (popularRes.ok) {
          const popularData = await popularRes.json();
          if (popularData.success) {
            setPopularTags(popularData.tags);
          }
        }

        // 从 allTags 获取城市列表
        if (allTagsRes.ok) {
          const allTagsData = await allTagsRes.json();
          if (allTagsData.success && allTagsData.tags?.location) {
            // 这里使用 location 类型标签作为城市筛选
            // 实际项目中可能需要单独的城市 API
          }
        }
      } catch (error) {
        console.error("[LocationsPage] Failed to load tags:", error);
      } finally {
        setIsTagsLoading(false);
      }
    }

    loadTagsAndCities();
  }, []);

  // 初始加载和 URL 参数同步
  React.useEffect(() => {
    const page = parseInt(searchParams.get("page") || "1", 10);
    const query = searchParams.get("q") || "";
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];

    setCurrentPage(page);
    setSearchQuery(query);
    setSelectedTags(tags);

    // 初始数据加载
    fetchLocations({
      page,
      search: query,
      tagIds: tags,
    });
  }, [searchParams, fetchLocations]);

  // 更新 URL 参数
  const updateUrl = React.useCallback(
    (params: {
      page?: number;
      tags?: string[];
      query?: string;
    }) => {
      const newParams = new URLSearchParams();

      if (params.page && params.page > 1) {
        newParams.set("page", params.page.toString());
      }

      if (params.tags && params.tags.length > 0) {
        newParams.set("tags", params.tags.join(","));
      }

      if (params.query?.trim()) {
        newParams.set("q", params.query.trim());
      }

      const queryString = newParams.toString();
      const newUrl = queryString ? `/locations?${queryString}` : "/locations";
      router.replace(newUrl, { scroll: false });
    },
    [router]
  );

  // 处理页码变化
  const handlePageChange = React.useCallback(
    (page: number) => {
      setCurrentPage(page);
      updateUrl({ page, tags: selectedTags, query: searchQuery });
      fetchLocations({
        page,
        search: searchQuery,
        cityId: selectedFilters["city"]?.[0] || "",
        tagIds: selectedTags,
      });
      // 滚动到列表顶部
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [fetchLocations, searchQuery, selectedFilters, selectedTags, updateUrl]
  );

  const handleFilterChange = (groupId: string, optionId: string) => {
    if (groupId === "clear") {
      setSelectedFilters({});
      return;
    }
    setSelectedFilters((prev) => {
      const current = prev[groupId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [groupId]: next };
    });
  };

  const handleTagToggle = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newTags);
    setCurrentPage(1);
    updateUrl({ page: 1, tags: newTags, query: searchQuery });
    fetchLocations({
      page: 1,
      search: searchQuery,
      tagIds: newTags,
    });
  };

  // 清除所有标签筛选
  const handleClearTags = () => {
    setSelectedTags([]);
    setCurrentPage(1);
    updateUrl({ page: 1, tags: [], query: searchQuery });
    fetchLocations({
      page: 1,
      search: searchQuery,
      tagIds: [],
    });
  };

  // 搜索处理
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
  };

  // 搜索提交（防抖）
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        updateUrl({ page: 1, tags: selectedTags, query: searchQuery });
        fetchLocations({
          page: 1,
          search: searchQuery,
          tagIds: selectedTags,
        });
      } else {
        setCurrentPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedTags, currentPage, fetchLocations, updateUrl]);

  // 清除所有筛选
  const handleClearAllFilters = () => {
    setSelectedFilters({});
    setSearchQuery("");
    setSelectedTags([]);
    setCurrentPage(1);
    router.replace("/locations", { scroll: false });
    fetchLocations({ page: 1 });
  };

  // 构建城市列表（从所有地点聚合）
  const cityList = React.useMemo(() => {
    const cityMap = new Map<string, string>();
    locations.forEach((loc) => {
      if (loc.cityId && loc.cityName) {
        cityMap.set(loc.cityId, loc.cityName);
      }
    });
    return Array.from(cityMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh"));
  }, [locations]);

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              探索徒步地点
            </h1>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              精选徒步路线，从城市公园到山野海岸，找到适合你的户外目的地
            </p>
            {/* 搜索框 */}
            <div className="mt-8 max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="搜索地点名称或描述..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 text-white placeholder-stone-400 border border-white/20 rounded-xl focus:outline-none focus:border-white/40"
                />
              </div>
            </div>
            {/* 热门标签快速筛选 */}
            {!isTagsLoading && popularTags.length > 0 && (
              <div className="mt-6">
                <p className="text-stone-400 text-sm mb-3">热门标签</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {popularTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-full border transition-colors",
                        selectedTags.includes(tag.id)
                          ? "bg-white text-stone-900 border-white font-medium"
                          : "bg-white/10 text-stone-300 border-white/20 hover:bg-white/20 hover:text-white"
                      )}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 已选标签 */}
            {selectedTags.length > 0 && (
              <div className="mt-4 flex items-center gap-2 justify-center">
                <span className="text-stone-400 text-sm">已选:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tagId) => {
                    const tag = popularTags.find((t) => t.id === tagId);
                    return (
                      <span
                        key={tagId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 text-white text-sm rounded-full"
                      >
                        {tag?.name || tagId}
                        <button
                          type="button"
                          onClick={() => handleTagToggle(tagId)}
                          className="hover:bg-white/30 rounded-full p-0.5"
                        >
                          <span className="sr-only">移除</span>
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleClearTags}
                  className="text-stone-400 text-sm hover:text-white underline"
                >
                  清除全部
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Locations Grid */}
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 筛选栏 + 结果计数 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {/* 移动端筛选按钮 - 城市筛选 */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-sm font-medium text-stone-700 hover:border-stone-400 transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4" />
                筛选
              </button>
              {/* 桌面端筛选组件 - 城市筛选 */}
              <Filter
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
                cities={cityList}
              />
            </div>
            <p className="text-sm text-stone-500">
              共 {pagination.total} 个地点
            </p>
          </div>

          {/* 搜索结果指示器 */}
          {searchQuery && (
            <div className="mb-6 p-4 bg-white rounded-xl border border-stone-200">
              <div className="flex items-center justify-between">
                <p className="text-stone-600">
                  搜索 <span className="font-medium text-stone-900">&quot;{searchQuery}&quot;</span> 的结果
                  <span className="ml-2 text-sm text-stone-400">
                    ({pagination.total} 个地点)
                  </span>
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    updateUrl({ page: 1, tags: selectedTags, query: "" });
                    fetchLocations({ page: 1, tagIds: selectedTags });
                  }}
                  className="text-sm text-stone-500 hover:text-stone-700 underline"
                >
                  清除搜索
                </button>
              </div>
            </div>
          )}

          {/* Mobile Filter Drawer - 不传 cities，避免重复渲染桌面端筛选器 */}
          <Filter
            isOpen={isMobileFilterOpen}
            onClose={() => setIsMobileFilterOpen(false)}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
          />

          {/* 加载状态 */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <LocationCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {locations.length === 0 ? (
                  <div className="col-span-full text-center py-16">
                    <p className="text-stone-500 mb-4">没有找到符合条件的地点</p>
                    <button
                      onClick={handleClearAllFilters}
                      className="text-stone-700 underline text-sm"
                    >
                      清除筛选条件
                    </button>
                  </div>
                ) : (
                  locations.map((location, index) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <Link href={`/locations/${location.id}`}>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">
                          {/* Cover Image */}
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={location.coverImage}
                              alt={location.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute top-4 left-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  difficultyLabels[location.difficulty]?.color ||
                                  "bg-stone-100 text-stone-700"
                                }`}
                              >
                                {difficultyLabels[location.difficulty]?.label ||
                                  location.difficulty}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            <div className="flex items-start gap-3 mb-3">
                              <MapPin className="h-5 w-5 text-stone-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <h3 className="text-xl font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                                  {location.name}
                                </h3>
                                <p className="text-sm text-stone-500">
                                  {location.address || "深圳"}
                                </p>
                              </div>
                            </div>

                            <p className="text-stone-600 text-sm line-clamp-2 mb-4">
                              {location.description}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                              {location.tags?.slice(0, 3).map((tag: any, i: number) => (
                                <span
                                  key={tag?.id ?? i}
                                  className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs"
                                >
                                  {typeof tag === "string" ? tag : tag?.name}
                                </span>
                              ))}
                            </div>

                            {/* CTA */}
                            <div className="mt-6 pt-4 border-t border-stone-100">
                              <div className="flex items-center text-stone-900 font-medium group-hover:text-stone-700 transition-colors">
                                查看详情
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>

              {/* 分页组件 */}
              {locations.length > 0 && pagination.totalPages > 1 && (
                <div className="mt-12">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    pageSize={pagination.pageSize}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-stone-900 mb-4">
              没找到心仪的地点？
            </h2>
            <p className="text-stone-600 mb-8">
              联系我们推荐新的徒步路线，或者创建自己的队伍
            </p>
            <Button size="lg" className="bg-stone-800 hover:bg-stone-700" asChild>
              <Link href="/contact">联系我们</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// 加载状态组件
function LocationsPageSkeleton() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />
      <section className="pt-32 pb-16 bg-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="h-12 w-64 bg-white/10 rounded-lg mx-auto mb-4 animate-pulse" />
            <div className="h-6 w-96 bg-white/10 rounded-lg mx-auto animate-pulse" />
          </div>
        </div>
      </section>
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

// 导出默认组件 - 包裹在 Suspense 中
export default function LocationsPage() {
  return (
    <Suspense fallback={<LocationsPageSkeleton />}>
      <LocationsPageContent />
    </Suspense>
  );
}
