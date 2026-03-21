"use client";

import * as React from "react";
import { Search, MapPin, Calendar, Clock, Users, ChevronRight, X, Filter } from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// 状态标签
const statusLabels: Record<string, { label: string; color: string }> = {
  recruiting: { label: "招募中", color: "bg-emerald-100 text-emerald-700" },
  full: { label: "已满员", color: "bg-amber-100 text-amber-700" },
  ongoing: { label: "进行中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-stone-100 text-stone-600" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-700" },
};

// 难度标签
const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "简单", color: "bg-emerald-100 text-emerald-700" },
  moderate: { label: "中等", color: "bg-amber-100 text-amber-700" },
  hard: { label: "困难", color: "bg-orange-100 text-orange-700" },
  expert: { label: "专家", color: "bg-red-100 text-red-700" },
};

const difficultyOptions = [
  { id: "easy", label: "简单" },
  { id: "moderate", label: "中等" },
  { id: "hard", label: "困难" },
  { id: "expert", label: "专家" },
];

/**
 * 队伍列表页客户端组件 - React Island
 */
export function TeamsClient() {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    totalPages: 0,
    pageSize: 12,
  });
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string[]>([]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const page = parseInt(params.get("page") || "1", 10);
    setSearchQuery(q);
    setCurrentPage(page);
    loadTeams({ page, search: q });
  }, []);

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadTeams({ page: 1, search: searchQuery, difficulty: selectedDifficulty });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedDifficulty]);

  const loadTeams = React.useCallback(
    async (params: { page?: number; search?: string; difficulty?: string[] }) => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams();
        query.set("status", "recruiting");
        if (params.page) query.set("page", params.page.toString());
        query.set("pageSize", "12");
        if (params.search) query.set("search", params.search);
        if (params.difficulty?.length) query.set("difficulty", params.difficulty.join(","));

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

  const handleDifficultyToggle = (id: string) => {
    const next = selectedDifficulty.includes(id)
      ? selectedDifficulty.filter((d) => d !== id)
      : [...selectedDifficulty, id];
    setSelectedDifficulty(next);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadTeams({ page, search: searchQuery, difficulty: selectedDifficulty });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSelectedDifficulty([]);
    setSearchQuery("");
    setCurrentPage(1);
  };

  const activeFiltersCount = selectedDifficulty.length;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">{copy.teams.pageTitle}</h1>
          <p className="text-stone-600">{copy.teams.pageSubtitle}</p>

          {/* Search + Filter */}
          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="text"
                placeholder="搜索队伍名称、描述或地点..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 text-stone-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-stone-400 hover:text-stone-600" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 border rounded-xl font-medium transition-colors",
                showFilters
                  ? "bg-stone-100 border-stone-300 text-stone-900"
                  : "border-stone-200 text-stone-700 hover:bg-stone-50"
              )}
            >
              <Filter className="h-4 w-4" />
              筛选
              {activeFiltersCount > 0 && (
                <span className="text-xs bg-stone-900 text-white px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-stone-100 space-y-4">
              <div>
                <span className="text-sm font-medium text-stone-700 mb-2 block">难度</span>
                <div className="flex flex-wrap gap-2">
                  {difficultyOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleDifficultyToggle(opt.id)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-full border transition-colors",
                        selectedDifficulty.includes(opt.id)
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-stone-500 hover:text-stone-700 underline"
                >
                  清除全部筛选
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Teams List */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 text-sm text-stone-500">共 {pagination.total} 个队伍</div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-16">
              <Search className="h-12 w-12 text-stone-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-stone-900 mb-2">没有找到匹配的队伍</h3>
              <p className="text-sm text-stone-500 mb-4">尝试调整筛选条件或搜索关键词</p>
              <button
                onClick={clearFilters}
                className="border border-stone-200 hover:bg-stone-50 text-stone-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                清除筛选
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => {
                const status = statusLabels[team.status] || { label: team.status, color: "bg-stone-100 text-stone-600" };
                return (
                  <a key={team.id} href={`/teams/${team.id}`}>
                    <div className="bg-white rounded-2xl border border-stone-200 hover:shadow-lg transition-all cursor-pointer group p-5">
                      <div className="flex gap-4">
                        {/* Location Image */}
                        {(team as any).location?.coverImage && (
                          <div
                            className="w-24 h-24 rounded-xl bg-cover bg-center flex-shrink-0"
                            style={{ backgroundImage: `url(${(team as any).location.coverImage})` }}
                          />
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-1">
                                {team.title}
                              </h3>
                              {(team as any).location?.name && (
                                <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {(team as any).location.name}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </div>

                          {/* Status + Difficulty Badges */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                            {(team as any).location?.difficulty && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyLabels[(team as any).location.difficulty]?.color || "bg-stone-100 text-stone-600"}`}>
                                {difficultyLabels[(team as any).location.difficulty]?.label}
                              </span>
                            )}
                          </div>

                          {/* Meta */}
                          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {team.date}
                            </span>
                            {team.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {team.time}
                              </span>
                            )}
                            <span
                              className={cn(
                                "flex items-center gap-1",
                                team.currentMembers >= team.maxMembers ? "text-amber-600" : "text-emerald-600"
                              )}
                            >
                              <Users className="h-4 w-4" />
                              {team.currentMembers}/{team.maxMembers}人
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
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

          {/* CTA */}
          <div className="text-center mt-12">
            <h2 className="text-2xl font-bold text-stone-900 mb-3">{copy.teams.ctaTitle}</h2>
            <p className="text-stone-600 mb-6">{copy.teams.ctaDesc}</p>
            <a href="/teams/create">
              <button className="bg-stone-900 hover:bg-stone-800 text-white px-8 py-3 rounded-lg font-medium transition-colors">
                {copy.teams.createBtn}
              </button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
