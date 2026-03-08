"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Hero } from "@/app/components/features/hero";
import { SearchBar } from "@/app/components/features/search-bar";
import { Filter } from "@/components/features/filter";
import { LocationCard } from "@/app/components/features/location-card";
import { Pagination } from "@/app/components/features/pagination";
import { Button } from "@/components/ui/button";
import { useLocations } from "@/lib/locations-context";
import { useTeams } from "@/lib/teams-context";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";
import type { Location, Tag } from "@/lib/types";
import { getUserDisplayName } from "@/lib/user-utils";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { teams } = useTeams();
  const { locations } = useLocations();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  // 首页地点列表独立状态
  const [homeLocations, setHomeLocations] = React.useState<Location[]>([]);
  const [homePagination, setHomePagination] = React.useState({
    page: 1,
    pageSize: 9,
    total: 0,
    totalPages: 0,
  });
  const [homeIsLoading, setHomeIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedCityId, setSelectedCityId] = React.useState("");
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);

  // 搜索处理：跳转到 locations 页面
  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/locations?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/locations");
    }
  };

  // 聚合城市数据（从全局 Context 的全量数据中聚合）
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

  // 从所有 locations 聚合唯一标签，生成标签筛选分组
  const tagFilterGroup = React.useMemo(() => {
    const tagMap = new Map<string, Tag>();
    locations.forEach((location) => {
      (location.tags as Tag[] ?? []).forEach((tag) => {
        if (tag?.id && !tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
    });
    const tags = Array.from(tagMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "zh")
    );
    if (tags.length === 0) return null;
    return {
      id: "tag",
      label: "标签",
      options: tags.map((t) => ({ id: t.id, label: t.name })),
    };
  }, [locations]);

  // 供 Filter 组件使用的已选筛选项
  const selectedFilters = React.useMemo(
    () => ({
      city: selectedCityId ? [selectedCityId] : [],
      tag: selectedTagIds,
    }),
    [selectedCityId, selectedTagIds]
  );

  // 获取首页地点列表（后端分页+筛选）
  const fetchHomeLocations = React.useCallback(
    async (params: { page: number; cityId?: string; tagIds?: string[] }) => {
      setHomeIsLoading(true);
      try {
        const query = new URLSearchParams();
        query.set("page", params.page.toString());
        query.set("pageSize", "9");
        if (params.cityId) query.set("cityId", params.cityId);
        if (params.tagIds?.length) query.set("tagIds", params.tagIds.join(","));
        const res = await fetch(`/api/locations?${query}`);
        const data = await res.json();
        if (data.success) {
          setHomeLocations(data.locations);
          setHomePagination(data.pagination);
        }
      } finally {
        setHomeIsLoading(false);
      }
    },
    []
  );

  // 初始加载
  React.useEffect(() => {
    fetchHomeLocations({ page: 1 });
  }, [fetchHomeLocations]);

  const handleFilterChange = (groupId: string, optionId: string) => {
    if (groupId === "clear") {
      setSelectedCityId("");
      setSelectedTagIds([]);
      setCurrentPage(1);
      fetchHomeLocations({ page: 1 });
      return;
    }

    if (groupId === "city") {
      const newCityId = selectedCityId === optionId ? "" : optionId;
      setSelectedCityId(newCityId);
      setCurrentPage(1);
      fetchHomeLocations({ page: 1, cityId: newCityId, tagIds: selectedTagIds });
    }

    if (groupId === "tag") {
      const newTagIds = selectedTagIds.includes(optionId)
        ? selectedTagIds.filter((t) => t !== optionId)
        : [...selectedTagIds, optionId];
      setSelectedTagIds(newTagIds);
      setCurrentPage(1);
      fetchHomeLocations({ page: 1, cityId: selectedCityId, tagIds: newTagIds });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchHomeLocations({ page, cityId: selectedCityId, tagIds: selectedTagIds });
    document.getElementById("locations")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Search & Filter Section */}
      <section id="locations" className="py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
              {copy.locations.pageTitle}
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              {copy.locations.pageSubtitle}
            </p>
          </motion.div>

          {/* Search Bar */}
          <SearchBar
            className="mb-6"
            onSearch={handleSearch}
            onFilterClick={() => setIsFilterOpen(true)}
          />

          {/* Filter */}
          <div className="mb-8">
            <Filter
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              cities={cityList}
              extraGroups={tagFilterGroup ? [tagFilterGroup] : []}
            />
          </div>

          {/* Locations Grid */}
          {homeIsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-2xl bg-stone-100 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {homeLocations.map((location, index) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {homeLocations.length > 0 && homePagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={homePagination.totalPages}
                totalItems={homePagination.total}
                pageSize={homePagination.pageSize}
                onPageChange={handlePageChange}
              />
            </div>
          )}

          {/* View All Button */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Button
              variant="outline"
              size="lg"
              className="border-stone-300 hover:bg-stone-50"
              asChild
            >
              <Link href="/locations">
                {copy.common.viewAll}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Teams Section */}
      <section id="teams" className="py-12 lg:py-16 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
              {copy.teams.pageTitle}
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              {copy.teams.pageSubtitle}
            </p>
          </motion.div>

          {/* Featured Teams */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams
              .filter((t) => t.status === "recruiting")
              .slice(0, 4)
              .map((team, index) => {
                const location = locations.find((l) => l.id === team.locationId);
                if (!location) return null;

                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Link href={`/teams/${team.id}`}>
                      <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg transition-all duration-300 group">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <MapPin className="h-8 w-8 text-stone-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-1">
                              {team.title}
                            </h3>
                            <p className="text-sm text-stone-500 mt-1">
                              {location.name} · {team.date}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-sm text-stone-600">
                              <span>
                                {team.currentMembers}/{team.maxMembers}人
                              </span>
                              <span className="text-stone-300">|</span>
                              <span>领队: {getUserDisplayName(team.leader)}</span>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-stone-400 group-hover:text-stone-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
          </div>

          {/* View All Teams Button */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Button
              variant="outline"
              size="lg"
              className="border-stone-300 hover:bg-white"
              asChild
            >
              <Link href="/teams">
                {copy.common.viewAll}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-stone-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {copy.hero.titleLine1}，{copy.hero.titleLine2}
            </h2>
            <p className="text-stone-400 text-lg mb-8 max-w-2xl mx-auto">
              {copy.hero.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/teams/create" className="inline-block">
                  <Button
                    size="lg"
                    className="bg-white text-stone-900 hover:bg-stone-100 px-8 w-full sm:w-auto"
                  >
                    {copy.hero.createTeamBtn}
                  </Button>
                </Link>
              ) : (
                <Link href="/login" className="inline-block">
                  <Button
                    size="lg"
                    className="bg-white text-stone-900 hover:bg-stone-100 px-8 w-full sm:w-auto"
                  >
                    {copy.hero.loginRegisterBtn}
                  </Button>
                </Link>
              )}
              <a href="#locations" className="inline-block">
                <Button
                  size="lg"
                  className="bg-white text-stone-900 hover:bg-stone-100 px-8 w-full sm:w-auto"
                >
                  {copy.hero.exploreBtn}
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
