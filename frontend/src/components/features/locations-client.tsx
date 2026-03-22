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
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Location, Tag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// ─── 难度配置 ─────────────────────────────────────────────────────────────────
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

// ─── Shimmer 骨架屏（流畅扫光版）────────────────────────────────────────────
function ShimmerCard() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100/80">
      {/* 封面图骨架：使用 skeleton 扫光类 */}
      <div className="h-52 skeleton" />
      <div className="p-6 space-y-3">
        {/* 标题 */}
        <div className="h-5 skeleton rounded-full w-2/3" />
        {/* 地址 */}
        <div className="h-3.5 skeleton rounded-full w-1/3" />
        {/* 描述两行 */}
        <div className="space-y-2 pt-1">
          <div className="h-3.5 skeleton rounded-full w-full" />
          <div className="h-3.5 skeleton rounded-full w-4/5" />
        </div>
        {/* 标签 */}
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-14 skeleton rounded-full" />
          <div className="h-6 w-18 skeleton rounded-full" />
          <div className="h-6 w-12 skeleton rounded-full" />
        </div>
        {/* CTA */}
        <div className="pt-3 border-t border-stone-50">
          <div className="h-4 skeleton rounded-full w-24" />
        </div>
      </div>
    </div>
  );
}

// ─── 地点卡片（升级版 + 入场动效）────────────────────────────────────────────
function LocationCard({
  location,
  index,
}: {
  location: Location;
  index: number;
}) {
  const diff = location.difficulty
    ? difficultyConfig[location.difficulty]
    : null;

  // stagger delay：每张卡片依次延迟 75ms，最多 6 张
  const delayMs = Math.min(index, 5) * 75;

  return (
    <a
      href={`/locations/${location.id}`}
      className="group block motion-reduce:animate-none"
      style={{
        animation: `fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms both`,
      }}
    >
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

          {/* 三层渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-transparent" />

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
            <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-700 transition-colors leading-snug mb-1">
              {location.name}
            </h3>
            <p className="text-sm text-stone-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">
                {location.address || copy.locations.defaultCity}
              </span>
            </p>
          </div>

          {/* 描述 */}
          <p className="text-stone-500 text-sm line-clamp-2 leading-relaxed mb-4">
            {location.description}
          </p>

          {/* 标签 */}
          {location.tags && location.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {location.tags.slice(0, 3).map((tag: Tag, i: number) => (
                <span
                  key={tag?.id ?? i}
                  className="px-2.5 py-1 bg-emerald-50/80 text-emerald-700 rounded-full text-xs border border-emerald-100"
                >
                  {typeof tag === "string" ? tag : tag?.name}
                </span>
              ))}
            </div>
          )}

          {/* CTA — 箭头有 spring 弹性位移 */}
          <div className="pt-4 border-t border-stone-100">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 group-hover:text-emerald-600 transition-colors">
              {copy.locations.viewDetail}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1.5"
              />
            </span>
          </div>
        </div>
      </article>
    </a>
  );
}

// ─── 空状态（浮动图标 + 升级版）────────────────────────────────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 px-4">
      {/* 多层圆形装饰，图标 subtle floating */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100/80 flex items-center justify-center">
            {/* float 动画：上下浮动 3s infinite，尊重 prefers-reduced-motion */}
            <TreePine
              className="h-8 w-8 text-emerald-400 motion-reduce:animate-none"
              style={{ animation: "float 3s ease-in-out infinite" }}
            />
          </div>
        </div>
        {/* 装饰圆点 */}
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-200" />
        <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-emerald-200" />
      </div>
      <h3 className="text-xl font-semibold text-stone-700 mb-3">
        {copy.locations.emptyTitle}
      </h3>
      <p className="text-stone-400 text-sm text-center max-w-xs leading-relaxed mb-8">
        {copy.locations.emptyDesc}
      </p>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 active:scale-95"
      >
        <Compass className="h-4 w-4" />
        {copy.locations.emptyBtn}
      </button>
    </div>
  );
}

// ─── 筛选 badge（slide-in + fade-in 入场）────────────────────────────────────
function FilterBadge({
  children,
  onRemove,
  color = "emerald",
}: {
  children: React.ReactNode;
  onRemove: () => void;
  color?: "emerald" | "sky";
}) {
  const colorClass =
    color === "sky"
      ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border motion-reduce:animate-none",
        colorClass
      )}
      style={{ animation: "fade-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-white transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ─── 主组件 ─────────────────────────────────────────────────────────────────

/**
 * 地点列表页客户端组件 - React Island
 * 升级版：多层次视觉 + 完整微交互动效
 */
export function LocationsClient() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  // gridKey 在每次加载完成后更新，触发卡片重新挂载以播放入场动画
  const [gridKey, setGridKey] = React.useState(0);
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
  // gridFading：分页切换时短暂隐藏内容区，实现 fade 过渡
  const [gridFading, setGridFading] = React.useState(false);
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
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(e.target as Node)
      ) {
        setCityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadLocations = React.useCallback(
    async (params: {
      page?: number;
      search?: string;
      tagIds?: string[];
      cityId?: string;
    }) => {
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
          // 每次加载完毕，更新 gridKey 触发卡片入场动画
          setGridKey((k) => k + 1);
        }
      } finally {
        setIsLoading(false);
        setGridFading(false);
      }
    },
    []
  );

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadLocations({
        page: 1,
        search: searchQuery,
        tagIds: selectedTags,
        cityId: selectedCityId,
      });
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
    // 分页切换：先 fade out，再加载新数据
    setGridFading(true);
    setCurrentPage(page);
    loadLocations({
      page,
      search: searchQuery,
      tagIds: selectedTags,
      cityId: selectedCityId,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedCityId("");
    setCurrentPage(1);
  };

  const selectedCityName = cities.find((c) => c.id === selectedCityId)?.name;
  const hasActiveFilters =
    searchQuery || selectedTags.length > 0 || selectedCityId;

  // 计算分页页码（最多显示 5 个，超出用 ...）
  const getPageNumbers = () => {
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
  };

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* ── Hero 区域（多层次视觉）── */}
      <section className="relative pt-32 pb-24 overflow-hidden bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-900">
        {/* 点阵纹理 */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* 大光晕 - 左上 */}
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

        {/* 大光晕 - 右下 */}
        <div className="absolute -bottom-10 -right-10 w-[400px] h-[400px] bg-emerald-400/6 rounded-full blur-3xl pointer-events-none" />

        {/* 小光晕 - 中间 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />

        {/* SVG 山脉剪影装饰（底部） */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg
            viewBox="0 0 1440 80"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-16 sm:h-20"
          >
            <path
              d="M0 80L120 55L240 68L360 40L480 60L600 28L720 50L840 20L960 45L1080 15L1200 38L1320 22L1440 48V80H0Z"
              className="fill-stone-50"
            />
            <path
              d="M0 80L180 62L360 75L540 50L720 68L900 42L1080 60L1260 35L1440 58V80H0Z"
              className="fill-stone-50/60"
            />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* 徽章 — fade-in 入场 */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-emerald-400 text-sm font-medium mb-6 motion-reduce:animate-none"
              style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0ms both" }}
            >
              <Compass className="h-4 w-4" />
              {copy.locations.ctaHeroBadge}
            </div>

            {/* 标题（渐变文字）— 延迟 80ms */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent motion-reduce:animate-none"
              style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 80ms both" }}
            >
              {copy.locations.pageTitle}
            </h1>

            {/* 副标题 — 延迟 150ms */}
            <p
              className="text-stone-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10 motion-reduce:animate-none"
              style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 150ms both" }}
            >
              {copy.locations.heroTagline}
            </p>

            {/* 搜索框（磨砂玻璃效果）— 延迟 220ms */}
            <div
              className="max-w-xl mx-auto motion-reduce:animate-none"
              style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both" }}
            >
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={copy.locations.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-13 pr-12 py-4 bg-white/10 backdrop-blur-md text-white placeholder-stone-400 border border-white/15 rounded-2xl focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/25 transition-all duration-300 text-base"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors animate-spin-in"
                  >
                    <X className="h-4 w-4 text-stone-400" />
                  </button>
                )}
              </div>
            </div>

            {/* 城市筛选 — 延迟 280ms */}
            {cities.length > 0 && (
              <div
                className="mt-5 flex justify-center motion-reduce:animate-none"
                style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 280ms both" }}
              >
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
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        cityDropdownOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {/* 城市下拉：scale-y + opacity 入场，origin-top */}
                  {cityDropdownOpen && (
                    <div
                      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-stone-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50 min-w-[160px] max-h-64 overflow-y-auto py-1 origin-top motion-reduce:animate-none"
                      style={{
                        animation:
                          "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleCitySelect("")}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                          !selectedCityId
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-stone-300 hover:bg-white/8 hover:text-white"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5" />
                          {copy.locations.allCities}
                        </span>
                        {!selectedCityId && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <div className="divide-y divide-white/5">
                        {cities.map((city) => (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => handleCitySelect(city.id)}
                            className={cn(
                              "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                              selectedCityId === city.id
                                ? "text-emerald-400 bg-emerald-500/10"
                                : "text-stone-300 hover:bg-white/8 hover:text-white"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5" />
                              {city.name}
                            </span>
                            {selectedCityId === city.id && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 探索标签 — 延迟 330ms */}
            {popularTags.length > 0 && (
              <div
                className="mt-7 motion-reduce:animate-none"
                style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 330ms both" }}
              >
                <p className="text-stone-400 text-xs font-medium tracking-[0.12em] uppercase mb-3">
                  {copy.locations.tagsLabel}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {popularTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={cn(
                        // cubic-bezier bounce 选中动效
                        "px-4 py-1.5 text-sm rounded-full border transition-all duration-200",
                        "active:scale-95 active:[transition-duration:80ms]",
                        selectedTags.includes(tag.id)
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 scale-[1.03]"
                          : "bg-white/8 text-stone-300 border-white/15 hover:bg-white/15 hover:text-white hover:border-white/30 hover:scale-[1.03]"
                      )}
                      style={{
                        transitionTimingFunction: selectedTags.includes(tag.id)
                          ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
                          : "ease",
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 已选筛选条件 badge */}
            {(selectedTags.length > 0 || selectedCityId) && (
              <div className="mt-4 flex items-center gap-3 justify-center flex-wrap">
                {selectedCityId && selectedCityName && (
                  <FilterBadge
                    color="sky"
                    onRemove={() => handleCitySelect("")}
                  >
                    <MapPin className="w-3 h-3" />
                    {selectedCityName}
                  </FilterBadge>
                )}
                {selectedTags.map((tagId) => {
                  const tag = popularTags.find((t) => t.id === tagId);
                  return (
                    <FilterBadge
                      key={tagId}
                      color="emerald"
                      onRemove={() => handleTagToggle(tagId)}
                    >
                      {tag?.name || tagId}
                    </FilterBadge>
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
                  <span className="font-bold text-stone-800 text-base">
                    {pagination.total}
                  </span>{" "}
                  <span>{copy.locations.resultCount}</span>
                </>
              )}
            </p>
            {hasActiveFilters && !isLoading && (
              <button
                onClick={handleClearAll}
                className="text-sm text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                {copy.locations.clearFilter}
              </button>
            )}
          </div>

          {/* 卡片网格 — 分页切换时 gridFading 控制 fade 过渡 */}
          <div
            className="transition-opacity duration-200 motion-reduce:transition-none"
            style={{ opacity: gridFading ? 0 : 1 }}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ShimmerCard key={i} />
                ))}
              </div>
            ) : locations.length === 0 ? (
              <EmptyState onClear={handleClearAll} />
            ) : (
              // key={gridKey} 确保每次加载新数据后卡片重新挂载，触发入场动画
              <div
                key={gridKey}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7"
              >
                {locations.map((location, index) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 分页器（含上一页/下一页） */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-14">
              {/* 上一页 */}
              <button
                onClick={() =>
                  currentPage > 1 && handlePageChange(currentPage - 1)
                }
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-stone-200 text-stone-400 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* 页码 */}
              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-10 h-10 flex items-center justify-center text-stone-400 text-sm select-none"
                  >
                    ···
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={cn(
                      "w-10 h-10 rounded-full text-sm font-medium transition-all duration-200",
                      page === currentPage
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-[1.08]"
                        : "bg-white text-stone-500 border border-stone-200 hover:border-emerald-300 hover:text-emerald-700 hover:scale-105"
                    )}
                  >
                    {page}
                  </button>
                )
              )}

              {/* 下一页 */}
              <button
                onClick={() =>
                  currentPage < pagination.totalPages &&
                  handlePageChange(currentPage + 1)
                }
                disabled={currentPage === pagination.totalPages}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-stone-200 text-stone-400 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA 区域（升级版）── */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-stone-50 to-amber-50/30 border-t border-stone-100">
        {/* 背景装饰 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #059669 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
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
            {/* CTA 按钮：hover 时箭头 spring 弹性位移 */}
            <button className="group inline-flex items-center gap-2 bg-stone-900 hover:bg-emerald-800 text-white px-8 py-3.5 rounded-full font-medium transition-all duration-300 hover:shadow-xl hover:shadow-emerald-900/20 hover:-translate-y-0.5 active:scale-95">
              {copy.locations.ctaBtn}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1.5"
              />
            </button>
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
