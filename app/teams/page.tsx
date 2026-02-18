"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Users,
  Crown,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";

import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTeams } from "@/lib/teams-context";
import { locations } from "@/lib/data/mock";
import { cn } from "@/lib/utils";

// 状态映射
const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "招募中", color: "bg-emerald-100 text-emerald-700" },
  full: { label: "已满员", color: "bg-amber-100 text-amber-700" },
  closed: { label: "已结束", color: "bg-stone-100 text-stone-600" },
};

// 难度映射
const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "简单", color: "bg-emerald-100 text-emerald-700" },
  moderate: { label: "中等", color: "bg-amber-100 text-amber-700" },
  hard: { label: "困难", color: "bg-orange-100 text-orange-700" },
  extreme: { label: "极难", color: "bg-red-100 text-red-700" },
};

// 筛选选项
const filterOptions = {
  difficulty: [
    { id: "easy", label: "简单" },
    { id: "moderate", label: "中等" },
    { id: "hard", label: "困难" },
    { id: "extreme", label: "极难" },
  ],
  duration: [
    { id: "short", label: "半日内" },
    { id: "day", label: "一日" },
    { id: "multi", label: "多日" },
  ],
  location: locations.map((l) => ({ id: l.id, label: l.name })),
};

// Parse duration string and return category
const getDurationCategory = (duration: string): string => {
  const match = duration.match(/(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?/);
  if (!match) return "short";
  const maxHours = match[2] ? parseFloat(match[2]) : parseFloat(match[1]);
  if (maxHours <= 4) return "short";
  if (maxHours <= 10) return "day";
  return "multi";
};

export default function TeamsPage() {
  const { teams } = useTeams();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedFilters, setSelectedFilters] = React.useState<{
    difficulty: string[];
    duration: string[];
    location: string[];
  }>({
    difficulty: [],
    duration: [],
    location: [],
  });

  // Filter teams
  const filteredTeams = React.useMemo(() => {
    return teams.filter((team) => {
      const location = locations.find((l) => l.id === team.locationId);
      if (!location) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = team.title.toLowerCase().includes(query);
        const matchDesc = team.description.toLowerCase().includes(query);
        const matchLocation = location.name.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchLocation) return false;
      }

      // Difficulty filter
      if (selectedFilters.difficulty.length > 0) {
        if (!selectedFilters.difficulty.includes(location.difficulty)) {
          return false;
        }
      }

      // Duration filter
      if (selectedFilters.duration.length > 0) {
        const category = getDurationCategory(location.duration);
        if (!selectedFilters.duration.includes(category)) {
          return false;
        }
      }

      // Location filter
      if (selectedFilters.location.length > 0) {
        if (!selectedFilters.location.includes(team.locationId)) {
          return false;
        }
      }

      return true;
    });
  }, [teams, searchQuery, selectedFilters]);

  const toggleFilter = (category: keyof typeof selectedFilters, id: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [category]: prev[category].includes(id)
        ? prev[category].filter((item) => item !== id)
        : [...prev[category], id],
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({
      difficulty: [],
      duration: [],
      location: [],
    });
    setSearchQuery("");
  };

  const activeFiltersCount =
    selectedFilters.difficulty.length +
    selectedFilters.duration.length +
    selectedFilters.location.length;

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-stone-900 mb-2">探索队伍</h1>
            <p className="text-stone-600">
              发现志同道合的户外伙伴，一起探索深圳的山野
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 flex gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <Input
                placeholder="搜索队伍名称、描述或地点..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 border-stone-200"
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
            <Button
              variant="outline"
              className={cn(
                "h-12 px-4",
                showFilters && "bg-stone-100 border-stone-300"
              )}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              筛选
              {activeFiltersCount > 0 && (
                <span className="ml-2 text-xs bg-stone-900 text-white px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={false}
            animate={{
              height: showFilters ? "auto" : 0,
              opacity: showFilters ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              {/* Difficulty Filter */}
              <div>
                <span className="text-sm font-medium text-stone-700 mb-2 block">
                  难度
                </span>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.difficulty.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => toggleFilter("difficulty", option.id)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-full border transition-colors",
                        selectedFilters.difficulty.includes(option.id)
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Filter */}
              <div>
                <span className="text-sm font-medium text-stone-700 mb-2 block">
                  时长
                </span>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.duration.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => toggleFilter("duration", option.id)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-full border transition-colors",
                        selectedFilters.duration.includes(option.id)
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <span className="text-sm font-medium text-stone-700 mb-2 block">
                  地点
                </span>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.location.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => toggleFilter("location", option.id)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-full border transition-colors",
                        selectedFilters.location.includes(option.id)
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-stone-500 hover:text-stone-700 underline"
                >
                  清除全部筛选
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Teams List */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Results Count */}
          <div className="mb-4 text-sm text-stone-500">
            共 {filteredTeams.length} 个队伍
          </div>

          {filteredTeams.length === 0 ? (
            <Card className="border-dashed border-stone-300 bg-stone-50/50">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-stone-400" />
                </div>
                <h3 className="text-lg font-medium text-stone-900 mb-2">
                  没有找到匹配的队伍
                </h3>
                <p className="text-sm text-stone-500 mb-4">
                  尝试调整筛选条件或搜索关键词
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  清除筛选
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTeams.map((team, index) => {
                const location = locations.find((l) => l.id === team.locationId);
                if (!location) return null;

                const status = statusLabels[team.status];
                const difficulty = difficultyLabels[location.difficulty];

                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link href={`/teams/${team.id}`}>
                      <Card className="border-stone-200 hover:shadow-lg transition-all cursor-pointer group h-full">
                        <CardContent className="p-5">
                          <div className="flex gap-4">
                            {/* Location Image */}
                            <div
                              className="w-24 h-24 rounded-xl bg-cover bg-center flex-shrink-0"
                              style={{ backgroundImage: `url(${location.coverImage})` }}
                            />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-1">
                                    {team.title}
                                  </h3>
                                  <p className="text-sm text-stone-500 mt-1 flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {location.name}
                                  </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                              </div>

                              {/* Tags */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <Badge className={status.color}>
                                  {status.label}
                                </Badge>
                                <Badge className={difficulty.color}>
                                  {difficulty.label}
                                </Badge>
                              </div>

                              {/* Meta Info */}
                              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {team.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {team.time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  <span
                                    className={cn(
                                      team.currentMembers >= team.maxMembers
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                    )}
                                  >
                                    {team.currentMembers}/{team.maxMembers}人
                                  </span>
                                </span>
                              </div>

                              {/* Leader */}
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={team.leader.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {team.leader.name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-stone-600">
                                  领队: {team.leader.name}
                                </span>
                                {team.leader.level === "expert" && (
                                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
