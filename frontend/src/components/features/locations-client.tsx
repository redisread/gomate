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
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Sparkles,
  Zap,
  Sun,
  Award,
  SlidersHorizontal,
  ChevronDown,
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
  { label: string; color: string; bg: string; dot: string }
> = {
  easy:     { label: "轻松", color: "#059669", bg: "rgba(5,150,105,0.12)",  dot: "#059669" },
  moderate: { label: "适中", color: "#d97706", bg: "rgba(217,119,6,0.12)",  dot: "#d97706" },
  hard:     { label: "挑战", color: "#ea580c", bg: "rgba(234,88,12,0.12)",  dot: "#ea580c" },
  expert:   { label: "专家", color: "#dc2626", bg: "rgba(220,38,38,0.12)",  dot: "#dc2626" },
};

// ─── 标签颜色配置 ─────────────────────────────────────────────────────────────
const tagColorClasses = [
  "bg-emerald-50 text-emerald-700 border-emerald-100",
  "bg-amber-50 text-amber-700 border-amber-100",
  "bg-sky-50 text-sky-700 border-sky-100",
];

// ─── 骨架屏 ──────────────────────────────────────────────────────────────────
function ShimmerCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-stone-100">
      <div className="h-52 skeleton" />
      <div className="p-5 space-y-3">
        <div className="h-5 skeleton rounded-full w-2/3" />
        <div className="h-3.5 skeleton rounded-full w-1/3" />
        <div className="space-y-2 pt-1">
          <div className="h-3.5 skeleton rounded-full w-full" />
          <div className="h-3.5 skeleton rounded-full w-4/5" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-14 skeleton rounded-full" />
          <div className="h-6 w-16 skeleton rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── 地点卡片 ─────────────────────────────────────────────────────────────────
function LocationCard({ location, index }: { location: Location; index: number }) {
  const diff = location.difficulty ? difficultyConfig[location.difficulty] : null;
  const route = location.routes?.[0];
  const delayMs = Math.min(index, 5) * 60;

  return (
    <a
      href={`/locations/${location.id}`}
      className="group block"
      style={{ animation: `fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms both` }}
    >
      <article className="bg-white rounded-2xl overflow-hidden border border-stone-100 hover:border-amber-200/50 hover:shadow-xl hover:shadow-amber-100/40 hover:ring-1 hover:ring-amber-200/40 transition-all duration-300 hover:-translate-y-1">
        {/* 封面图 */}
        <div className="relative h-52 overflow-hidden bg-stone-100">
          {location.coverImage ? (
            <img
              src={location.coverImage}
              alt={location.name}
              className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
              <Mountain className="h-14 w-14 text-amber-400/60" />
            </div>
          )}

          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

          {/* 难度标签 */}
          {diff && (
            <div className="absolute top-3 left-3">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.92)", color: diff.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: diff.dot }} />
                {diff.label}
              </span>
            </div>
          )}

          {/* 城市标签 */}
          {location.cityName && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-black/35 text-white backdrop-blur-sm">
                <MapPin className="w-3 h-3" />
                {location.cityName}
              </span>
            </div>
          )}

          {/* 底部信息 */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-bold text-white text-lg leading-tight drop-shadow-sm">
              {location.name}
            </h3>
            {route && (
              <div className="flex items-center gap-3 mt-1.5 text-white/75 text-xs">
                {route.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {route.duration}
                  </span>
                )}
                {route.distance && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {route.distance}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-5">
          {/* 描述 */}
          <p className="text-stone-500 text-sm line-clamp-2 leading-relaxed mb-4">
            {location.description}
          </p>

          {/* 标签 */}
          {location.tags && location.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {location.tags.slice(0, 3).map((tag: Tag, i: number) => (
                <span
                  key={tag?.id ?? i}
                  className={cn("px-2.5 py-0.5 rounded-full text-xs border", tagColorClasses[i % tagColorClasses.length])}
                >
                  {typeof tag === "string" ? tag : tag?.name}
                </span>
              ))}
            </div>
          )}

          {/* 底部 CTA */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <span className="text-xs text-stone-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {location.address || location.cityName || copy.locations.defaultCity}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 group-hover:text-amber-500 transition-colors">
              查看详情
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </article>
    </a>
  );
}

// ─── 空状态 ──────────────────────────────────────────────────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center">
          <TreePine
            className="h-9 w-9 text-stone-400 motion-reduce:animate-none"
            style={{ animation: "float 3s ease-in-out infinite" }}
          />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-200" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-amber-200" />
      </div>
      <h3 className="text-lg font-semibold text-stone-700 mb-2">{copy.locations.emptyTitle}</h3>
      <p className="text-stone-400 text-sm text-center max-w-xs leading-relaxed mb-6">
        {copy.locations.emptyDesc}
      </p>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-md shadow-amber-200 hover:-translate-y-0.5 active:scale-95"
      >
        <Compass className="h-4 w-4" />
        {copy.locations.emptyBtn}
      </button>
    </div>
  );
}

// ─── 角色配置 ─────────────────────────────────────────────────────────────
type RoleKey = "explorer" | "weekend" | "veteran" | "";
const roleConfig: Record<
  Exclude<RoleKey, "">,
  { icon: React.ElementType; label: string; desc: string; difficulty: string; gradientFrom: string; gradientTo: string; iconColor: string; activeColor: string }
> = {
  explorer: {
    icon: Zap,
    label: copy.locations.roleExplorer,
    desc: copy.locations.roleExplorerDesc,
    difficulty: "hard",
    gradientFrom: "rgba(249,115,22,0.10)",
    gradientTo: "rgba(239,68,68,0.08)",
    iconColor: "#ea580c",
    activeColor: "#ea580c",
  },
  weekend: {
    icon: Sun,
    label: copy.locations.roleWeekend,
    desc: copy.locations.roleWeekendDesc,
    difficulty: "easy",
    gradientFrom: "rgba(16,185,129,0.10)",
    gradientTo: "rgba(20,184,166,0.08)",
    iconColor: "#059669",
    activeColor: "#059669",
  },
  veteran: {
    icon: Award,
    label: copy.locations.roleVeteran,
    desc: copy.locations.roleVeteranDesc,
    difficulty: "expert",
    gradientFrom: "rgba(139,92,246,0.10)",
    gradientTo: "rgba(99,102,241,0.08)",
    iconColor: "#7c3aed",
    activeColor: "#7c3aed",
  },
};

// ─── 主组件 ─────────────────────────────────────────────────────────────────
export function LocationsClient() {
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
  const [selectedDifficulty, setSelectedDifficulty] = React.useState("");
  const [activeRole, setActiveRole] = React.useState<RoleKey>("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = React.useState(false);
  const [gridFading, setGridFading] = React.useState(false);
  const cityDropdownRef = React.useRef<HTMLDivElement>(null);
  const difficultyDropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // URL 参数初始化
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const tags = params.get("tags")?.split(",").filter(Boolean) || [];
    const page = parseInt(params.get("page") || "1", 10);
    const cityId = params.get("cityId") || "";
    const difficulty = params.get("difficulty") || "";
    setSearchQuery(q);
    setSelectedTags(tags);
    setCurrentPage(page);
    setSelectedCityId(cityId);
    setSelectedDifficulty(difficulty);
    loadLocations({ page, search: q, tagIds: tags, cityId, difficulty });
  }, []);

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

  // 点击外部关闭
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
      if (difficultyDropdownRef.current && !difficultyDropdownRef.current.contains(e.target as Node)) {
        setShowDifficultyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadLocations = React.useCallback(
    async (params: { page?: number; search?: string; tagIds?: string[]; cityId?: string; difficulty?: string }) => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams();
        if (params.page) query.set("page", params.page.toString());
        query.set("pageSize", "12");
        if (params.search) query.set("search", params.search);
        if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));
        if (params.cityId) query.set("cityId", params.cityId);
        if (params.difficulty) query.set("difficulty", params.difficulty);
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

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadLocations({ page: 1, search: searchQuery, tagIds: selectedTags, cityId: selectedCityId, difficulty: selectedDifficulty });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTags, selectedCityId, selectedDifficulty, loadLocations]);

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
    setShowFilters(false);
  };

  const handleDifficultySelect = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
    setCurrentPage(1);
    setShowDifficultyDropdown(false);
    setActiveRole("");
  };

  const handleRoleSelect = (role: RoleKey) => {
    if (role === activeRole) {
      setActiveRole("");
      setSelectedDifficulty("");
    } else {
      setActiveRole(role);
      if (role !== "") {
        setSelectedDifficulty(roleConfig[role].difficulty);
      }
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setGridFading(true);
    setCurrentPage(page);
    loadLocations({ page, search: searchQuery, tagIds: selectedTags, cityId: selectedCityId, difficulty: selectedDifficulty });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedCityId("");
    setSelectedDifficulty("");
    setActiveRole("");
    setCurrentPage(1);
  };

  const selectedCityName = cities.find((c) => c.id === selectedCityId)?.name;
  const selectedDifficultyLabel = selectedDifficulty ? difficultyConfig[selectedDifficulty]?.label : "";
  const hasActiveFilters = searchQuery || selectedTags.length > 0 || selectedCityId || selectedDifficulty;
  const activeFilterCount = selectedTags.length + (selectedCityId ? 1 : 0) + (selectedDifficulty ? 1 : 0);

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
    <main className="min-h-screen bg-[#f8f7f5]">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-10 bg-white border-b border-stone-100">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-50/60 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-stone-50/80 blur-2xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 徽章 */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium"
            style={{
              background: "rgba(217,119,6,0.08)",
              border: "1px solid rgba(217,119,6,0.2)",
              color: "#b45309",
              animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            <Sparkles className="h-3 w-3" />
            {copy.locations.ctaHeroBadge}
          </div>

          {/* 标题 */}
          <h1
            className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2 leading-tight"
            style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 80ms both" }}
          >
            {copy.locations.pageTitle}
          </h1>
          <p
            className="text-stone-400 text-sm sm:text-base mb-7 leading-relaxed max-w-xl"
            style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 150ms both" }}
          >
            {copy.locations.heroTagline}
          </p>

          {/* ── 角色快速入口 ── */}
          <div
            className="grid grid-cols-3 gap-3 mb-6"
            style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 190ms both" }}
          >
            {(Object.entries(roleConfig) as [Exclude<RoleKey, "">, typeof roleConfig[keyof typeof roleConfig]][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = activeRole === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleSelect(key)}
                  className="relative flex flex-col items-start gap-1 px-4 py-3 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] overflow-hidden"
                  style={
                    isActive
                      ? { background: cfg.activeColor, borderColor: cfg.activeColor, boxShadow: `0 4px 14px ${cfg.activeColor}40` }
                      : { background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`, borderColor: "rgba(231,229,228,1)" }
                  }
                >
                  <div className="relative flex items-center gap-2 w-full">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)" }}
                    >
                      <Icon
                        className="h-3.5 w-3.5"
                        style={{ color: isActive ? "#fff" : cfg.iconColor }}
                      />
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: isActive ? "#fff" : "#1c1917" }}
                    >
                      {cfg.label}
                    </span>
                    {isActive && (
                      <span className="ml-auto w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.25)" }}>
                        <X className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                  </div>
                  <p
                    className="relative text-xs leading-tight pl-9"
                    style={{ color: isActive ? "rgba(255,255,255,0.8)" : "#a8a29e" }}
                  >
                    {cfg.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* ── 搜索框 ── */}
          <div
            className="relative"
            style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both" }}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={copy.locations.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-12 py-3.5 bg-stone-50 text-stone-800 placeholder-stone-400 border border-stone-200 rounded-2xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 transition-all duration-200 text-sm shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="h-3.5 w-3.5 text-stone-400" />
              </button>
            )}
          </div>

          {/* ── 筛选栏 ── */}
          <div
            className="mt-3 relative"
            style={{ animation: "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 290ms both" }}
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {/* 城市筛选 */}
              {cities.length > 0 && (
                <div className="relative flex-shrink-0" ref={cityDropdownRef}>
                  <button
                    type="button"
                    onClick={() => { setShowFilters((v) => !v); setShowDifficultyDropdown(false); }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                      selectedCityId
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700"
                    )}
                  >
                    <MapPin className="w-3 h-3" />
                    {selectedCityName || copy.locations.allCities}
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showFilters && "rotate-180")} />
                  </button>

                  {showFilters && (
                    <div
                      className="absolute top-full mt-1.5 left-0 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-[200] min-w-[140px] max-h-60 overflow-y-auto py-1 origin-top"
                      style={{ animation: "scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) both" }}
                    >
                      <button
                        type="button"
                        onClick={() => handleCitySelect("")}
                        className={cn(
                          "w-full flex items-center gap-2 px-3.5 py-2 text-xs transition-colors",
                          !selectedCityId ? "text-amber-600 bg-amber-50" : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                        )}
                      >
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {copy.locations.allCities}
                      </button>
                      {cities.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => handleCitySelect(city.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3.5 py-2 text-xs transition-colors",
                            selectedCityId === city.id ? "text-amber-600 bg-amber-50" : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                          )}
                        >
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {city.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 难度筛选 */}
              <div className="relative flex-shrink-0" ref={difficultyDropdownRef}>
                <button
                  type="button"
                  onClick={() => { setShowDifficultyDropdown((v) => !v); setShowFilters(false); }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                    selectedDifficulty
                      ? "text-white border-transparent shadow-sm"
                      : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700"
                  )}
                  style={selectedDifficulty ? { background: difficultyConfig[selectedDifficulty]?.dot, borderColor: difficultyConfig[selectedDifficulty]?.dot } : {}}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  {selectedDifficultyLabel || copy.locations.difficultyFilter}
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showDifficultyDropdown && "rotate-180")} />
                </button>

                {showDifficultyDropdown && (
                  <div
                    className="absolute top-full mt-1.5 left-0 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-[200] min-w-[130px] py-1 origin-top"
                    style={{ animation: "scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) both" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleDifficultySelect("")}
                      className={cn(
                        "w-full flex items-center gap-2 px-3.5 py-2 text-xs transition-colors",
                        !selectedDifficulty ? "text-amber-600 bg-amber-50" : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                      )}
                    >
                      {copy.locations.allDifficulty}
                    </button>
                    {Object.entries(difficultyConfig).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDifficultySelect(key)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors",
                          selectedDifficulty === key ? "bg-stone-50" : "hover:bg-stone-50"
                        )}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                        <span style={{ color: selectedDifficulty === key ? cfg.color : undefined }} className={selectedDifficulty === key ? "font-medium" : "text-stone-600"}>
                          {cfg.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 分隔线 */}
              <div className="flex-shrink-0 w-px h-4 bg-stone-200" />

              {/* 标签 */}
              {popularTags.slice(0, 8).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 text-xs rounded-full border transition-all duration-200 active:scale-95",
                    selectedTags.includes(tag.id)
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700"
                  )}
                >
                  {tag.name}
                </button>
              ))}

              {/* 清除筛选 */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors rounded-full"
                >
                  <X className="w-3 h-3" />
                  清除
                </button>
              )}
            </div>
            {/* 右侧渐变遮罩 */}
            <div className="absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── 内容区 ── */}
      <section className="py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* 结果栏 */}
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="h-4 w-28 bg-stone-200 rounded-full animate-pulse" />
              ) : (
                <p className="text-sm text-stone-500">
                  共{" "}
                  <span className="font-bold text-stone-800 text-base">
                    {pagination.total}
                  </span>{" "}
                  {copy.locations.resultCount}
                </p>
              )}

              {/* 活跃筛选 badges */}
              {!isLoading && (selectedCityId || selectedTags.length > 0 || selectedDifficulty) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedCityId && selectedCityName && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      <MapPin className="w-3 h-3" />
                      {selectedCityName}
                      <button onClick={() => handleCitySelect("")} className="hover:text-amber-900 transition-colors ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedDifficulty && selectedDifficultyLabel && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border"
                      style={{
                        background: difficultyConfig[selectedDifficulty]?.bg,
                        color: difficultyConfig[selectedDifficulty]?.color,
                        borderColor: `${difficultyConfig[selectedDifficulty]?.dot}30`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: difficultyConfig[selectedDifficulty]?.dot }} />
                      {selectedDifficultyLabel}
                      <button onClick={() => handleDifficultySelect("")} className="hover:opacity-70 transition-opacity ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedTags.map((tagId) => {
                    const tag = popularTags.find((t) => t.id === tagId);
                    return (
                      <span key={tagId} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                        {tag?.name || tagId}
                        <button onClick={() => handleTagToggle(tagId)} className="hover:text-stone-900 transition-colors ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {hasActiveFilters && !isLoading && (
              <button
                onClick={handleClearAll}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-stone-100"
              >
                <X className="h-3.5 w-3.5" />
                {copy.locations.clearFilter}
              </button>
            )}
          </div>

          {/* 卡片网格 */}
          <div
            className="transition-opacity duration-200"
            style={{ opacity: gridFading ? 0 : 1 }}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <ShimmerCard key={i} />)}
              </div>
            ) : locations.length === 0 ? (
              <EmptyState onClear={handleClearAll} />
            ) : (
              <div key={gridKey} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {locations.map((location, index) => (
                  <LocationCard key={location.id} location={location} index={index} />
                ))}
              </div>
            )}
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 mt-12">
              <button
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`e-${idx}`} className="w-9 h-9 flex items-center justify-center text-stone-400 text-sm">···</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={cn(
                      "w-9 h-9 rounded-xl text-sm font-medium transition-all duration-200",
                      page === currentPage
                        ? "bg-stone-900 text-white shadow-sm"
                        : "bg-white text-stone-500 border border-stone-200 hover:border-stone-300 hover:text-stone-700"
                    )}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() => currentPage < pagination.totalPages && handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-16 border-t border-stone-200 overflow-hidden">
        {/* 背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #78716c 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
        {/* 装饰图标 */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 opacity-[0.06]">
          <Compass className="h-32 w-32 text-stone-600" />
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-[0.06]">
          <TreePine className="h-32 w-32 text-stone-600" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5 border border-amber-100">
            <Mountain className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-3">{copy.locations.ctaTitle}</h2>
          <p className="text-stone-500 text-sm mb-7 max-w-sm mx-auto leading-relaxed">{copy.locations.ctaDesc}</p>
          <a href="/contact">
            <button className="group inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-7 py-3 rounded-full text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-amber-200">
              {copy.locations.ctaBtn}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1" />
            </button>
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
