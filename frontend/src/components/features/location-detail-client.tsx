"use client";

import * as React from "react";
import { MapPin, Share2, ArrowRight, Mountain, Clock, Users } from "lucide-react";
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

interface LocationDetailClientProps {
  locationId: string;
}

/**
 * 地点详情页客户端组件 - React Island
 */
export function LocationDetailClient({ locationId }: LocationDetailClientProps) {
  const [location, setLocation] = React.useState<Location | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [teams, setTeams] = React.useState<any[]>([]);
  const [relatedLocations, setRelatedLocations] = React.useState<Location[]>([]);

  React.useEffect(() => {
    loadLocation();
  }, [locationId]);

  const loadLocation = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/locations/${locationId}`);
      const data = await res.json();
      if (data.success && data.location) {
        setLocation(data.location);
        // 加载该地点的队伍
        loadTeams(data.location.id);
        // 加载推荐地点
        loadRelatedLocations();
      } else {
        setError("地点不存在");
      }
    } catch {
      setError("加载失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = async (locId: string) => {
    try {
      const res = await fetchAPI(`/api/teams?locationId=${locId}&status=recruiting&pageSize=5`);
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch {}
  };

  const loadRelatedLocations = async () => {
    try {
      const res = await fetchAPI("/api/locations?pageSize=4");
      const data = await res.json();
      if (data.success) {
        setRelatedLocations(
          (data.locations || []).filter((l: Location) => l.id !== locationId).slice(0, 3)
        );
      }
    } catch {}
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="h-64 bg-stone-200 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-48 bg-stone-200 rounded-2xl animate-pulse" />
              <div className="h-32 bg-stone-200 rounded-2xl animate-pulse" />
            </div>
            <div className="h-64 bg-stone-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !location) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900 mb-2">{error || "地点不存在"}</h1>
            <a href="/locations" className="text-stone-600 hover:text-stone-900 underline">
              返回地点列表
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const diffInfo = difficultyLabels[location.difficulty] || { label: location.difficulty, color: "bg-stone-100 text-stone-700" };

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Cover Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden bg-stone-900">
        {location.coverImage && (
          <img
            src={location.coverImage}
            alt={location.name}
            className="w-full h-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${diffInfo.color}`}>
                {diffInfo.label}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">{location.name}</h1>
            {location.subtitle && (
              <p className="text-stone-300 text-lg">{location.subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-stone-900">地点介绍</h2>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: location.name, url: window.location.href });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert("链接已复制");
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  分享
                </button>
              </div>
              <p className="text-stone-600 leading-relaxed">{location.description}</p>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h2 className="text-xl font-semibold text-stone-900 mb-4">基本信息</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mountain className="h-5 w-5 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">难度</p>
                    <p className="font-medium text-stone-900">{diffInfo.label}</p>
                  </div>
                </div>
                {location.duration && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-stone-600" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">时长</p>
                      <p className="font-medium text-stone-900">{location.duration}</p>
                    </div>
                  </div>
                )}
                {location.address && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-stone-600" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">位置</p>
                      <p className="font-medium text-stone-900 text-sm">{location.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {location.tags && location.tags.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">标签</h2>
                <div className="flex flex-wrap gap-2">
                  {location.tags.map((tag: any, i: number) => (
                    <span
                      key={tag?.id ?? i}
                      className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full text-sm"
                    >
                      {typeof tag === "string" ? tag : tag?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Active Teams */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-stone-900">正在招募的队伍</h2>
                <a
                  href="/teams/create"
                  className="text-sm text-stone-600 hover:text-stone-900 font-medium"
                >
                  发起组队
                </a>
              </div>

              {teams.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-stone-500 text-sm mb-3">暂无招募中的队伍</p>
                  <a href="/teams/create">
                    <button className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      发起第一支队伍
                    </button>
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.map((team: any) => (
                    <a key={team.id} href={`/teams/${team.id}`}>
                      <div className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all bg-stone-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-stone-900">{team.title}</h3>
                            <p className="text-sm text-stone-500 mt-1">
                              {team.date} · {team.currentMembers}/{team.maxMembers}人
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-stone-400" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 sticky top-24">
              <h3 className="font-semibold text-stone-900 mb-4">参加活动</h3>
              <a href="/teams/create">
                <button className="w-full bg-stone-900 hover:bg-stone-800 text-white py-3 rounded-xl font-medium transition-colors mb-3">
                  发起组队
                </button>
              </a>
              <a href="/teams">
                <button className="w-full border border-stone-200 hover:bg-stone-50 text-stone-900 py-3 rounded-xl font-medium transition-colors">
                  浏览所有队伍
                </button>
              </a>

              {/* Location Info */}
              {location.address && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <div className="flex items-start gap-2 text-sm text-stone-600">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-stone-400" />
                    <span>{location.address}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Related Locations */}
            {relatedLocations.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h3 className="font-semibold text-stone-900 mb-4">其他推荐地点</h3>
                <div className="space-y-3">
                  {relatedLocations.map((loc) => (
                    <a
                      key={loc.id}
                      href={`/locations/${loc.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors group"
                    >
                      {loc.coverImage && (
                        <div
                          className="w-14 h-14 rounded-lg bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${loc.coverImage})` }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-stone-900 group-hover:text-stone-700 transition-colors truncate text-sm">
                          {loc.name}
                        </h4>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {difficultyLabels[loc.difficulty]?.label || loc.difficulty}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
