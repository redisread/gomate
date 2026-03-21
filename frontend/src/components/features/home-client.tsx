"use client";

import * as React from "react";
import { MapPin, ArrowRight, Search, Mountain } from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Location, Team } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";

/**
 * 首页客户端组件 - React Island
 * 视觉规范：GoMate Design System v2.0
 *  - Hero：温暖多层渐变背景 + 搜索栏 shadow-brand-glow focus
 *  - 地点卡片：card-interactive hover 上浮 + 品牌光晕
 *  - 队伍卡片：左侧品牌色图标区 + 进度感
 *  - CTA Section：品牌深色底 + coral 强调色按钮
 */
export function HomeClient() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pagination, setPagination] = React.useState({
    total: 0,
    totalPages: 0,
    pageSize: 9,
  });

  const fetchLocations = React.useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/locations?page=${page}&pageSize=9`);
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
        setPagination(data.pagination);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTeams = React.useCallback(async () => {
    try {
      const res = await fetchAPI("/api/teams?status=recruiting&pageSize=4");
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchLocations(1);
    fetchTeams();
  }, [fetchLocations, fetchTeams]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      window.location.href = `/locations?q=${encodeURIComponent(query.trim())}`;
    } else {
      window.location.href = "/locations";
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* ================================================================
          Hero Section — 温暖多层渐变 + 品牌搜索栏
          ================================================================ */}
      <section className="relative min-h-[640px] flex items-center justify-center overflow-hidden pt-16">
        {/* 背景渐变：从 primary-50 → warm-accent → neutral-50 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, #f0faf8 0%, rgba(255,122,101,0.08) 40%, #faf8f5 75%, #f2ede7 100%)",
          }}
        />
        {/* SVG 山脉装饰（极低透明度） */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full"
          style={{ opacity: 0.06 }}
          viewBox="0 0 1440 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M0 320L120 240L240 280L360 180L480 240L600 140L720 200L840 100L960 160L1080 60L1200 120L1320 40L1440 100V320H0Z"
            fill="#249a87"
          />
          <path
            d="M0 320L180 260L360 300L540 220L720 280L900 180L1080 240L1260 160L1440 220V320H0Z"
            fill="#3fb5a0"
          />
        </svg>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-20">
          {/* 徽章 */}
          <span
            className="inline-block mb-6 px-4 py-1.5 text-sm font-medium rounded-full border"
            style={{
              background: "rgba(36,154,135,0.08)",
              borderColor: "rgba(36,154,135,0.25)",
              color: "#1a6459",
            }}
          >
            <Mountain className="inline-block h-3.5 w-3.5 mr-1.5 -mt-0.5" />
            {copy.hero.badge}
          </span>

          {/* 主标题 */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4 text-foreground">
            {copy.hero.titleLine1}
            <br />
            <span className="text-gradient-brand">{copy.hero.titleLine2}</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {copy.hero.description}
          </p>

          {/* 搜索栏 */}
          <div
            className="relative max-w-lg mx-auto mb-8 group"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-brand" />
            <input
              type="text"
              placeholder={copy.common.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(searchQuery);
              }}
              className="w-full pl-12 pr-16 py-4 bg-white/90 backdrop-blur-sm border border-border rounded-2xl text-foreground placeholder:text-muted-foreground text-base transition-all duration-250 focus:outline-none"
              style={{
                boxShadow: "0 2px 8px rgba(30,24,18,0.06)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 18px rgba(36,154,135,0.22), 0 0 0 3px rgba(36,154,135,0.12)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(30,24,18,0.06)";
              }}
            />
            <button
              onClick={() => handleSearch(searchQuery)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-1.5 text-sm font-medium rounded-xl text-brand-foreground bg-brand hover:bg-brand/90 transition-colors duration-150"
              style={{ boxShadow: "0 2px 8px rgba(36,154,135,0.25)" }}
            >
              搜索
            </button>
          </div>

          {/* CTA 按钮组 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/locations">
              <button className="px-7 py-3 text-brand-foreground font-semibold rounded-full bg-brand hover:bg-brand/90 transition-all duration-150 shadow-brand-glow hover:shadow-brand-glow-lg">
                {copy.hero.exploreBtn}
              </button>
            </a>
            <a href="/teams">
              <button
                className="px-7 py-3 font-semibold rounded-full border-2 transition-all duration-150"
                style={{
                  borderColor: "rgba(36,154,135,0.4)",
                  color: "#1a6459",
                }}
              >
                {copy.hero.findTeamBtn}
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================
          热门地点 Section
          ================================================================ */}
      <section id="locations" className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 标题区 */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              {copy.locations.pageTitle}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {copy.locations.pageSubtitle}
            </p>
          </div>

          {/* 地点卡片网格 */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="skeleton h-64 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <a key={location.id} href={`/locations/${location.id}`}>
                  <div className="card-interactive overflow-hidden group">
                    {/* 封面图 */}
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {location.coverImage ? (
                        <img
                          src={location.coverImage}
                          alt={location.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-muted">
                          <Mountain className="h-12 w-12 text-brand/30" />
                        </div>
                      )}
                      {/* 渐变遮罩 */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* 内容区 */}
                    <div className="p-5">
                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-brand transition-colors duration-150">
                        {location.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        {location.address || copy.locations.defaultCity}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {location.description}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => {
                      setCurrentPage(page);
                      fetchLocations(page);
                    }}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all duration-150 ${
                      page === currentPage
                        ? "bg-brand text-brand-foreground shadow-brand-glow"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-brand"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          )}

          <div className="text-center mt-10">
            <a href="/locations">
              <button className="border border-border hover:bg-accent text-foreground hover:text-brand px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 inline-flex items-center gap-2">
                {copy.common.viewAll}
                <ArrowRight className="h-4 w-4" />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================
          近期队伍 Section
          ================================================================ */}
      <section id="teams" className="py-16 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              {copy.teams.pageTitle}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {copy.teams.pageSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {teams.map((team) => {
              const fillRatio = team.maxMembers > 0
                ? Math.round((team.currentMembers / team.maxMembers) * 100)
                : 0;
              const isFull = team.currentMembers >= team.maxMembers;

              return (
                <a key={team.id} href={`/teams/${team.id}`}>
                  <div className="card-interactive p-5 group">
                    <div className="flex items-start gap-4">
                      {/* 品牌色图标区 */}
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(36,154,135,0.10)" }}
                      >
                        <Mountain className="h-7 w-7 text-brand" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-brand line-clamp-1 transition-colors duration-150 mb-0.5">
                          {team.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {team.date}
                        </p>
                        {/* 人数进度条 */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${fillRatio}%`,
                                background: isFull ? "#ff7a65" : "#249a87",
                              }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${isFull ? "text-warm" : "text-brand"}`}>
                            {team.currentMembers}/{team.maxMembers}人
                          </span>
                        </div>
                      </div>

                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-brand group-hover:translate-x-1 transition-all duration-150 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <a href="/teams">
              <button className="border border-border hover:bg-accent text-foreground hover:text-brand px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 inline-flex items-center gap-2">
                {copy.common.viewAll}
                <ArrowRight className="h-4 w-4" />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================
          底部 CTA Section — 品牌深色底 + coral 强调色
          ================================================================ */}
      <section
        className="py-24"
        style={{
          background: "linear-gradient(135deg, #1a6459 0%, #249a87 50%, #3fb5a0 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            {copy.hero.titleLine1}，{copy.hero.titleLine2}
          </h2>
          <p className="text-white/75 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            {copy.hero.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/teams/create">
              <button
                className="px-8 py-3.5 font-semibold rounded-full transition-all duration-150 text-white"
                style={{
                  background: "#ff7a65",
                  boxShadow: "0 4px 18px rgba(255,122,101,0.40)",
                }}
              >
                {copy.hero.createTeamBtn}
              </button>
            </a>
            <a href="#locations">
              <button className="px-8 py-3.5 border-2 border-white/60 text-white font-semibold rounded-full hover:bg-white/10 transition-all duration-150">
                {copy.hero.exploreBtn}
              </button>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
