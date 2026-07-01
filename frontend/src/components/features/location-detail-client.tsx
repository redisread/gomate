"use client";

import * as React from "react";
import { Mountain, ChevronRight, MapPin, Sparkles, X, ZoomIn } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useLocationDetail } from "@/hooks/useLocationDetail";
import { useLocationFavorite } from "@/hooks/useLocationFavorite";
import { useImageGallery } from "@/hooks/useImageGallery";
import { LocationDetailInfo } from "./location-detail/location-detail-info";
import { LocationDetailTeams } from "./location-detail/location-detail-teams";
import { LocationDetailRelated } from "./location-detail/location-detail-related";
import { normalizeLocationRoutes } from "./location-detail/route-utils";

// 动态导入 SharePosterModal
const SharePosterModal = React.lazy(() => import("./share-poster-modal").then(m => ({ default: m.SharePosterModal })));

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

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

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
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
      <div className="pt-20 px-4 max-w-7xl mx-auto">
        <div className="h-[390px] sm:h-[460px] lg:h-[520px] bg-stone-200 dark:bg-stone-800 rounded-xl animate-pulse" />
        <div className="mt-8 space-y-4">
          <div className="h-8 w-64 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
          <div className="h-4 w-48 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
          <div className="h-24 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

interface LocationDetailClientProps {
  locationId: string;
}

export function LocationDetailClient({ locationId }: LocationDetailClientProps) {
  const { t } = useI18n(["locationDetail", "locations", "common", "errors", "admin", "nav", "enums"]);

  // 使用自定义 hooks
  const { location, teams, relatedLocations, isLoading, error } = useLocationDetail({
    locationId,
    onError: (err) => console.error("[LocationDetail]", err),
  });

  const [_isAdmin, setIsAdmin] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [showShareModal, setShowShareModal] = React.useState(false);

  // 获取用户会话
  React.useEffect(() => {
    fetch("/auth/get-session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.role === "admin") setIsAdmin(true);
        if (data?.user?.id) setUserId(data.user.id);
      })
      .catch(() => {});
  }, []);

  const { isFavorited, heartAnimating, toggleFavorite } = useLocationFavorite({
    locationId: location?.id,
    userId,
    onLoginRequired: () => { window.location.href = "/login"; },
  });

  const {
    activeIndex: activeImageIndex,
    visible: imageVisible,
    showArrows,
    lightboxIndex,
    parallaxOffset,
    heroRef,
    switchImage,
    prevImage,
    nextImage,
    openLightbox,
    closeLightbox,
    setShowArrows,
  } = useImageGallery({
    images: location ? [location.coverImage, ...(location.images || [])].filter(Boolean) : [],
  });

  // Loading
  if (isLoading) return <LoadingSkeleton />;

  // Error
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
            <a href="/locations" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium underline underline-offset-2 transition-colors">
              {t("common.back")}
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // 计算派生数据
  const normalizedRoutes = normalizeLocationRoutes(location);
  const primaryRoute = normalizedRoutes[0];
  const heroDifficulty = location.difficulty ?? primaryRoute?.difficulty;
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

      {/* Hero 封面区域 */}
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

        {/* 操作按钮 */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            onClick={toggleFavorite}
            className={cn(
              "p-2 rounded-full backdrop-blur-md transition-all duration-200 border border-white/15",
              isFavorited ? "bg-red-500/80 text-white" : "bg-black/35 text-white hover:bg-black/55"
            )}
            aria-label={isFavorited ? "取消收藏" : "收藏"}
          >
            <span className={cn("text-lg", heartAnimating && "animate-bounce")}>
              {isFavorited ? "❤️" : "🤍"}
            </span>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="p-2 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white transition-all duration-200 border border-white/15"
            aria-label="分享"
          >
            <span className="text-lg">📤</span>
          </button>
        </div>

        {/* 放大查看按钮 */}
        {galleryImages.length > 0 && (
          <button
            onClick={() => openLightbox(activeImageIndex)}
            className={cn(
              "absolute bottom-6 right-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs font-medium transition-all duration-200 border border-white/15",
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
              onClick={() => prevImage()}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-10",
                "w-11 h-11 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md",
                "flex items-center justify-center transition-all duration-200 border border-white/10",
                showArrows ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
              )}
              aria-label={t("locationDetail.prevImage")}
            >
              <span className="text-white text-lg">←</span>
            </button>
            <button
              onClick={() => nextImage()}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-10",
                "w-11 h-11 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md",
                "flex items-center justify-center transition-all duration-200 border border-white/10",
                showArrows ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3 pointer-events-none"
              )}
              aria-label={t("locationDetail.nextImage")}
            >
              <span className="text-white text-lg">→</span>
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
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：主要内容 */}
          <div className="lg:col-span-2 space-y-8">
            <LocationDetailInfo
              location={location}
              primaryRoute={primaryRoute ? {
                duration: primaryRoute.duration,
                distance: primaryRoute.distance,
                elevation: primaryRoute.elevation,
              } : undefined}
            />
            <LocationDetailTeams
              teams={teams}
              locationSlug={location.slug}
            />
          </div>

          {/* 右侧：相关地点 */}
          <div className="space-y-6">
            <LocationDetailRelated locations={relatedLocations} />
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="关闭"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={galleryImages[lightboxIndex]}
            alt={location.name}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
          {hasMultiple && (
            <>
              <button
                onClick={() => switchImage((lightboxIndex - 1 + galleryImages.length) % galleryImages.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="上一张"
              >
                ←
              </button>
              <button
                onClick={() => switchImage((lightboxIndex + 1) % galleryImages.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="下一张"
              >
                →
              </button>
            </>
          )}
        </div>
      )}

      {/* 分享弹窗 */}
      {showShareModal && location && (
        <React.Suspense fallback={null}>
          <SharePosterModal
            type="location"
            id={location.id}
            title={location.name}
            url={`https://gomate.live/locations/${location.slug}`}
            onClose={() => setShowShareModal(false)}
          />
        </React.Suspense>
      )}

      <Footer />
    </main>
  );
}
