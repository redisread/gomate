"use client";

import * as React from "react";
import { Search, MapPin, ArrowRight, SlidersHorizontal, X } from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// 难度标签
const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "简单", color: "bg-emerald-100 text-emerald-700" },
  moderate: { label: "中等", color: "bg-amber-100 text-amber-700" },
  hard: { label: "困难", color: "bg-orange-100 text-orange-700" },
  expert: { label: "专家", color: "bg-red-100 text-red-700" },
};

/**
 * 地点列表页客户端组件 - React Island
 */
export function LocationsClient() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    totalPages: 0,
    pageSize: 12,
  });
  const [popularTags, setPopularTags] = React.useState<
    { id: string; name: string }[]
  >([]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  // 从 URL 参数初始化
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const tags = params.get("tags")?.split(",").filter(Boolean) || [];
    const page = parseInt(params.get("page") || "1", 10);
    setSearchQuery(q);
    setSelectedTags(tags);
    setCurrentPage(page);
    loadLocations({ page, search: q, tagIds: tags });
  }, []);

  // 加载热门标签
  React.useEffect(() => {
    fetchAPI("/locations?tags=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.tags) setPopularTags(data.tags);
      })
      .catch(() => {});
  }, []);

  const loadLocations = React.useCallback(
    async (params: { page?: number; search?: string; tagIds?: string[] }) => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams();
        if (params.page) query.set("page", params.page.toString());
        query.set("pageSize", "12");
        if (params.search) query.set("search", params.search);
        if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));

        const res = await fetchAPI(`/locations?${query}`);
        const data = await res.json();
        if (data.success) {
          setLocations(data.locations);
          setPagination(data.pagination);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadLocations({ page: 1, search: searchQuery, tagIds: selectedTags });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTags, loadLocations]);

  const handleTagToggle = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newTags);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadLocations({ page, search: searchQuery, tagIds: selectedTags });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              {copy.locations.pageTitle}
            </h1>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              {copy.locations.pageSubtitle}
            </p>

            {/* 搜索框 */}
            <div className="mt-8 max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="搜索地点名称或描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 text-white placeholder-stone-400 border border-white/20 rounded-xl focus:outline-none focus:border-white/40"
                />
              </div>
            </div>

            {/* 热门标签 */}
            {popularTags.length > 0 && (
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
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="text-stone-400 text-sm hover:text-white underline"
                >
                  清除全部
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Locations Grid */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 结果计数 */}
          <div className="flex items-center justify-between mb-8">
            <p className="text-sm text-stone-500">
              共 {pagination.total} 个地点
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-stone-500 hover:text-stone-700 underline"
              >
                清除搜索
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-500 mb-4">没有找到符合条件的地点</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTags([]);
                }}
                className="text-stone-700 underline text-sm"
              >
                清除筛选条件
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {locations.map((location) => (
                <a key={location.id} href={`/locations/${location.id}`}>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">
                    {/* Cover Image */}
                    <div className="relative h-48 overflow-hidden bg-stone-100">
                      {location.coverImage && (
                        <img
                          src={location.coverImage}
                          alt={location.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      {location.difficulty && (
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
                      )}
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
                            {location.address || copy.locations.defaultCity}
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
                      <div className="mt-5 pt-4 border-t border-stone-100">
                        <div className="flex items-center text-stone-900 font-medium group-hover:text-stone-700 transition-colors">
                          {copy.locations.viewDetail}
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {Array.from(
                { length: pagination.totalPages },
                (_, i) => i + 1
              ).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                    page === currentPage
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-stone-900 mb-4">
            {copy.locations.ctaTitle}
          </h2>
          <p className="text-stone-600 mb-8">{copy.locations.ctaDesc}</p>
          <a href="/contact">
            <button className="bg-stone-800 hover:bg-stone-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
              {copy.locations.ctaBtn}
            </button>
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
