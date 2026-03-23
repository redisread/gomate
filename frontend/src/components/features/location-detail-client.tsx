"use client";

import * as React from "react";
import {
  MapPin,
  Share2,
  Mountain,
  Users,
  Heart,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Copy,
  Check,
  Flame,
  Clock,
  Ruler,
  TrendingUp,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";
import type { Location, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  LocationIntroCard,
  RouteInfoCard,
  TeamListSection,
  AddressRow,
} from "@/components/features/location-detail-main-content";

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

// ─── 骨架屏（shimmer 扫光，与真实 Hero 布局完全对应）──────────────────────────
function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Navbar />
      {/* 封面骨架：与 Hero 高度保持一致 */}
      <div className="relative h-[420px] sm:h-[520px] lg:h-[600px] overflow-hidden bg-stone-200 skeleton">
        {/* 右上角按钮区骨架 */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <div className="h-8 w-16 rounded-full bg-stone-300/60" />
          <div className="h-9 w-9 rounded-full bg-stone-300/60" />
        </div>
        {/* 底部信息区骨架 */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-5">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* 面包屑骨架 */}
            <div className="h-4 w-28 rounded bg-stone-300/50" />
            {/* 徽章骨架 */}
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-stone-300/60" />
              <div className="h-6 w-20 rounded-full bg-stone-300/60" />
            </div>
            {/* 标题骨架 */}
            <div className="h-9 w-56 rounded-lg bg-stone-300/60" />
            <div className="h-4 w-40 rounded bg-stone-300/50" />
            {/* 信息条骨架 */}
            <div className="flex gap-3 pt-2">
              <div className="h-8 w-20 rounded-full bg-stone-300/50" />
              <div className="h-8 w-20 rounded-full bg-stone-300/50" />
              <div className="h-8 w-20 rounded-full bg-stone-300/50" />
            </div>
            {/* 缩略图导航骨架 */}
            <div className="flex gap-2 pt-1">
              <div className="w-2 h-2 rounded-full bg-stone-300/60" />
              <div className="w-2 h-2 rounded-full bg-stone-300/40" />
              <div className="w-2 h-2 rounded-full bg-stone-300/40" />
            </div>
          </div>
        </div>
      </div>
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

// ─── ActionCard Props ──────────────────────────────────────────────────────
interface ActionCardProps {
  location: Location;
  teams: Team[];
}

/**
 * 右侧 sticky 操作卡（CRO 优化版）
 * - 社交证明：头像堆叠 + 活跃度文案
 * - 主 CTA：shimmer 扫光动画 + hover 上浮
 * - 地址可点击复制
 * - 最佳季节快捷提示
 */
function ActionCard({ location, teams }: ActionCardProps) {
  // 地址复制状态
  const [addressCopied, setAddressCopied] = React.useState(false);

  /** 点击复制地址 */
  const handleCopyAddress = async () => {
    if (!location.address) return;
    try {
      await navigator.clipboard.writeText(location.address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch {
      // 降级：静默失败
    }
  };

  // 计算参与人数（所有招募中队伍的当前成员总数）
  const totalParticipants = teams.reduce((sum, t) => sum + (t.currentMembers || 0), 0);

  // 从有头像的队伍负责人中取最多 4 个
  const avatarLeaders = teams
    .filter((t) => t.leader?.avatar)
    .slice(0, 4);

  // 活跃文案：有队伍时显示参与人数，否则鼓励发起
  const socialProofText =
    teams.length > 0
      ? `已有 ${totalParticipants} 人报名，${teams.length} 支队伍等你`
      : "你来发起第一支队伍吧";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #FFFBEB 0%, #faf8f5 100%)",
        border: "1px solid rgba(217,119,6,0.18)",
        boxShadow: "0 2px 16px rgba(217,119,6,0.08)",
      }}
    >
      {/* 封面缩略图 + 遮罩 */}
      {location.coverImage && (
        <div className="relative h-28 overflow-hidden">
          <img
            src={location.coverImage}
            alt={location.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-amber-950/50 via-amber-900/10 to-transparent" />
          {/* 地点名称浮层 */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <p className="text-white font-semibold text-sm leading-tight drop-shadow-sm truncate">
              {location.name}
            </p>
          </div>
        </div>
      )}

      {/* 卡片主体 */}
      <div className="p-5">
        {/* 情感标题 */}
        <p className="text-sm font-semibold mb-0.5" style={{ color: "#92400E" }}>
          {copy.locations.detailParticipate}
        </p>

        {/* 社交证明区 */}
        <div className="flex items-center gap-2 mb-4">
          {/* 头像堆叠 */}
          {avatarLeaders.length > 0 && (
            <div className="flex -space-x-2">
              {avatarLeaders.map((t, i) => (
                <img
                  key={t.id}
                  src={t.leader.avatar!}
                  alt={t.leader.nickname || t.leader.name}
                  className="w-6 h-6 rounded-full border-2 border-amber-50 object-cover"
                  style={{ zIndex: avatarLeaders.length - i }}
                />
              ))}
            </div>
          )}
          <p className="text-xs" style={{ color: "#8f7f6e" }}>
            {socialProofText}
          </p>
        </div>

        {/* 活跃度指示（有队伍时才显示）*/}
        {teams.length > 0 && (
          <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-lg"
            style={{ background: "rgba(217,119,6,0.06)" }}>
            <Flame className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-medium" style={{ color: "#B45309" }}>
              近期活跃，最新队伍招募中
            </span>
          </div>
        )}

        {/* 主 CTA：shimmer + hover 上浮 */}
        <a href={`/teams/create?locationId=${location.id}`} className="block mb-3">
          <button
            className="relative w-full py-3 rounded-xl text-sm font-semibold text-white overflow-hidden
              transition-all duration-200 active:scale-[0.97]
              hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
              boxShadow: "0 4px 18px rgba(217,119,6,0.35)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 6px 24px rgba(217,119,6,0.50)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 18px rgba(217,119,6,0.35)";
            }}
          >
            {/* shimmer 扫光动画 */}
            <span
              className="absolute inset-0 rounded-xl pointer-events-none motion-reduce:hidden"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.28) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2.4s ease-in-out infinite",
              }}
            />
            {/* 按钮内容 */}
            <span className="relative flex items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              {copy.locations.detailCreateTeam}
            </span>
          </button>
        </a>

        {/* 次要 CTA */}
        <a href={`/teams?locationId=${location.id}`} className="block">
          <button
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97]"
            style={{
              border: "1px solid rgba(217,119,6,0.28)",
              color: "#92400E",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(217,119,6,0.07)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            {copy.locations.detailBrowseTeams}
          </button>
        </a>

        {/* 分隔线 */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(217,119,6,0.10)" }}>

          {/* 地址（可点击复制）*/}
          {location.address && (
            <button
              onClick={handleCopyAddress}
              className="w-full flex items-start gap-2 text-left group transition-opacity hover:opacity-80 mb-3"
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
              <span className="text-xs leading-relaxed flex-1" style={{ color: "#8f7f6e" }}>
                {location.address}
              </span>
              {/* 复制图标 */}
              <span className="flex-shrink-0 mt-0.5">
                {addressCopied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-stone-300 group-hover:text-amber-400 transition-colors" />
                )}
              </span>
            </button>
          )}

          {/* 最佳季节快捷提示 */}
          {location.bestSeason && location.bestSeason.length > 0 && (
            <div className="flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
              <div>
                <p className="text-xs mb-1" style={{ color: "#8f7f6e" }}>
                  {copy.locations.detailSeasonsLabel}
                </p>
                <div className="flex flex-wrap gap-1">
                  {location.bestSeason.map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: "rgba(217,119,6,0.08)",
                        color: "#B45309",
                        border: "1px solid rgba(217,119,6,0.15)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── RelatedLocations Props ───────────────────────────────────────────────
interface RelatedLocationsProps {
  locations: Location[];
}

/**
 * 相关地点推荐卡片组（升级版）
 * - 大图卡片样式
 * - 难度色彩标识
 * - hover 图片缩放 + 卡片阴影
 * - 底部「查看全部」入口
 */
function RelatedLocations({ locations }: RelatedLocationsProps) {
  if (locations.length === 0) return null;

  // 难度颜色配置（用于色彩标识徽章）
  const diffBadgeConfig: Record<string, { bg: string; text: string; dot: string }> = {
    easy: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
    moderate: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
    hard: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
    expert: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  };

  return (
    <div
      className="bg-white rounded-2xl p-5"
      style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-900">
          {copy.locations.relatedTitle}
        </h3>
        <a
          href="/locations"
          className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors flex items-center gap-0.5"
        >
          {copy.common.viewAll}
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* 地点卡片列表 */}
      <div className="space-y-3">
        {locations.map((loc) => {
          const diff = loc.difficulty ? diffBadgeConfig[loc.difficulty] : null;
          const diffLabel = loc.difficulty
            ? difficultyConfig[loc.difficulty]?.label
            : null;

          return (
            <a
              key={loc.id}
              href={`/locations/${loc.id}`}
              className="flex items-center gap-3 group rounded-xl p-2 -mx-2 transition-all duration-200
                hover:bg-stone-50 hover:shadow-sm"
            >
              {/* 图片（hover 缩放）*/}
              <div className="w-[72px] h-[56px] rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
                {loc.coverImage ? (
                  <img
                    src={loc.coverImage}
                    alt={loc.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Mountain className="h-6 w-6 text-stone-300" />
                  </div>
                )}
              </div>

              {/* 文字信息 */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-stone-900 group-hover:text-amber-700 transition-colors text-sm truncate leading-snug">
                  {loc.name}
                </h4>
                {/* 难度徽章 */}
                {diff && diffLabel && (
                  <span className={cn("inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium", diff.bg, diff.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", diff.dot)} />
                    {diffLabel}
                  </span>
                )}
              </div>

              {/* 箭头 */}
              <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── MobileFloatingCTA Props ──────────────────────────────────────────────
interface MobileFloatingCTAProps {
  location: Location;
  /** Hero 区域的 ref，用于 IntersectionObserver 控制显隐 */
  heroRef: React.RefObject<HTMLDivElement>;
}

/**
 * 移动端底部浮动操作栏
 * - 滚动超过 Hero 区域后才显示（IntersectionObserver）
 * - 地点名称（截断）+ 主 CTA 按钮
 * - lg 及以上隐藏
 */
function MobileFloatingCTA({ location, heroRef }: MobileFloatingCTAProps) {
  // Hero 是否已离开视口（=浮动栏是否应显示）
  const [heroLeft, setHeroLeft] = React.useState(false);

  React.useEffect(() => {
    const target = heroRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Hero 不再可见时显示浮动栏
        setHeroLeft(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [heroRef]);

  return (
    <div
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-all duration-300",
        heroLeft ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(217,119,6,0.12)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.10)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
        {/* 地点名称（截断）*/}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-stone-400">目的地</p>
          <p className="text-sm font-semibold text-stone-900 truncate">{location.name}</p>
        </div>

        {/* 主 CTA */}
        <a href={`/teams/create?locationId=${location.id}`} className="flex-shrink-0">
          <button
            className="relative flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white overflow-hidden
              active:scale-[0.96] transition-transform duration-150"
            style={{
              background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
              boxShadow: "0 3px 14px rgba(217,119,6,0.40)",
            }}
          >
            {/* shimmer */}
            <span
              className="absolute inset-0 rounded-xl pointer-events-none motion-reduce:hidden"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2.4s ease-in-out infinite",
              }}
            />
            <span className="relative flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              召集伙伴
            </span>
          </button>
        </a>
      </div>
      {/* 底部安全区（iOS home indicator）*/}
      <div className="h-safe-area-inset-bottom" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
    </div>
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
  // 管理员权限
  const [isAdmin, setIsAdmin] = React.useState(false);

  // ── 图片画廊状态 ──────────────────────────────────────────────────────────
  // 当前展示的图片索引（0 = coverImage，1+ = images 数组）
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  // 图片切换淡入淡出：控制不透明度
  const [imageVisible, setImageVisible] = React.useState(true);
  // 左右箭头 hover 显示控制
  const [showArrows, setShowArrows] = React.useState(false);

  // ── 视差滚动状态 ──────────────────────────────────────────────────────────
  // 视差偏移量（px），随滚动更新
  const [parallaxOffset, setParallaxOffset] = React.useState(0);
  const heroRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    loadLocation();
  }, [locationId]);

  // ── 视差滚动监听 ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const scrollY = window.scrollY;
      // 仅在 Hero 可见范围内计算，性能优先
      const heroBottom = heroRef.current.getBoundingClientRect().bottom + scrollY;
      if (scrollY < heroBottom) {
        // 图片随滚动上移 0.3 倍，产生视差感
        setParallaxOffset(scrollY * 0.3);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    fetchAPI("/auth/get-session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.role === "admin") setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

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

  /** 图片切换（带淡入淡出动画）*/
  const switchImage = (index: number) => {
    if (index === activeImageIndex) return;
    // 先淡出
    setImageVisible(false);
    setTimeout(() => {
      setActiveImageIndex(index);
      // 再淡入
      setImageVisible(true);
    }, 200);
  };

  /** 切换到上一张 */
  const prevImage = (allImages: string[]) => {
    const newIndex = (activeImageIndex - 1 + allImages.length) % allImages.length;
    switchImage(newIndex);
  };

  /** 切换到下一张 */
  const nextImage = (allImages: string[]) => {
    const newIndex = (activeImageIndex + 1) % allImages.length;
    switchImage(newIndex);
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
          Hero 封面区域（极致优化版）
          - 图片画廊：多图切换（淡入淡出）+ 左右箭头 + 圆点指示器
          - 视差滚动：图片随滚动上移 0.3 倍
          - 底部快速数据条：难度/时长/距离 pill
          ================================================================ */}
      {(() => {
        // 构建画廊图片列表（封面图 + 额外图片，去重）
        const galleryImages: string[] = [];
        if (location.coverImage) galleryImages.push(location.coverImage);
        if (location.images) {
          for (const img of location.images) {
            if (img && img !== location.coverImage) galleryImages.push(img);
          }
        }
        const hasMultiple = galleryImages.length > 1;
        const currentImage = galleryImages[activeImageIndex] ?? galleryImages[0];

        return (
          <div
            ref={heroRef}
            className="relative h-[420px] sm:h-[520px] lg:h-[600px] overflow-hidden bg-stone-900"
            onMouseEnter={() => setShowArrows(true)}
            onMouseLeave={() => setShowArrows(false)}
          >
            {/* ── 背景图（视差 + 淡入淡出）────────────────────────────────── */}
            {currentImage ? (
              <img
                key={currentImage}
                src={currentImage}
                alt={location.name}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: `translateY(${parallaxOffset}px) scale(1.08)`,
                  opacity: imageVisible ? 1 : 0,
                  transition: "opacity 0.22s ease, transform 0s",
                  transformOrigin: "center top",
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
                <Mountain className="h-24 w-24 text-stone-600" />
              </div>
            )}

            {/* ── 渐变遮罩（底部加深，保证文字可读）──────────────────────── */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />

            {/* ── 左右切换箭头（hover 显示）────────────────────────────────── */}
            {hasMultiple && (
              <>
                <button
                  onClick={() => prevImage(galleryImages)}
                  className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 z-10",
                    "w-10 h-10 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-sm",
                    "flex items-center justify-center transition-all duration-200",
                    showArrows ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
                  )}
                  aria-label="上一张"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => nextImage(galleryImages)}
                  className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 z-10",
                    "w-10 h-10 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-sm",
                    "flex items-center justify-center transition-all duration-200",
                    showArrows ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
                  )}
                  aria-label="下一张"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              </>
            )}

            {/* ── 底部内容区 ────────────────────────────────────────────────── */}
            <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-5">
              <div className="max-w-4xl mx-auto">

                {/* 面包屑 */}
                <a
                  href="/locations"
                  className="inline-flex items-center gap-1 text-white/65 hover:text-white/90 text-xs mb-3 transition-colors duration-150"
                >
                  <MapPin className="h-3 w-3" />
                  {copy.nav.locations}
                  <ChevronRight className="h-3 w-3" />
                </a>

                {/* 徽章行 */}
                <div className="flex items-center gap-2 mb-2">
                  {diffInfo.label && (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm",
                      diffInfo.text
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", diffInfo.dot)} />
                      {diffInfo.label}
                    </span>
                  )}
                  {location.bestSeason && location.bestSeason.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
                      <Sparkles className="w-3 h-3" />
                      {location.bestSeason[0]}
                    </span>
                  )}
                </div>

                {/* 标题行：标题 + 右侧操作按钮 */}
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-1 drop-shadow-sm">
                      {location.name}
                    </h1>
                    {location.subtitle && (
                      <p className="text-white/80 text-sm sm:text-base mb-3">{location.subtitle}</p>
                    )}
                  </div>
                  {/* 操作按钮组：分享 + 收藏 + 编辑（admin） */}
                  <div className="flex items-center gap-2 shrink-0 pb-1">
                    {isAdmin && (
                      <a href={`/admin/locations/${locationId}/edit`}>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-xs font-medium transition-all duration-150 active:scale-95 border border-white/15">
                          <Pencil className="h-3.5 w-3.5" />
                          {copy.admin.editLocation}
                        </button>
                      </a>
                    )}
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-xs font-medium transition-all duration-150 active:scale-95 border border-white/15"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      {shareCopied ? copy.share.linkCopied : copy.locations.detailShareBtn}
                    </button>
                    <button
                      onClick={handleFavorite}
                      className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-150 active:scale-95 border border-white/15"
                      aria-label={isFavorited ? "取消收藏" : "收藏"}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4 transition-colors duration-200",
                          isFavorited ? "fill-red-400 text-red-400" : "text-white"
                        )}
                        style={
                          heartAnimating
                            ? { animation: "heartbeat 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }
                            : undefined
                        }
                      />
                    </button>
                  </div>
                </div>

                {/* 快速数据条（时长/距离/爬升）*/}
                {(location.duration || (location as any).distance || (location as any).elevation) && (
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    {location.duration && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-black/40 text-white/90 backdrop-blur-sm border border-white/10">
                        <Clock className="h-3 w-3 text-amber-300" />
                        {location.duration}
                      </span>
                    )}
                    {(location as any).distance && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-black/40 text-white/90 backdrop-blur-sm border border-white/10">
                        <Ruler className="h-3 w-3 text-sky-300" />
                        {(location as any).distance}
                      </span>
                    )}
                    {(location as any).elevation && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-black/40 text-white/90 backdrop-blur-sm border border-white/10">
                        <TrendingUp className="h-3 w-3 text-emerald-300" />
                        {(location as any).elevation}
                      </span>
                    )}
                  </div>
                )}

                {/* 图片圆点指示器（多图时显示）*/}
                {hasMultiple && (
                  <div className="flex items-center gap-1.5 mt-3">
                    {galleryImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => switchImage(idx)}
                        className={cn(
                          "rounded-full transition-all duration-200",
                          idx === activeImageIndex
                            ? "w-5 h-2 bg-white"
                            : "w-2 h-2 bg-white/40 hover:bg-white/65"
                        )}
                        aria-label={`切换到第 ${idx + 1} 张图片`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================
          主内容区
          ================================================================ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ---- 左/中栏：主信息（使用模块化组件）---- */}
          <div className="lg:col-span-2 space-y-6">

            {/* 地点介绍卡片：展开/收起 + 图片画廊 + 精致标签 */}
            <LocationIntroCard location={location} />

            {/* 路线信息：大数字数据展示 + 难度进度条 + 装备/注意事项 */}
            <RouteInfoCard location={location} />

            {/* 地址行 */}
            {location.address && <AddressRow address={location.address} />}

            {/* 队伍列表：日历卡片 + 人数气泡 + 渐变进度条 */}
            <TeamListSection teams={teams} locationId={location.id} />
          </div>

          {/* ---- 右栏：sticky 操作卡（CRO 优化版）---- */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* ActionCard：社交证明 + shimmer CTA + 可复制地址 + 季节提示 */}
              <ActionCard location={location} teams={teams} />

              {/* RelatedLocations：大图卡片 + 难度色彩标识 + 查看全部 */}
              <RelatedLocations locations={relatedLocations} />
            </div>
          </div>
        </div>
      </div>

      {/* 移动端浮动操作栏：滚过 Hero 后出现 */}
      <MobileFloatingCTA location={location} heroRef={heroRef} />

      <Footer />
    </main>
  );
}
