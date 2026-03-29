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
  Flame,
  Clock,
  Ruler,
  TrendingUp,
  X,
  ZoomIn,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI, getLocationPois } from "@/lib/api";
import type { Location, Team, RoutePoi } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  LocationIntroCard,
  TeamListSection,
  PoiSection,
} from "@/components/features/location-detail-main-content";
import { SharePosterModal } from "./share-poster-modal";

// ─── 季节映射 ─────────────────────────────────────────────────────────────────
const SEASON_LABEL: Record<string, string> = {
  spring: "春季",
  summer: "夏季",
  autumn: "秋季",
  winter: "冬季",
};

// ─── 难度配置 ─────────────────────────────────────────────────────────────────
const difficultyConfig: Record<
  string,
  { label: string; dot: string; text: string; pill: string }
> = {
  easy: {
    label: copy.enums.difficulty.easy,
    dot: "bg-emerald-400",
    text: "text-emerald-700",
    pill: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30",
  },
  moderate: {
    label: copy.enums.difficulty.moderate,
    dot: "bg-amber-400",
    text: "text-amber-700",
    pill: "bg-amber-500/20 text-amber-100 border-amber-400/30",
  },
  hard: {
    label: copy.enums.difficulty.hard,
    dot: "bg-orange-500",
    text: "text-orange-700",
    pill: "bg-orange-500/20 text-orange-100 border-orange-400/30",
  },
  expert: {
    label: copy.enums.difficulty.expert,
    dot: "bg-red-500",
    text: "text-red-700",
    pill: "bg-red-500/20 text-red-100 border-red-400/30",
  },
};

// ─── 骨架屏 ───────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-stone-50 pb-24 lg:pb-0">
      <Navbar />
      <div className="relative h-[480px] sm:h-[560px] lg:h-[640px] overflow-hidden bg-stone-200 skeleton">
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <div className="h-8 w-16 rounded-full bg-stone-300/60" />
          <div className="h-9 w-9 rounded-full bg-stone-300/60" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-8">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="h-4 w-28 rounded bg-stone-300/50" />
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-stone-300/60" />
              <div className="h-6 w-20 rounded-full bg-stone-300/60" />
            </div>
            <div className="h-10 w-64 rounded-lg bg-stone-300/60" />
            <div className="h-4 w-48 rounded bg-stone-300/50" />
            <div className="flex gap-3 pt-2">
              <div className="h-8 w-20 rounded-full bg-stone-300/50" />
              <div className="h-8 w-20 rounded-full bg-stone-300/50" />
              <div className="h-8 w-20 rounded-full bg-stone-300/50" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-44 skeleton rounded-2xl" />
            <div className="h-32 skeleton rounded-2xl" />
            <div className="h-56 skeleton rounded-2xl" />
          </div>
          <div className="h-72 skeleton rounded-2xl" />
        </div>
      </div>
    </main>
  );
}

// ─── 全屏 Lightbox ────────────────────────────────────────────────────────────
interface LightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function Lightbox({ images, index, onClose, onPrev, onNext }: LightboxProps) {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-md flex items-center justify-center"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors z-10"
        aria-label="关闭"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* 计数器 */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/70 text-xs font-medium">
        {index + 1} / {images.length}
      </div>

      {/* 上一张 */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
          aria-label="上一张"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
      )}

      {/* 图片 */}
      <img
        src={images[index]}
        alt={`图片 ${index + 1}`}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* 下一张 */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
          aria-label="下一张"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      )}

      {/* 底部缩略图条 */}
      {images.length > 1 && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {images.slice(0, 8).map((img, i) => (
            <button
              key={i}
              onClick={() => {
                const diff = i - index;
                if (diff > 0) { for (let j = 0; j < diff; j++) onNext(); }
                else { for (let j = 0; j < -diff; j++) onPrev(); }
              }}
              className={cn(
                "w-10 h-10 rounded-lg overflow-hidden border-2 transition-all duration-200",
                i === index ? "border-white scale-110" : "border-white/30 hover:border-white/60"
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ActionCard ───────────────────────────────────────────────────────────────
interface ActionCardProps {
  location: Location;
  teams: Team[];
}

/**
 * 右侧 sticky 操作卡（CRO 极致优化版）
 * 角色：转化率优化师 + 视觉总监
 */
function ActionCard({ location, teams }: ActionCardProps) {
  const totalParticipants = teams.reduce((sum, t) => sum + (t.currentMembers || 0), 0);
  const avatarLeaders = teams.filter((t) => t.leader?.avatar).slice(0, 5);
  const socialProofText =
    teams.length > 0
      ? `已有 ${totalParticipants} 人报名 · ${teams.length} 支队伍`
      : "成为第一个发起者";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #FFFBEB 0%, #fefce8 50%, #faf8f5 100%)",
        border: "1px solid rgba(217,119,6,0.15)",
        boxShadow: "0 4px 24px rgba(217,119,6,0.10), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="p-5">
        {/* 情感标题 */}
        <p className="text-[13px] font-bold mb-1" style={{ color: "#78350F" }}>
          {copy.locations.detailParticipate}
        </p>

        {/* 社交证明 */}
        <div className="flex items-center gap-2.5 mb-4">
          {avatarLeaders.length > 0 && (
            <div className="flex -space-x-2">
              {avatarLeaders.map((t, i) => (
                <img
                  key={t.id}
                  src={t.leader.avatar!}
                  alt={t.leader.nickname || t.leader.name}
                  className="w-7 h-7 rounded-full border-2 border-amber-50 object-cover shadow-sm"
                  style={{ zIndex: avatarLeaders.length - i }}
                />
              ))}
            </div>
          )}
          <p className="text-xs font-medium" style={{ color: "#92400E" }}>
            {socialProofText}
          </p>
        </div>

        {/* 活跃度指示 */}
        {teams.length > 0 && (
          <div
            className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
            style={{ background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.12)" }}
          >
            <Flame className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold" style={{ color: "#B45309" }}>
              近期活跃 · 最新队伍招募中
            </span>
          </div>
        )}

        {/* 主 CTA */}
        <a href={`/teams/create?locationId=${location.id}`} className="block mb-3">
          <button
            className="relative w-full py-3.5 rounded-xl text-sm font-bold text-white overflow-hidden
              transition-all duration-200 active:scale-[0.97] hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #B45309 0%, #D97706 50%, #F59E0B 100%)",
              boxShadow: "0 4px 20px rgba(180,83,9,0.40), 0 1px 4px rgba(0,0,0,0.12)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 8px 28px rgba(180,83,9,0.52), 0 2px 8px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 20px rgba(180,83,9,0.40), 0 1px 4px rgba(0,0,0,0.12)";
            }}
          >
            <span
              className="absolute inset-0 rounded-xl pointer-events-none motion-reduce:hidden"
              style={{
                background:
                  "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.30) 50%, transparent 65%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2.6s ease-in-out infinite",
              }}
            />
            <span className="relative flex items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              {copy.locations.detailCreateTeam}
            </span>
          </button>
        </a>

        {/* 次要 CTA */}
        <a href={`/teams?locationId=${location.id}`} className="block">
          <button
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97]"
            style={{
              border: "1.5px solid rgba(217,119,6,0.25)",
              color: "#92400E",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(217,119,6,0.06)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.40)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.25)";
            }}
          >
            {copy.locations.detailBrowseTeams}
          </button>
        </a>
      </div>
    </div>
  );
}

// ─── RelatedLocations ─────────────────────────────────────────────────────────
interface RelatedLocationsProps {
  locations: Location[];
}

/**
 * 相关地点推荐（升级版）
 * 角色：视觉总监
 */
function RelatedLocations({ locations }: RelatedLocationsProps) {
  if (locations.length === 0) return null;

  const diffBadgeConfig: Record<string, { bg: string; text: string; dot: string }> = {
    easy: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
    moderate: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
    hard: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
    expert: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  };

  return (
    <div
      className="bg-white rounded-2xl p-5"
      style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-stone-900">
          {copy.locations.relatedTitle}
        </h3>
        <a
          href="/locations"
          className="text-xs text-amber-600 hover:text-amber-700 font-semibold transition-colors flex items-center gap-0.5"
        >
          {copy.common.viewAll}
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="space-y-2">
        {locations.map((loc) => {
          const diff = loc.difficulty ? diffBadgeConfig[loc.difficulty] : null;
          const diffLabel = loc.difficulty ? difficultyConfig[loc.difficulty]?.label : null;

          return (
            <a
              key={loc.id}
              href={`/locations/${loc.id}`}
              className="flex items-center gap-3 group rounded-xl p-2 -mx-2 transition-all duration-200 hover:bg-stone-50"
            >
              <div className="w-[68px] h-[52px] rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
                {loc.coverImage ? (
                  <img
                    src={loc.coverImage}
                    alt={loc.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Mountain className="h-5 w-5 text-stone-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-stone-900 group-hover:text-amber-700 transition-colors text-[13px] truncate leading-snug">
                  {loc.name}
                </h4>
                {diff && diffLabel && (
                  <span className={cn("inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", diff.bg, diff.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", diff.dot)} />
                    {diffLabel}
                  </span>
                )}
              </div>

              <ChevronRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── MobileFloatingCTA ────────────────────────────────────────────────────────
interface MobileFloatingCTAProps {
  location: Location;
  heroRef: React.RefObject<HTMLDivElement>;
}

/**
 * 移动端底部浮动操作栏
 * 角色：移动端交互设计师
 * - IntersectionObserver 控制显隐
 * - 毛玻璃背景 + iOS 安全区适配
 * - 双按钮：浏览队伍 + 发起组队
 */
function MobileFloatingCTA({ location, heroRef }: MobileFloatingCTAProps) {
  const [heroLeft, setHeroLeft] = React.useState(false);

  React.useEffect(() => {
    const target = heroRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroLeft(!entry.isIntersecting),
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
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(217,119,6,0.12)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* 地点信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wide">目的地</p>
          <p className="text-sm font-bold text-stone-900 truncate leading-tight">{location.name}</p>
        </div>

        {/* 浏览队伍 */}
        <a href={`/teams?locationId=${location.id}`} className="flex-shrink-0">
          <button
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.96]"
            style={{
              border: "1.5px solid rgba(217,119,6,0.30)",
              color: "#92400E",
            }}
          >
            浏览队伍
          </button>
        </a>

        {/* 主 CTA */}
        <a href={`/teams/create?locationId=${location.id}`} className="flex-shrink-0">
          <button
            className="relative flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white overflow-hidden active:scale-[0.96] transition-transform duration-150"
            style={{
              background: "linear-gradient(135deg, #B45309 0%, #D97706 100%)",
              boxShadow: "0 3px 16px rgba(180,83,9,0.42)",
            }}
          >
            <span
              className="absolute inset-0 rounded-xl pointer-events-none motion-reduce:hidden"
              style={{
                background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2.6s ease-in-out infinite",
              }}
            />
            <span className="relative flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              召集伙伴
            </span>
          </button>
        </a>
      </div>
      {/* iOS 安全区 */}
      <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
interface LocationDetailClientProps {
  locationId: string;
}

/**
 * 地点详情页客户端组件
 * 角色：视觉总监 + 交互设计师 + 转化率优化师 三位一体
 */
export function LocationDetailClient({ locationId }: LocationDetailClientProps) {
  const [location, setLocation] = React.useState<Location | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [relatedLocations, setRelatedLocations] = React.useState<Location[]>([]);
  const [isFavorited, setIsFavorited] = React.useState(false);
  const [heartAnimating, setHeartAnimating] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [pois, setPois] = React.useState<RoutePoi[]>([]);

  // 图片画廊
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const [imageVisible, setImageVisible] = React.useState(true);
  const [showArrows, setShowArrows] = React.useState(false);
  // Lightbox
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  // 视差
  const [parallaxOffset, setParallaxOffset] = React.useState(0);
  const heroRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    loadLocation();
  }, [locationId]);

  // 视差滚动
  React.useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const scrollY = window.scrollY;
      const heroBottom = heroRef.current.getBoundingClientRect().bottom + scrollY;
      if (scrollY < heroBottom) {
        setParallaxOffset(scrollY * 0.28);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 获取用户会话
  React.useEffect(() => {
    fetchAPI("/auth/get-session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.role === "admin") setIsAdmin(true);
        if (data?.user?.id) setUserId(data.user.id);
      })
      .catch(() => {});
  }, []);

  // 初始化收藏状态
  React.useEffect(() => {
    if (!locationId || !userId) return;
    fetchAPI(`/favorites?entityType=location`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const favs: { entityId: string }[] = data.favorites || [];
        setIsFavorited(favs.some((f) => f.entityId === locationId));
      })
      .catch(() => {});
  }, [locationId, userId]);

  const loadLocation = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/locations/${locationId}`);
      const data = await res.json();
      if (data.success && data.location) {
        setLocation(data.location);
        loadTeams(data.location.id);
        loadRelatedLocations();
        loadPois(data.location.id);
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
    } catch (err) {
      console.error("[LocationDetail] 获取队伍失败:", err);
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
    } catch (err) {
      console.error("[LocationDetail] 获取相关地点失败:", err);
    }
  };

  const loadPois = async (locId: string) => {
    try {
      const data = await getLocationPois(locId);
      setPois(data || []);
    } catch (err) {
      console.error("[LocationDetail] 获取打卡点失败:", err);
    }
  };

  /** 图片切换（淡入淡出）*/
  const switchImage = (index: number) => {
    if (index === activeImageIndex) return;
    setImageVisible(false);
    setTimeout(() => {
      setActiveImageIndex(index);
      setImageVisible(true);
    }, 180);
  };

  const prevImage = (images: string[]) =>
    switchImage((activeImageIndex - 1 + images.length) % images.length);
  const nextImage = (images: string[]) =>
    switchImage((activeImageIndex + 1) % images.length);

  /** 收藏 */
  const handleFavorite = async () => {
    if (!userId) { window.location.href = "/login"; return; }
    setHeartAnimating(true);
    setTimeout(() => setHeartAnimating(false), 400);
    const newFavorited = !isFavorited;
    setIsFavorited(newFavorited);
    try {
      if (newFavorited) {
        await fetchAPI("/favorites", {
          method: "POST",
          body: JSON.stringify({ entityType: "location", entityId: locationId }),
        });
      } else {
        await fetchAPI(`/favorites?entityType=location&entityId=${locationId}`, { method: "DELETE" });
      }
    } catch {
      setIsFavorited(!newFavorited);
    }
  };

  /** 分享 */
  const handleShare = async () => {
    if (!location) return;
    setShowShareModal(true);
  };

  if (isLoading) return <LoadingSkeleton />;

  if (error || !location) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Mountain className="h-16 w-16 text-stone-200 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-stone-700 mb-3">
              {error || copy.api.locationNotFound}
            </h1>
            <a href="/locations" className="text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2 transition-colors">
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
    pill: "bg-white/20 text-white border-white/20",
  };

  // 构建画廊图片列表
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
    <main className="min-h-screen bg-stone-50 pb-24 lg:pb-0">
      <Navbar />

      {/* ================================================================
          Hero 封面区域（极致优化版）
          - 更高的视觉冲击力：更大的图片高度
          - 精致信息层次：面包屑→徽章→标题→数据条→指示器
          - 右上角操作组：编辑/分享/收藏
          - 左右箭头：hover 时滑入
          - 放大查看按钮 → Lightbox
          ================================================================ */}
      <div
        ref={heroRef}
        className="relative h-[480px] sm:h-[560px] lg:h-[640px] overflow-hidden bg-stone-900"
        onMouseEnter={() => setShowArrows(true)}
        onMouseLeave={() => setShowArrows(false)}
      >
        {/* 背景图（视差 + 淡入淡出）*/}
        {currentImage ? (
          <img
            key={currentImage}
            src={currentImage}
            alt={location.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: `translateY(${parallaxOffset}px) scale(1.1)`,
              opacity: imageVisible ? 1 : 0,
              transition: "opacity 0.18s ease",
              transformOrigin: "center top",
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
            <Mountain className="h-28 w-28 text-stone-600" />
          </div>
        )}

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-transparent" />

        {/* 放大查看按钮（hover 时显示）*/}
        {galleryImages.length > 0 && (
          <button
            onClick={() => setLightboxIndex(activeImageIndex)}
            className={cn(
              "absolute bottom-6 right-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs font-medium transition-all duration-200 border border-white/15",
              showArrows ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <ZoomIn className="h-3.5 w-3.5" />
            {galleryImages.length > 1 ? `${galleryImages.length} 张图片` : "查看大图"}
          </button>
        )}

        {/* 左右切换箭头 */}
        {hasMultiple && (
          <>
            <button
              onClick={() => prevImage(galleryImages)}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-10",
                "w-11 h-11 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md",
                "flex items-center justify-center transition-all duration-200 border border-white/10",
                showArrows ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
              )}
              aria-label="上一张"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={() => nextImage(galleryImages)}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-10",
                "w-11 h-11 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md",
                "flex items-center justify-center transition-all duration-200 border border-white/10",
                showArrows ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3 pointer-events-none"
              )}
              aria-label="下一张"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </>
        )}

        {/* 底部内容区 */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-7">
          <div className="max-w-7xl mx-auto">

            {/* 面包屑 */}
            <a
              href="/locations"
              className="inline-flex items-center gap-1 text-white/55 hover:text-white/85 text-xs mb-3 transition-colors duration-150 font-medium"
            >
              <MapPin className="h-3 w-3" />
              {copy.nav.locations}
              <ChevronRight className="h-3 w-3 opacity-60" />
            </a>

            {/* 徽章行 */}
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              {diffInfo.label && (
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-sm",
                  diffInfo.pill
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", diffInfo.dot)} />
                  {diffInfo.label}
                </span>
              )}
              {location.bestSeason && location.bestSeason.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/15 text-white backdrop-blur-sm border border-white/20">
                  <Sparkles className="w-3 h-3" />
                  {SEASON_LABEL[location.bestSeason[0]] ?? location.bestSeason[0]}
                </span>
              )}
            </div>

            {/* 标题 */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-1.5 drop-shadow-md">
              {location.name}
            </h1>
            {location.subtitle && (
              <p className="text-white/75 text-sm sm:text-base font-medium mb-1">{location.subtitle}</p>
            )}

            {/* 快速数据条 */}
            {(location.duration || (location as any).distance || (location as any).elevation) && (
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {location.duration && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/35 text-white/90 backdrop-blur-sm border border-white/10">
                    <Clock className="h-3 w-3 text-amber-300" />
                    {location.duration}
                  </span>
                )}
                {(location as any).distance && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/35 text-white/90 backdrop-blur-sm border border-white/10">
                    <Ruler className="h-3 w-3 text-sky-300" />
                    {(location as any).distance}
                  </span>
                )}
                {(location as any).elevation && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/35 text-white/90 backdrop-blur-sm border border-white/10">
                    <TrendingUp className="h-3 w-3 text-emerald-300" />
                    {(location as any).elevation}
                  </span>
                )}
              </div>
            )}

            {/* 圆点指示器 */}
            {hasMultiple && (
              <div className="flex items-center gap-1.5">
                {galleryImages.slice(0, 8).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => switchImage(idx)}
                    className={cn(
                      "rounded-full transition-all duration-200",
                      idx === activeImageIndex
                        ? "w-6 h-2 bg-white shadow-sm"
                        : "w-2 h-2 bg-white/35 hover:bg-white/60"
                    )}
                    aria-label={`切换到第 ${idx + 1} 张`}
                  />
                ))}
                {galleryImages.length > 8 && (
                  <span className="text-white/50 text-[10px] ml-0.5">+{galleryImages.length - 8}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          主内容区
          ================================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* 左/中栏 */}
          <div className="lg:col-span-2 space-y-5 pt-6">
            <LocationIntroCard
              location={location}
              address={location.address}
              coordinates={location.coordinates}
              actions={
                <>
                  {isAdmin && (
                    <a href={`/admin/locations/${locationId}/edit`}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-all duration-150 active:scale-95 border border-stone-200">
                        <Pencil className="h-3.5 w-3.5" />
                        {copy.admin.editLocation}
                      </button>
                    </a>
                  )}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-all duration-150 active:scale-95 border border-stone-200"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    {copy.locations.detailShareBtn}
                  </button>
                  <button
                    onClick={handleFavorite}
                    className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-all duration-150 active:scale-95 border border-stone-200"
                    aria-label={isFavorited ? "取消收藏" : "收藏"}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 transition-all duration-200",
                        isFavorited ? "fill-red-400 text-red-400 scale-110" : "text-stone-500"
                      )}
                      style={
                        heartAnimating
                          ? { animation: "heartbeat 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }
                          : undefined
                      }
                    />
                  </button>
                </>
              }
            />
            {/* TODO: 路线信息模块 - 后续实现 */}
            {/* <RouteInfoCard location={location} /> */}
            <PoiSection locationId={location.id} />
            <TeamListSection teams={teams} locationId={location.id} />
          </div>

          {/* 右栏 sticky */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4 -mt-12 relative z-10">
              <ActionCard location={location} teams={teams} />
              <RelatedLocations locations={relatedLocations} />
            </div>
          </div>
        </div>
      </div>

      {/* 移动端浮动操作栏 */}
      <MobileFloatingCTA location={location} heroRef={heroRef} />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={galleryImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i! - 1 + galleryImages.length) % galleryImages.length)}
          onNext={() => setLightboxIndex((i) => (i! + 1) % galleryImages.length)}
        />
      )}

      {/* 分享海报弹窗 */}
      {showShareModal && location && (
        <SharePosterModal
          type="location"
          title={location.name}
          subtitle={location.subtitle}
          url={typeof window !== "undefined" ? window.location.href : ""}
          imageUrl={location.coverImage}
          meta={location.address}
          tags={location.tags?.map((t) => t.name)}
          pois={pois.map((p) => ({ name: p.name, roleType: p.roleType }))}
          description={location.description}
          onClose={() => setShowShareModal(false)}
        />
      )}

      <Footer />
    </main>
  );
}
