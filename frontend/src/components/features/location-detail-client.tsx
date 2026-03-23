"use client";

import * as React from "react";
import {
  MapPin,
  Share2,
  ArrowRight,
  Mountain,
  Clock,
  Users,
  Ruler,
  TrendingUp,
  Heart,
  Sparkles,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Location, Team, Tag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

// ─── 难度配置（与列表页保持一致）────────────────────────────────────────────
const difficultyConfig: Record<
  string,
  { label: string; dot: string; text: string }
> = {
  easy: { label: copy.enums.difficulty.easy, dot: "bg-amber-500", text: "text-amber-700" },
  moderate: { label: copy.enums.difficulty.moderate, dot: "bg-amber-500", text: "text-amber-700" },
  hard: { label: copy.enums.difficulty.hard, dot: "bg-orange-500", text: "text-orange-700" },
  expert: { label: copy.enums.difficulty.expert, dot: "bg-red-500", text: "text-red-700" },
};

// ─── 队伍进度条（地点详情页内队伍卡片用）────────────────────────────────────
function TeamProgress({ current, max }: { current: number; max: number }) {
  const [width, setWidth] = React.useState(0);
  const ratio = max > 0 ? Math.round((current / max) * 100) : 0;
  const isFull = current >= max;

  React.useEffect(() => {
    const t = setTimeout(() => setWidth(ratio), 100);
    return () => clearTimeout(t);
  }, [ratio]);

  return (
    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
          isFull ? "bg-warm" : "bg-gradient-to-r from-amber-600 to-amber-500"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// ─── 骨架屏（shimmer 扫光）────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />
      {/* 封面骨架 */}
      <div className="h-[360px] sm:h-[480px] skeleton" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-40 skeleton rounded-2xl" />
            <div className="h-28 skeleton rounded-2xl" />
            <div className="h-52 skeleton rounded-2xl" />
          </div>
          <div className="h-64 skeleton rounded-2xl" />
        </div>
      </div>
    </main>
  );
}

interface LocationDetailClientProps {
  locationId: string;
}

/**
 * 地点详情页客户端组件 - React Island
 * 视觉规范：GoMate Design Spec v1.0（Section F）
 */
export function LocationDetailClient({ locationId }: LocationDetailClientProps) {
  const [location, setLocation] = React.useState<Location | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [relatedLocations, setRelatedLocations] = React.useState<Location[]>([]);
  // 收藏状态（本地 UI 演示，无后端持久化）
  const [isFavorited, setIsFavorited] = React.useState(false);
  const [heartAnimating, setHeartAnimating] = React.useState(false);
  // 分享提示
  const [shareCopied, setShareCopied] = React.useState(false);

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
        loadTeams(data.location.id);
        loadRelatedLocations();
      } else {
        setError(copy.api.locationNotFound);
      }
    } catch {
      setError(copy.common.loading);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeams = async (locId: string) => {
    try {
      const res = await fetchAPI(`/api/teams?locationId=${locId}&status=recruiting&pageSize=5`);
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch (error) {
      console.error("[LocationDetail] 获取队伍列表失败:", error);
    }
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
    } catch (error) {
      console.error("[LocationDetail] 获取相关地点失败:", error);
    }
  };

  /** 收藏按钮点击：本地状态切换 + 心跳动效 */
  const handleFavorite = () => {
    setIsFavorited((v) => !v);
    setHeartAnimating(true);
    setTimeout(() => setHeartAnimating(false), 400);
  };

  /** 分享：优先 Web Share API，降级复制链接 */
  const handleShare = async () => {
    if (navigator.share && location) {
      try {
        await navigator.share({ title: location.name, url: window.location.href });
        return;
      } catch {
        // intentionally ignored: 用户取消分享
      }
    }
    await navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  if (isLoading) return <LoadingSkeleton />;

  if (error || !location) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900 mb-3">
              {error || copy.api.locationNotFound}
            </h1>
            <a
              href="/locations"
              className="text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors"
            >
              {copy.common.back}
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const diffInfo = (location.difficulty ? difficultyConfig[location.difficulty] : null) ?? {
    label: location.difficulty || "",
    dot: "bg-stone-400",
    text: "text-stone-700",
  };

  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />

      {/* ================================================================
          Hero 封面区域
          高度：h-[360px] sm:h-[480px] lg:h-[560px]
          渐变：from-black/65 via-black/15 to-transparent（Design Spec F.6）
          ================================================================ */}
      <div className="relative h-[360px] sm:h-[480px] lg:h-[560px] overflow-hidden bg-stone-900">
        {location.coverImage ? (
          <img
            src={location.coverImage}
            alt={location.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
            <Mountain className="h-24 w-24 text-stone-600" />
          </div>
        )}

        {/* 双层渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-transparent" />

        {/* 封面右上角：收藏 + 分享按钮 */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          {/* 分享按钮 */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white text-xs font-medium transition-all duration-150 active:scale-95"
          >
            <Share2 className="h-3.5 w-3.5" />
            {shareCopied ? copy.share.linkCopied : copy.locations.detailShareBtn}
          </button>

          {/* 情感化收藏按钮 */}
          <button
            onClick={handleFavorite}
            className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all duration-150 active:scale-95"
            aria-label={isFavorited ? "取消收藏" : "收藏"}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors duration-200",
                isFavorited ? "fill-red-400 text-red-400" : "text-white",
                heartAnimating && "motion-reduce:animate-none"
              )}
              style={
                heartAnimating
                  ? { animation: "heartbeat 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }
                  : undefined
              }
            />
          </button>
        </div>

        {/* 封面底部：面包屑 */}
        <div className="absolute bottom-20 left-0 right-0 px-4 sm:px-8">
          <div className="max-w-4xl mx-auto">
            <a
              href="/locations"
              className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors duration-150"
            >
              <MapPin className="h-3.5 w-3.5" />
              {copy.nav.locations}
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* 封面底部：标题 + 副标题 + 徽章 */}
        <div className="absolute bottom-6 left-0 right-0 px-4 sm:px-8">
          <div className="max-w-4xl mx-auto">
            {/* 难度徽章（Design Spec F.6：bg-white/90 backdrop-blur-sm）*/}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm",
                  diffInfo.text
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", diffInfo.dot)} />
                {diffInfo.label}
              </span>
              {location.bestSeason && location.bestSeason.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
                  <Sparkles className="w-3 h-3" />
                  {location.bestSeason[0]}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-1">
              {location.name}
            </h1>
            {location.subtitle && (
              <p className="text-white/80 text-sm sm:text-base">{location.subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          主内容区
          ================================================================ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ---- 左/中栏：主信息 ---- */}
          <div className="lg:col-span-2 space-y-6">

            {/* 地点介绍卡片（含标签）*/}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-3">
                {copy.locations.locationIntro}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                {location.description}
              </p>

              {/* 标签：并入介绍卡片底部（Design Spec C.1.3）*/}
              {location.tags && location.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-50 flex flex-wrap gap-2">
                  {location.tags.map((tag: Tag, i: number) => (
                    <span
                      key={tag?.id ?? i}
                      className="px-2.5 py-1 bg-amber-50/80 text-amber-700 rounded-full text-xs border border-amber-100"
                    >
                      {typeof tag === "string" ? tag : tag?.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 路线信息数据网格（4列）*/}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-5">
                {copy.locations.routeInfo}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 难度 */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Mountain className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">{copy.locations.difficultyLabel}</p>
                    <p className={cn("font-semibold text-sm", diffInfo.text)}>
                      {diffInfo.label}
                    </p>
                  </div>
                </div>

                {/* 时长 */}
                {location.duration && (
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 mb-0.5">{copy.locations.estimatedTime}</p>
                      <p className="font-semibold text-sm text-stone-700">{location.duration}</p>
                    </div>
                  </div>
                )}

                {/* 距离 */}
                {(location as any).distance && (
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Ruler className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 mb-0.5">{copy.locations.routeLength}</p>
                      <p className="font-semibold text-sm text-stone-700">{(location as any).distance}</p>
                    </div>
                  </div>
                )}

                {/* 爬升 */}
                {(location as any).elevation && (
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-stone-500" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 mb-0.5">{copy.locations.totalElevation}</p>
                      <p className="font-semibold text-sm text-stone-700">{(location as any).elevation}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 最佳季节 */}
              {location.bestSeason && location.bestSeason.length > 0 && (
                <div className="mt-5 pt-5 border-t border-stone-50">
                  <p className="text-xs text-stone-400 mb-2 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {copy.locations.detailSeasonsLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {location.bestSeason.map((season: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100"
                      >
                        {season}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 地址信息 */}
            {location.address && (
              <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm px-5 py-4 flex items-start gap-3">
                <MapPin className="h-4 w-4 text-stone-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-stone-500">{location.address}</span>
              </div>
            )}

            {/* 正在招募的队伍（情感化标题）*/}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    {copy.locations.detailWaiting}
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {teams.length > 0
                      ? `${teams.length} ${copy.locations.teamsWaitingDesc}`
                      : copy.locations.detailNoTeamsDesc}
                  </p>
                </div>
                <a
                  href="/teams/create"
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors flex items-center gap-1"
                >
                  {copy.locations.detailCreateTeam}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              {teams.length === 0 ? (
                // 空状态：温暖情感化设计
                <div className="flex flex-col items-center py-10">
                  <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                      <div className="w-11 h-11 rounded-full bg-amber-100/80 flex items-center justify-center">
                        <Users
                          className="h-6 w-6 text-amber-400 motion-reduce:animate-none"
                          style={{ animation: "float 3s ease-in-out infinite" }}
                        />
                      </div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-200" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 rounded-full bg-amber-200" />
                  </div>
                  <p className="text-stone-500 text-sm text-center max-w-xs leading-relaxed mb-5">
                    {copy.locations.detailNoTeamsDesc}
                  </p>
                  <a href="/teams/create">
                    <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-full text-sm font-medium transition-all duration-200 shadow-brand-glow hover:shadow-brand-glow-lg active:scale-[0.97]">
                      <Users className="h-4 w-4" />
                      {copy.locations.detailNoTeamsBtn}
                    </button>
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.map((team: Team) => (
                    <a
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="block group"
                    >
                      {/* 队伍卡片：Design Spec F.6 bg-white border-stone-100 */}
                      <div className="p-4 rounded-xl bg-white border border-stone-100 hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-200">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-stone-900 group-hover:text-amber-700 transition-colors text-sm leading-snug truncate">
                              {team.title}
                            </h3>
                            <p className="text-xs text-stone-400 mt-1 flex items-center gap-2">
                              <span>{team.date}</span>
                              <span>·</span>
                              <span className={cn(
                                "font-medium",
                                team.currentMembers >= team.maxMembers ? "text-warm" : "text-amber-600"
                              )}>
                                {team.currentMembers}/{team.maxMembers} 人
                              </span>
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-amber-500 transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                        {/* 进度条 */}
                        <TeamProgress current={team.currentMembers} max={team.maxMembers} />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ---- 右栏：sticky 操作卡 ---- */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-5">

              {/* 主操作卡 — 温暖品牌渐变背景 */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "linear-gradient(160deg, #FFFBEB 0%, #faf8f5 100%)",
                  border: "1px solid rgba(217,119,6,0.18)",
                }}
              >
                <p className="text-sm font-semibold mb-1" style={{ color: "#92400E" }}>
                  {copy.locations.detailParticipate}
                </p>
                <p className="text-xs mb-4" style={{ color: "#8f7f6e" }}>
                  {teams.length > 0
                    ? `已有 ${teams.length} 支队伍等你一起`
                    : "你来发起第一支队伍吧"}
                </p>

                {/* 主 CTA */}
                <a
                  href={`/teams/create?locationId=${location.id}`}
                  className="block mb-3"
                >
                  <button
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.97]"
                    style={{
                      background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                      boxShadow: "0 4px 18px rgba(217,119,6,0.35)",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.transform = "translateY(-1px)";
                      el.style.boxShadow = "0 6px 24px rgba(217,119,6,0.45)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.transform = "translateY(0)";
                      el.style.boxShadow = "0 4px 18px rgba(217,119,6,0.35)";
                    }}
                  >
                    {copy.locations.detailCreateTeam}
                  </button>
                </a>

                {/* 次要 CTA */}
                <a href={`/teams?locationId=${location.id}`} className="block">
                  <button
                    className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{ border: "1px solid rgba(217,119,6,0.25)", color: "#92400E" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(217,119,6,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    {copy.locations.detailBrowseTeams}
                  </button>
                </a>

                {/* 地址 */}
                {location.address && (
                  <div className="mt-4 pt-4 flex items-start gap-2 text-sm" style={{ borderTop: "1px solid rgba(217,119,6,0.10)", color: "#8f7f6e" }}>
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#D97706" }} />
                    <span className="leading-relaxed">{location.address}</span>
                  </div>
                )}
              </div>

              {/* 其他推荐地点 */}
              {relatedLocations.length > 0 && (
                <div className="bg-white rounded-2xl border border-stone-100 shadow-warm-sm p-5">
                  <h3 className="text-sm font-semibold text-stone-900 mb-4">{copy.locations.relatedTitle}</h3>
                  <div className="space-y-3">
                    {relatedLocations.map((loc) => {
                      const relDiff = loc.difficulty ? difficultyConfig[loc.difficulty] : null;
                      return (
                        <a
                          key={loc.id}
                          href={`/locations/${loc.id}`}
                          className="flex items-center gap-3 group"
                        >
                          {/* 缩略图（升至 w-16 h-16 比原来 w-14 更醒目）*/}
                          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
                            {loc.coverImage ? (
                              <img
                                src={loc.coverImage}
                                alt={loc.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Mountain className="h-6 w-6 text-stone-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-stone-900 group-hover:text-amber-700 transition-colors text-sm truncate">
                              {loc.name}
                            </h4>
                            {relDiff && (
                              <p className={cn("text-xs mt-0.5", relDiff.text)}>
                                {relDiff.label}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
