"use client";

import * as React from "react";
import {
  Search,
  MapPin,
  ArrowRight,
  X,
  Mountain,
  TreePine,
  Compass,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// ─── 难度配置（Visual Designer 升级版）─────────────────────────────────────
const difficultyConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  easy: {
    label: "轻松",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  moderate: {
    label: "适中",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  hard: {
    label: "挑战",
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  expert: {
    label: "专家",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

// ─── Shimmer 骨架屏（Interaction Designer 设计）─────────────────────────────
function ShimmerCard() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
      <div className="h-52 bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 animate-[shimmer_1.5s_infinite]" />
      <div className="p-6 space-y-3">
        <div className="h-5 bg-stone-100 rounded-full w-3/4 animate-pulse" />
        <div className="h-4 bg-stone-100 rounded-full w-1/2 animate-pulse" />
        <div className="h-4 bg-stone-100 rounded-full w-full animate-pulse" />
        <div className="h-4 bg-stone-100 rounded-full w-5/6 animate-pulse" />
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-16 bg-stone-100 rounded-full animate-pulse" />
          <div className="h-6 w-20 bg-stone-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── 地点卡片（Frontend Artisan 精工实现）────────────────────────────────────
function LocationCard({ location }: { location: Location }) {
  const diff = location.difficulty
    ? difficultyConfig[location.difficulty]
    : null;

  return (
    <a href={`/locations/${location.id}`} className="group block">
      <article className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-emerald-100/40 transition-all duration-500 hover:-translate-y-1.5 border border-stone-100/80">
        {/* 封面图片区 */}
        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200">
          {location.coverImage ? (
            <img
              src={location.coverImage}
              alt={location.name}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Mountain className="h-16 w-16 text-stone-300" />
            </div>
          )}

          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

          {/* 难度徽章 */}
          {diff && (
            <div className="absolute top-4 left-4">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/90",
                  diff.text
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", diff.dot)} />
                {diff.label}
              </span>
            </div>
          )}

          {/* 最佳季节 */}
          {location.bestSeason && location.bestSeason.length > 0 && (
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
                <Sparkles className="w-3 h-3" />
                {location.bestSeason[0]}
              </span>
            </div>
          )}
        </div>

        {/* 内容区 */}
        <div className="p-6">
          {/* 标题与地址 */}
          <div className="mb-3">
            <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-800 transition-colors leading-snug mb-1">
              {location.name}
            </h3>
            <p className="text-sm text-stone-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {location.address || copy.locations.defaultCity}
            </p>
          </div>

          {/* 描述 */}
          <p className="text-stone-500 text-sm line-clamp-2 leading-relaxed mb-4">
            {location.description}
          </p>

          {/* 标签 */}
          {location.tags && location.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {location.tags.slice(0, 3).map((tag: any, i: number) => (
                <span
                  key={tag?.id ?? i}
                  className="px-2.5 py-1 bg-stone-50 text-stone-500 rounded-full text-xs border border-stone-100"
                >
                  {typeof tag === "string" ? tag : tag?.name}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="pt-4 border-t border-stone-50">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 group-hover:text-emerald-600 transition-colors">
              {copy.locations.viewDetail}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </div>
        </div>
      </article>
    </a>
  );
}

// ─── 空状态（Empathy UX Writer 温暖版）──────────────────────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="w-20 h-20 rounded-full bg-stone-50 flex items-center justify-center mb-6">
        <TreePine className="h-10 w-10 text-stone-300" />
      </div>
      <h3 className="text-lg font-semibold text-stone-700 mb-2">
        这片山野暂时没有结果
      </h3>
      <p className="text-stone-400 text-sm text-center max-w-xs leading-relaxed mb-6">
        试试放宽搜索条件，也许有更多意想不到的好地方等着你
      </p>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-medium transition-colors"
      >
        <Compass className="h-4 w-4" />
        重新探索
      </button>
    </div>
  );
}

// ─── 主组件 ─────────────────────────────────────────────────────────────────

/**
 * 地点列表页客户端组件 - React Island
 * 重构版：温暖、自然、有情感温度的高级界面
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
  const [cities, setCities] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = React.useState("");
  const [cityDropdownOpen, setCityDropdownOpen] = React.useState(false);
  const cityDropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // 从 URL 参数初始化
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const tags = params.get("tags")?.split(",").filter(Boolean) || [];
    const page = parseInt(params.get("page") || "1", 10);
    const cityId = params.get("cityId") || "";
    setSearchQuery(q);
    setSelectedTags(tags);
    setCurrentPage(page);
    setSelectedCityId(cityId);
    loadLocations({ page, search: q, tagIds: tags, cityId });
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

  // 加载城市列表
  React.useEffect(() => {
    fetchAPI("/cities")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.cities) setCities(data.cities);
      })
      .catch(() => {});
  }, []);

  // 点击外部关闭城市下拉
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadLocations = React.useCallback(
    async (params: { page?: number; search?: string; tagIds?: string[]; cityId?: string }) => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams();
        if (params.page) query.set("page", params.page.toString());
        query.set("pageSize", "12");
        if (params.search) query.set("search", params.search);
        if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));
        if (params.cityId) query.set("cityId", params.cityId);

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
      loadLocations({ page: 1, search: searchQuery, tagIds: selectedTags, cityId: selectedCityId });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTags, selectedCityId, loadLocations]);

  const handleTagToggle = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newTags);
    setCurrentPage(1);
  };

  const handleCitySelect = (cityId: string) => {
    setSelectedCityId(cityId);
    setCurrentPage(1);
    setCityDropdownOpen(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadLocations({ page, search: searchQuery, tagIds: selectedTags, cityId: selectedCityId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedCityId("");
    setCurrentPage(1);
  };

  const selectedCityName = cities.find((c) => c.id === selectedCityId)?.name;
  const hasActiveFilters = searchQuery || selectedTags.length > 0 || selectedCityId;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* ── Hero 区域（Visual Designer 深森林渐变）── */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-900">
        {/* 背景纹理装饰 */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* 光晕装饰 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-400/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* 徽章 */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
              <Compass className="h-4 w-4" />
              深圳周边 · 精选目的地
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5 leading-tight">
              {copy.locations.pageTitle}
            </h1>
            <p className="text-stone-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
              每一片山野，都在等待有缘人
            </p>

            {/* 搜索框（磨砂玻璃效果）*/}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="搜索你心仪的山野目的地..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-13 pr-12 py-4 bg-white/10 backdrop-blur-md text-white placeholder-stone-400 border border-white/15 rounded-2xl focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 text-base"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-stone-400" />
                  </button>
                )}
              </div>
            </div>

            {/* 城市筛选 */}
            {cities.length > 0 && (
              <div className="mt-5 flex justify-center">
                <div className="relative" ref={cityDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCityDropdownOpen((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200",
                      selectedCityId
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25"
                        : "bg-white/8 text-stone-300 border-white/15 hover:bg-white/15 hover:text-white hover:border-white/30"
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedCityName || copy.locations.allCities}
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", cityDropdownOpen && "rotate-180")} />
                  </button>

                  {cityDropdownOpen && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-stone-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50 min-w-[160px]">
                      <button
                        type="button"
                        onClick={() => handleCitySelect("")}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm transition-colors",
                          !selectedCityId
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-stone-300 hover:bg-white/8 hover:text-white"
                        )}
                      >
                        {copy.locations.allCities}
                      </button>
                      {cities.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => handleCitySelect(city.id)}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-sm transition-colors",
                            selectedCityId === city.id
                              ? "text-emerald-400 bg-emerald-500/10"
                              : "text-stone-300 hover:bg-white/8 hover:text-white"
                          )}
                        >
                          {city.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 热门标签 */}
            {popularTags.length > 0 && (
              <div className="mt-7">
                <p className="text-stone-500 text-xs uppercase tracking-widest mb-3">
                  热门标签
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {popularTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={cn(
                        "px-4 py-1.5 text-sm rounded-full border transition-all duration-200 active:scale-95",
                        selectedTags.includes(tag.id)
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25"
                          : "bg-white/8 text-stone-300 border-white/15 hover:bg-white/15 hover:text-white hover:border-white/30"
                      )}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 已选筛选条件提示 */}
            {(selectedTags.length > 0 || selectedCityId) && (
              <div className="mt-4 flex items-center gap-3 justify-center flex-wrap">
                {selectedCityId && selectedCityName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/20 text-sky-300 text-xs rounded-full border border-sky-500/30">
                    <MapPin className="w-3 h-3" />
                    {selectedCityName}
                    <button
                      type="button"
                      onClick={() => handleCitySelect("")}
                      className="hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedTags.map((tagId) => {
                  const tag = popularTags.find((t) => t.id === tagId);
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30"
                    >
                      {tag?.name || tagId}
                      <button
                        type="button"
                        onClick={() => handleTagToggle(tagId)}
                        className="hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-stone-500 text-xs hover:text-stone-300 transition-colors underline underline-offset-2"
                >
                  {copy.common.clearAll}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 地点网格区域 ── */}
      <section className="py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 结果信息栏 */}
          <div className="flex items-center justify-between mb-8">
            <p className="text-sm text-stone-400">
              {isLoading ? (
                <span className="inline-block w-24 h-4 bg-stone-200 rounded-full animate-pulse" />
              ) : (
                <>
                  共发现{" "}
                  <span className="font-semibold text-stone-700">
                    {pagination.total}
                  </span>{" "}
                  个目的地
                </>
              )}
            </p>
            {hasActiveFilters && !isLoading && (
              <button
                onClick={handleClearAll}
                className="text-sm text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                清除筛选
              </button>
            )}
          </div>

          {/* 卡片网格 */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {Array.from({ length: 6 }).map((_, i) => (
                <ShimmerCard key={i} />
              ))}
            </div>
          ) : locations.length === 0 ? (
            <EmptyState onClear={handleClearAll} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {locations.map((location) => (
                <LocationCard key={location.id} location={location} />
              ))}
            </div>
          )}

          {/* 分页器 */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-14">
              {Array.from(
                { length: pagination.totalPages },
                (_, i) => i + 1
              ).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={cn(
                    "w-10 h-10 rounded-full text-sm font-medium transition-all duration-200",
                    page === currentPage
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                      : "bg-white text-stone-500 border border-stone-200 hover:border-emerald-300 hover:text-emerald-700"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA 区域（温暖收尾）── */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-stone-50 border-t border-stone-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <Mountain className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900 mb-4">
            {copy.locations.ctaTitle}
          </h2>
          <p className="text-stone-500 mb-8 max-w-md mx-auto leading-relaxed">
            {copy.locations.ctaDesc}
          </p>
          <a href="/contact">
            <button className="inline-flex items-center gap-2 bg-stone-900 hover:bg-emerald-800 text-white px-8 py-3.5 rounded-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-900/20">
              {copy.locations.ctaBtn}
              <ArrowRight className="h-4 w-4" />
            </button>
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
