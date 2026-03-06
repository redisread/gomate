"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Search, SlidersHorizontal, Compass } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import { Navbar } from "@/app/components/layout/navbar";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/types";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Filter } from "@/components/features/filter";
import { useLocations } from "@/lib/locations-context";

// 难度标签映射
const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "简单", color: "bg-emerald-100 text-emerald-700" },
  moderate: { label: "中等", color: "bg-amber-100 text-amber-700" },
  hard: { label: "困难", color: "bg-orange-100 text-orange-700" },
  expert: { label: "专家", color: "bg-red-100 text-red-700" },
};

// 标签分组配置
const tagGroups = {
  location: { label: "地点类型", icon: MapPin },
  activity: { label: "活动类型", icon: Compass },
};

// 热门标签类型
interface PopularTag {
  id: string;
  name: string;
  type: string;
  count: number;
}

export default function LocationsPage() {
  const { locations, isLoading } = useLocations();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 URL 读取筛选状态
  const [selectedFilters, setSelectedFilters] = React.useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get("q") || "");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = React.useState(false);
  const [selectedTags, setSelectedTags] = React.useState<string[]>(
    searchParams.get("tags")?.split(",").filter(Boolean) || []
  );

  // 热门标签和分组标签
  const [popularTags, setPopularTags] = React.useState<PopularTag[]>([]);
  const [groupedTags, setGroupedTags] = React.useState<{
    location: Array<{ id: string; name: string; count: number }>;
    activity: Array<{ id: string; name: string; count: number }>;
  }>({ location: [], activity: [] });
  const [isTagsLoading, setIsTagsLoading] = React.useState(true);

  console.log("[LocationsPage] locations count:", locations.length, "isLoading:", isLoading);

  // 加载标签数据
  React.useEffect(() => {
    async function loadTags() {
      try {
        setIsTagsLoading(true);
        // 并行加载热门标签和分组标签
        const [popularRes, groupedRes] = await Promise.all([
          fetch("/api/locations?tags=true"),
          fetch("/api/locations?allTags=true"),
        ]);

        if (popularRes.ok) {
          const popularData = await popularRes.json();
          if (popularData.success) {
            setPopularTags(popularData.tags);
          }
        }

        if (groupedRes.ok) {
          const groupedData = await groupedRes.json();
          if (groupedData.success) {
            setGroupedTags(groupedData.tags);
          }
        }
      } catch (error) {
        console.error("[LocationsPage] Failed to load tags:", error);
      } finally {
        setIsTagsLoading(false);
      }
    }

    loadTags();
  }, []);

  // 更新 URL 参数
  const updateUrl = React.useCallback((newTags: string[], newQuery?: string) => {
    const params = new URLSearchParams(searchParams);

    // 更新标签参数
    if (newTags.length > 0) {
      params.set("tags", newTags.join(","));
    } else {
      params.delete("tags");
    }

    // 更新搜索参数
    const query = newQuery !== undefined ? newQuery : searchQuery;
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    const queryString = params.toString();
    const newUrl = queryString ? `/locations?${queryString}` : "/locations";
    router.replace(newUrl, { scroll: false });
  }, [searchParams, router, searchQuery]);

  React.useEffect(() => {
    if (locations.length === 0 && !isLoading) {
      console.log("[LocationsPage] No locations, refreshing...");
    }
  }, [locations.length, isLoading]);

  const handleFilterChange = (groupId: string, optionId: string) => {
    if (groupId === "clear") {
      setSelectedFilters({});
      return;
    }
    setSelectedFilters(prev => {
      const current = prev[groupId] ?? [];
      const next = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId];
      return { ...prev, [groupId]: next };
    });
  };


  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId];
      updateUrl(newTags);
      return newTags;
    });
  };

  // 清除所有标签筛选
  const handleClearTags = () => {
    setSelectedTags([]);
    updateUrl([]);
  };

  // 搜索处理
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    updateUrl(selectedTags, newQuery);
  };

  // 清除所有筛选
  const handleClearAllFilters = () => {
    setSelectedFilters({});
    setSearchQuery("");
    setSelectedTags([]);
    router.replace("/locations", { scroll: false });
  };

  const filteredLocations = React.useMemo(() => {
    return locations.filter(location => {
      // 搜索词匹配（名称 + 描述）
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = location.name.toLowerCase().includes(q);
        const matchDesc = location.description?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchDesc) return false;
      }

      // 难度筛选
      const difficulties = selectedFilters["difficulty"] ?? [];
      if (difficulties.length > 0 && !difficulties.includes(location.difficulty ?? "")) {
        return false;
      }

      // 季节筛选
      const seasons = selectedFilters["season"] ?? [];
      if (seasons.length > 0) {
        const locationSeasons = location.bestSeason ?? [];
        if (!seasons.some(s => locationSeasons.includes(s))) return false;
      }

      // 标签快速筛选（OR 逻辑：匹配任一已选标签即通过）
      if (selectedTags.length > 0) {
        const locationTagIds = (location.tags as Tag[] ?? []).map(t => t.id);
        if (!selectedTags.some(id => locationTagIds.includes(id))) return false;
      }

      return true;
    });
  }, [locations, searchQuery, selectedFilters, selectedTags]);

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
                  {popularTags.map(tag => (
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
                  {selectedTags.map(tagId => {
                    const tag = popularTags.find(t => t.id === tagId) ||
                               groupedTags.location.find(t => t.id === tagId) ||
                               groupedTags.activity.find(t => t.id === tagId);
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
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 详细筛选 - 按类型分组的标签 */}
          {!isTagsLoading && (groupedTags.location.length > 0 || groupedTags.activity.length > 0) && (
            <div className="mb-8 p-6 bg-white rounded-2xl border border-stone-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-stone-900">详细筛选</h3>
                {(selectedTags.length > 0 || searchQuery || Object.values(selectedFilters).flat().length > 0) && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="text-sm text-stone-500 hover:text-stone-700 underline"
                  >
                    清除全部筛选
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* 地点类型标签 */}
                {groupedTags.location.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-stone-400" />
                      <span className="text-sm font-medium text-stone-700">{tagGroups.location.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {groupedTags.location.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-full border transition-colors",
                            selectedTags.includes(tag.id)
                              ? "bg-stone-900 text-white border-stone-900"
                              : "bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-400"
                          )}
                        >
                          {tag.name}
                          <span className="ml-1 text-xs opacity-60">({tag.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 活动类型标签 */}
                {groupedTags.activity.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Compass className="h-4 w-4 text-stone-400" />
                      <span className="text-sm font-medium text-stone-700">{tagGroups.activity.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {groupedTags.activity.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-full border transition-colors",
                            selectedTags.includes(tag.id)
                              ? "bg-stone-900 text-white border-stone-900"
                              : "bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-400"
                          )}
                        >
                          {tag.name}
                          <span className="ml-1 text-xs opacity-60">({tag.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 筛选栏 + 结果计数 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {/* 移动端筛选按钮 */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-sm font-medium text-stone-700 hover:border-stone-400 transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4" />
                筛选
              </button>
              {/* 桌面端筛选组件 */}
              <Filter
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
              />
            </div>
            <p className="text-sm text-stone-500">
              共 {filteredLocations.length} 个地点
            </p>
          </div>

          {/* Mobile Filter Drawer */}
          <Filter
            isOpen={isMobileFilterOpen}
            onClose={() => setIsMobileFilterOpen(false)}
            selectedFilters={selectedFilters}
            onFilterChange={handleFilterChange}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredLocations.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-16">
                <p className="text-stone-500 mb-4">没有找到符合条件的地点</p>
                <button
                  onClick={handleClearAllFilters}
                  className="text-stone-700 underline text-sm"
                >
                  清除筛选条件
                </button>
              </div>
            )}
            {filteredLocations.map((location, index) => (
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
                            {location.location?.address || "深圳"}
                          </p>
                        </div>
                      </div>

                      <p className="text-stone-600 text-sm line-clamp-2 mb-4">
                        {location.description}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-sm text-stone-500 mb-4">
                        <span>{location.duration}</span>
                        <span className="text-stone-300">|</span>
                        <span>{location.distance}</span>
                      </div>

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
            ))}
          </div>
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
            <Button size="lg" className="bg-stone-800 hover:bg-stone-700">
              联系我们
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
