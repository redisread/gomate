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
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/i18n";
import { fetchAPI } from "@/lib/api";
import type { Location, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  LocationIntroCard,
  RouteInfoCard,
  TeamListSection,
  DecisionBlock,
} from "@/components/features/location-detail-main-content";
import { LocationActivityPosts } from "@/components/features/activity-posts";
import { normalizeLocationHiking, type RouteMetric } from "@/components/features/location-detail/route-utils";

// 动态导入 SharePosterModal
const SharePosterModal = React.lazy(() => import("./share-poster-modal").then(m => ({ default: m.SharePosterModal })));

// ─── 季节映射 ─────────────────────────────────────────────────────────────────
function getSeasonLabel(t: (key: TranslationKey) => string) {
  return {
    spring: t("admin.seasons.spring"),
    summer: t("admin.seasons.summer"),
    autumn: t("admin.seasons.autumn"),
    winter: t("admin.seasons.winter"),
  };
}

function getDifficultyInfo(t: (key: TranslationKey) => string) {
  return {
    easy: {
      label: t("enums.difficulty.easy"),
      dot: "bg-emerald-400",
      text: "text-emerald-700 dark:text-emerald-400",
      pill: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30",
    },
    moderate: {
      label: t("enums.difficulty.moderate"),
      dot: "bg-amber-400",
      text: "text-amber-700 dark:text-amber-400",
      pill: "bg-amber-500/20 text-amber-100 border-amber-400/30",
    },
    hard: {
      label: t("enums.difficulty.hard"),
      dot: "bg-orange-500",
      text: "text-orange-700 dark:text-orange-400",
      pill: "bg-orange-500/20 text-orange-100 border-orange-400/30",
    },
    expert: {
      label: t("enums.difficulty.expert"),
      dot: "bg-red-500",
      text: "text-red-700 dark:text-red-400",
      pill: "bg-red-500/20 text-red-100 border-red-400/30",
    },
  };
}

// ─── 骨架屏 ───────────────────────────────────────────────────────────────────
function LoadingNavbarSkeleton() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/20 dark:bg-stone-900/20 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mountain className="h-7 w-7 text-amber-500" />
            <span className="text-xl font-bold text-amber-500">GoMate</span>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <div className="h-8 w-16 rounded-full bg-white/45 dark:bg-stone-800/50" />
            <div className="h-8 w-16 rounded-full bg-white/35 dark:bg-stone-800/40" />
            <div className="h-8 w-56 rounded-full bg-white/45 dark:bg-stone-800/50" />
          </div>
          <div className="h-9 w-9 rounded-lg bg-white/45 dark:bg-stone-800/50 md:hidden" />
        </div>
      </div>
    </header>
  );
}

function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24 lg:pb-0">
      <LoadingNavbarSkeleton />
      <div className="relative h-[390px] sm:h-[460px] lg:h-[520px] overflow-hidden bg-stone-200 dark:bg-stone-800 skeleton">
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <div className="h-8 w-16 rounded-full bg-stone-300/60 dark:bg-stone-700/60" />
          <div className="h-9 w-9 rounded-full bg-stone-300/60 dark:bg-stone-700/60" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-8">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="h-4 w-28 rounded bg-stone-300/50 dark:bg-stone-700/50" />
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-stone-300/60 dark:bg-stone-700/60" />
              <div className="h-6 w-20 rounded-full bg-stone-300/60 dark:bg-stone-700/60" />
            </div>
            <div className="h-10 w-64 rounded-lg bg-stone-300/60 dark:bg-stone-700/60" />
            <div className="h-4 w-48 rounded bg-stone-300/50 dark:bg-stone-700/50" />
            <div className="flex gap-3 pt-2">
              <div className="h-8 w-20 rounded-full bg-stone-300/50 dark:bg-stone-700/50" />
              <div className="h-8 w-20 rounded-full bg-stone-300/50 dark:bg-stone-700/50" />
              <div className="h-8 w-20 rounded-full bg-stone-300/50 dark:bg-stone-700/50" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
          <div className="space-y-6">
            <div className="h-48 rounded-2xl bg-stone-200 skeleton dark:bg-stone-800" />
            <div className="h-64 rounded-2xl bg-stone-200 skeleton dark:bg-stone-800" />
            <div className="h-56 rounded-2xl bg-stone-200 skeleton dark:bg-stone-800" />
          </div>
          <div className="hidden h-72 rounded-2xl bg-stone-200 skeleton dark:bg-stone-800 lg:block" />
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
  const { t } = useI18n(["locationDetail", "locations", "common", "errors", "admin", "nav", "enums"]);
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
        aria-label={t("locationDetail.closeImage")}
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
          aria-label={t("locationDetail.prevImage")}
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
      )}

      {/* 图片 */}
      <img
        src={images[index]}
        alt={t("locationDetail.imageAlt", { index: String(index + 1) })}
        className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl outline outline-1 -outline-offset-1 outline-white/10"
        onClick={(e) => e.stopPropagation()}
      />

      {/* 下一张 */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
          aria-label={t("locationDetail.nextImage")}
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
                "w-10 h-10 rounded-lg overflow-hidden border-2 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200",
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

function ActionCard({ location, teams }: ActionCardProps) {
  const { t } = useI18n(["locationDetail", "locations", "common", "errors", "admin", "nav", "enums"]);
  const totalParticipants = teams.reduce((sum, t) => sum + (t.currentMembers || 0), 0);
  const avatarLeaders = teams.filter((t) => t.leader?.avatar).slice(0, 5);
  const socialProofText =
    teams.length > 0
      ? t("locationDetail.socialProof", { participants: totalParticipants, teams: teams.length })
      : t("locationDetail.firstCreator");

  return (
    <section
      aria-labelledby="location-action-title"
      className="rounded-2xl bg-card p-5 shadow-warm-sm"
    >
      <div>
        {/* 情感标题 */}
        <h2 id="location-action-title" className="text-base font-bold text-foreground">
          {t("locations.detailParticipate")}
        </h2>

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
          <p className="text-xs font-medium text-stone-600 dark:text-stone-400">
            {socialProofText}
          </p>
        </div>

        {/* 活跃度指示 */}
        {teams.length > 0 && (
          <div
            className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50"
          >
            <Flame className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            <span className="text-2xs font-semibold text-emerald-700 dark:text-emerald-400">
              {t("locationDetail.activeRecruiting")}
            </span>
          </div>
        )}

        {/* 主 CTA */}
        <a
          href={`/teams/create?locationId=${location.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 py-3.5 text-sm font-bold text-white shadow-card-hover transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-amber-800 active:scale-[0.96] dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
        >
          <Users className="h-4 w-4" />
          {t("locations.detailCreateTeam")}
        </a>

        {/* 次要 CTA */}
        <a
          href={`/teams?locationId=${location.id}`}
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-stone-200 bg-transparent py-2.5 text-sm font-semibold text-foreground transition-[transform,background-color,border-color] duration-150 hover:border-stone-300 hover:bg-stone-50 active:scale-[0.96] dark:border-stone-700 dark:hover:border-stone-600 dark:hover:bg-stone-800"
        >
          {t("locations.detailBrowseTeams")}
        </a>
      </div>
    </section>
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
  const { t } = useI18n(["locationDetail", "locations", "common", "errors", "admin", "nav", "enums"]);
  const diffInfo = getDifficultyInfo(t);

  if (locations.length === 0) return null;

  const diffBadgeConfig: Record<string, { bg: string; text: string; dot: string }> = {
    easy: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-400" },
    moderate: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-400" },
    hard: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
    expert: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  };

  return (
    <section className="rounded-2xl bg-card p-5 shadow-warm-sm sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          {t("locations.relatedTitle")}
        </h3>
        <a
          href="/locations"
          className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-semibold transition-colors flex items-center gap-0.5"
        >
          {t("common.viewAll")}
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="space-y-2">
        {locations.map((loc) => {
          const diff = loc.difficulty ? diffBadgeConfig[loc.difficulty] : null;
          const diffLabel = loc.difficulty ? diffInfo[loc.difficulty]?.label : null;

          return (
            <a
              key={loc.id}
              href={`/locations/${loc.id}`}
              className="flex items-center gap-3 group rounded-xl p-2 -mx-2 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              <div className="w-[68px] h-[52px] rounded-xl overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-stone-800">
                {loc.coverImage ? (
                  <img
                    src={loc.coverImage}
                    alt={loc.name}
                    className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 transition-transform duration-300 group-hover:scale-110 dark:outline-white/10"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Mountain className="h-5 w-5 text-stone-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 title={loc.name} className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors text-sm truncate leading-snug">
                  {loc.name}
                </h4>
                {diff && diffLabel && (
                  <span className={cn("inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-3xs font-semibold", diff.bg, diff.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", diff.dot)} />
                    {diffLabel}
                  </span>
                )}
              </div>

              <ChevronRight className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </section>
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
  const { t } = useI18n(["locationDetail", "locations", "common", "errors", "admin", "nav", "enums"]);
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
        "lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-300 bg-white/96 dark:bg-stone-900/96 backdrop-blur-md",
        heroLeft ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}
      style={{
        borderTop: "1px solid rgba(217,119,6,0.12)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
      }}
    >
      <div className="max-w-7xl mx-auto px-3 py-3 flex items-center gap-2.5 sm:px-4 sm:gap-3 max-[360px]:px-2 max-[360px]:gap-2">
        {/* 地点信息 */}
        <div className="flex-1 min-w-0 max-[360px]:hidden">
          <p className="text-3xs text-stone-500 dark:text-stone-500 font-semibold uppercase tracking-wide">{t("locationDetail.destination")}</p>
          <p title={location.name} className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate leading-tight">{location.name}</p>
        </div>

        {/* 浏览队伍 */}
        <a href={`/teams?locationId=${location.id}`} className="flex-shrink-0 max-[360px]:flex-1">
          <span className="flex min-h-11 items-center justify-center rounded-xl border border-stone-200 px-3 text-sm font-semibold text-foreground transition-[transform,background-color,border-color] duration-150 hover:bg-stone-50 active:scale-[0.96] dark:border-stone-700 dark:hover:bg-stone-800 sm:px-4 max-[360px]:w-full max-[360px]:px-2">
            {t("locationDetail.browseTeams")}
          </span>
        </a>

        {/* 主 CTA */}
        <a href={`/teams/create?locationId=${location.id}`} className="flex-shrink-0 max-[360px]:flex-1">
          <span className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-700 px-4 text-sm font-bold text-white shadow-glow transition-[transform,background-color] duration-150 hover:bg-amber-800 active:scale-[0.96] dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 max-[360px]:px-2 sm:px-5">
            <Users className="h-4 w-4" />
            {t("locationDetail.gatherPartners")}
          </span>
        </a>
      </div>
      {/* iOS 安全区 */}
      <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
    </div>
  );
}

function formatRouteMetric(
  metric: RouteMetric | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  if (!metric) return null;
  const unit = metric.unit ? t(`locationDetail.metricUnits.${metric.unit}`) : "";
  return unit ? `${metric.value} ${unit}` : metric.value;
}

function HeroMetricPill({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
      {icon}
      {value}
    </span>
  );
}

function HeroActions({
  location,
  isAdmin,
  isFavorited,
  heartAnimating,
  onShare,
  onFavorite,
}: {
  location: Location;
  isAdmin: boolean;
  isFavorited: boolean;
  heartAnimating: boolean;
  onShare: () => void;
  onFavorite: () => void;
}) {
  const { t } = useI18n(["locationDetail", "locations", "admin"]);
  return (
    <div className="absolute right-4 top-20 z-20 flex items-center gap-2 sm:right-6">
      {isAdmin && (
        <a
          href={`/admin/locations/${location.id}/edit`}
          title={t("admin.editLocation")}
          aria-label={t("admin.editLocation")}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition-[background-color,transform] duration-150 hover:bg-black/55 active:scale-[0.96]"
          >
            <Pencil className="h-4 w-4" />
          </span>
        </a>
      )}
      <button
        type="button"
        onClick={onShare}
        title={t("locations.detailShareBtn")}
        aria-label={t("locations.detailShareBtn")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Share2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onFavorite}
        title={isFavorited ? t("locationDetail.unfavorite") : t("locationDetail.favorite")}
        aria-label={isFavorited ? t("locationDetail.unfavorite") : t("locationDetail.favorite")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200",
            isFavorited ? "fill-red-400 text-red-400 scale-110" : "text-white"
          )}
          style={
            heartAnimating
              ? { animation: "heartbeat 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }
              : undefined
          }
        />
      </button>
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
  const { t } = useI18n(["locationDetail", "locations", "common", "errors", "admin", "nav", "enums"]);
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

  // 图片画廊
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const [imageVisible, setImageVisible] = React.useState(true);
  const [showArrows, setShowArrows] = React.useState(false);
  // Lightbox
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const resolvedLocationId = location?.id;

  // 视差
  const [parallaxOffset, setParallaxOffset] = React.useState(0);
  const heroRef = React.useRef<HTMLDivElement>(null);

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
    if (!resolvedLocationId || !userId) return;
    fetchAPI(`/favorites?entityType=location`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const favs: { entityId: string }[] = data.favorites || [];
        setIsFavorited(favs.some((f) => f.entityId === resolvedLocationId));
      })
      .catch(() => {});
  }, [resolvedLocationId, userId]);

  const loadLocation = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/locations/${locationId}`);
      const data = await res.json();
      if (data.success && data.location) {
        setLocation(data.location);
        loadTeams(data.location.id);
        loadRelatedLocations(data.location.id);
      } else {
        setError(t("errors.locationNotFound"));
      }
    } catch {
      setError(t("common.loading"));
    } finally {
      setIsLoading(false);
    }
  }, [locationId, t]);

  React.useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  const loadTeams = async (locId: string) => {
    try {
      const res = await fetchAPI(`/api/teams?locationId=${locId}&status=recruiting&pageSize=5`);
      const data = await res.json();
      if (data.success) setTeams(data.teams || []);
    } catch (err) {
      console.error("[LocationDetail] 获取队伍失败:", err);
    }
  };

  const loadRelatedLocations = async (currentLocationId: string) => {
    try {
      const res = await fetchAPI("/api/locations?pageSize=4");
      const data = await res.json();
      if (data.success) {
        setRelatedLocations(
          (data.locations || []).filter((l: Location) => l.id !== currentLocationId).slice(0, 3)
        );
      }
    } catch (err) {
      console.error("[LocationDetail] 获取相关地点失败:", err);
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
      if (!location) return;
      if (newFavorited) {
        await fetchAPI("/favorites", {
          method: "POST",
          body: JSON.stringify({ entityType: "location", entityId: location.id }),
        });
      } else {
        await fetchAPI(`/favorites?entityType=location&entityId=${location.id}`, { method: "DELETE" });
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
      <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Mountain className="h-16 w-16 text-stone-200 dark:text-stone-700 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-stone-700 dark:text-stone-300 mb-3">
              {error || t("errors.locationNotFound")}
            </h1>
            <a href="/locations" className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium underline underline-offset-2 transition-colors">
              {t("common.back")}
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // task #154：hero 徒步参数直读 location 字段（normalizeLocationRoutes 随 routes 删除退场）
  const heroHiking = normalizeLocationHiking(location);
  const heroDifficulty = location.difficulty;
  const diffInfo = getDifficultyInfo(t)[heroDifficulty as keyof ReturnType<typeof getDifficultyInfo>] ?? {
    label: heroDifficulty || "",
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
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24 lg:pb-0">
      <Navbar />

      {/* ================================================================
          Hero 封面区域
          - 图片负责目的地氛围，核心路线信息前移到首屏下方
          - 右上角保留编辑/分享/收藏
          - 左右箭头：hover 时滑入
          - 放大查看按钮 → Lightbox
          ================================================================ */}
      <div
        ref={heroRef}
        className="relative h-[390px] sm:h-[460px] lg:h-[520px] overflow-hidden bg-stone-900"
        onMouseEnter={() => setShowArrows(true)}
        onMouseLeave={() => setShowArrows(false)}
      >
        {/* 背景图（视差 + 淡入淡出）*/}
        {currentImage ? (
          <img
            key={currentImage}
            src={currentImage}
            alt={location.name}
            className="absolute inset-0 h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
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

        <HeroActions
          location={location}
          isAdmin={isAdmin}
          isFavorited={isFavorited}
          heartAnimating={heartAnimating}
          onShare={handleShare}
          onFavorite={handleFavorite}
        />

        {/* 放大查看按钮（hover 时显示）*/}
        {galleryImages.length > 0 && (
          <button
            onClick={() => setLightboxIndex(activeImageIndex)}
            className={cn(
              "absolute bottom-6 right-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs font-medium transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 border border-white/15",
              showArrows ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <ZoomIn className="h-3.5 w-3.5" />
            {galleryImages.length > 1 ? `${galleryImages.length} ${t("locationDetail.imagesCount")}` : t("locationDetail.viewLargeImage")}
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
                "flex items-center justify-center transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 border border-white/10",
                showArrows ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
              )}
              aria-label={t("locationDetail.prevImage")}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={() => nextImage(galleryImages)}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-10",
                "w-11 h-11 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md",
                "flex items-center justify-center transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 border border-white/10",
                showArrows ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3 pointer-events-none"
              )}
              aria-label={t("locationDetail.nextImage")}
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
              {t("nav.locations")}
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
                  {getSeasonLabel(t)[location.bestSeason[0] as keyof ReturnType<typeof getSeasonLabel>] ?? location.bestSeason[0]}
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
            {heroHiking && (
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <HeroMetricPill
                  icon={<Clock className="h-3 w-3 text-amber-300" />}
                  value={formatRouteMetric(heroHiking.duration, t)}
                />
                <HeroMetricPill
                  icon={<Ruler className="h-3 w-3 text-sky-300" />}
                  value={formatRouteMetric(heroHiking.distance, t)}
                />
                <HeroMetricPill
                  icon={<TrendingUp className="h-3 w-3 text-emerald-300" />}
                  value={formatRouteMetric(heroHiking.elevation, t)}
                />
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
                      "rounded-full transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200",
                      idx === activeImageIndex
                        ? "w-6 h-2 bg-white shadow-sm"
                        : "w-2 h-2 bg-white/35 hover:bg-white/60"
                    )}
                    aria-label={t("locationDetail.switchImage", { index: String(idx + 1) })}
                  />
                ))}
                {galleryImages.length > 8 && (
                  <span className="text-white/50 text-3xs ml-0.5">+{galleryImages.length - 8}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          主内容区
          ================================================================ */}
      <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">

          {/* 左/中栏 */}
          <div className="flex flex-col gap-6 pt-6 lg:pt-8">
            <div>
              <LocationIntroCard
                location={location}
                showGallery={false}
                showTravelMeta
              />
            </div>
            <RouteInfoCard location={location} />
            <div>
              <TeamListSection teams={teams} locationId={location.id} />
            </div>
            <DecisionBlock location={location} />
            <div>
              <LocationActivityPosts locationId={location.id} />
            </div>
          </div>

          {/* 右栏 sticky */}
          <div>
            <div className="relative z-10 space-y-4 lg:sticky lg:top-24 lg:-mt-12">
              <div className="hidden space-y-4 lg:block">
                <ActionCard location={location} teams={teams} />
              </div>
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
        <React.Suspense fallback={null}>
          <SharePosterModal
            type="location"
            id={location.id}
            title={location.name}
            url={typeof window !== "undefined" ? window.location.href : ""}
            onClose={() => setShowShareModal(false)}
          />
        </React.Suspense>
      )}

      <Footer />
    </main>
  );
}
