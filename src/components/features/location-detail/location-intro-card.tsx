import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  ImageIcon,
  Navigation,
  Check,
  Copy,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { openExternalLink } from "@/lib/open-external";
import { cn } from "@/lib/utils";
import type { Location, Tag } from "@/lib/types";

interface LocationIntroCardProps {
  location: Location;
  actions?: React.ReactNode;
  address?: string;
  showGallery?: boolean;
  showTravelMeta?: boolean;
}

/**
 * 地点介绍卡片
 * - 超过 4 行时截断，点击「展开全文」可查看完整描述
 * - 图片缩略图画廊行（可点击放大）
 * - 标签胶囊（分类色彩）
 */
export function LocationIntroCard({
  location,
  actions,
  address,
  showGallery = true,
  showTravelMeta = true,
}: LocationIntroCardProps) {
  const { t } = useI18n([
    "locations",
    "enums",
    "common",
    "locationDetail",
    "admin",
  ]);
  const [expanded, setExpanded] = React.useState(false);
  const [isOverflow, setIsOverflow] = React.useState(false);
  const descRef = React.useRef<HTMLParagraphElement>(null);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [lightboxActive, setLightboxActive] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const hasValidCoordinates = Boolean(
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    !(location.latitude === 0 && location.longitude === 0),
  );

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 静默失败
    }
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasValidCoordinates) return;
    const dest = encodeURIComponent(location.name || address || "");
    const url = `https://uri.amap.com/navigation?to=${location.longitude},${location.latitude},${dest}&callnative=0`;
    openExternalLink(url);
  };

  React.useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    setIsOverflow(el.scrollHeight > el.clientHeight + 2);
  }, [location.description]);

  const galleryImages = React.useMemo(() => {
    const all: string[] = [];
    if (location.coverImageUrl) all.push(location.coverImageUrl);
    if (location.images) {
      for (const img of location.images) {
        if (img && img !== location.coverImageUrl) all.push(img);
      }
    }
    return all;
  }, [location.coverImageUrl, location.images]);

  const seasonLabels: Record<string, string> = {
    spring: t("enums.season.spring"),
    春季: t("enums.season.spring"),
    summer: t("enums.season.summer"),
    夏季: t("enums.season.summer"),
    autumn: t("enums.season.autumn"),
    秋季: t("enums.season.autumn"),
    winter: t("enums.season.winter"),
    冬季: t("enums.season.winter"),
  };

  const openLightbox = (idx: number) => {
    setLightboxActive(idx);
    setLightboxIndex(idx);
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-warm-sm">
      {((showGallery && galleryImages.length > 0) || actions) && (
        <div className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-3 pb-1">
            {showGallery && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1">
                {galleryImages.slice(0, 6).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => openLightbox(idx)}
                    className="relative flex-shrink-0 w-[88px] h-[66px] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 group"
                    aria-label={t("locationDetail.imageAlt", {
                      index: String(idx + 1),
                    })}
                  >
                    <img
                      src={img}
                      alt={t("locationDetail.imageAlt", {
                        index: String(idx + 1),
                      })}
                      className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 transition-transform duration-300 group-hover:scale-108 dark:outline-white/10"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 rounded-xl" />
                    {idx === 5 && galleryImages.length > 6 && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded-xl">
                        <span className="text-white text-xs font-bold flex flex-col items-center gap-0.5">
                          <ImageIcon className="h-4 w-4" />+
                          {galleryImages.length - 6}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {actions && (
              <div className="flex items-center gap-2 shrink-0">{actions}</div>
            )}
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="h-5 w-1 rounded-full bg-amber-400" />
            {t("locations.locationIntro")}
          </h2>
          {location.supportedActivityTypes.map((activityType) => (
            <span
              key={activityType}
              className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-100 dark:border-amber-900/50"
            >
              {t(`enums.locationType.${activityType}`)}
            </span>
          ))}
        </div>

        <div className="relative">
          <p
            ref={descRef}
            className={cn(
              "max-w-3xl text-[0.9375rem] leading-8 text-stone-600 transition-[opacity,max-height] duration-200 dark:text-stone-400",
              !expanded && "line-clamp-4",
            )}
          >
            {location.description}
          </p>
          {!expanded && isOverflow && (
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white/30 dark:from-transparent/50 to-transparent pointer-events-none" />
          )}
        </div>

        {isOverflow && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2.5 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-semibold transition-colors"
          >
            {expanded ? (
              <>
                {" "}
                {t("common.collapse")} <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                {" "}
                {t("common.expandAll")} <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}

        {location.tags && location.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-stone-100 pt-5 dark:border-stone-800">
            {location.tags.map((tag: Tag, i: number) => (
              <span
                key={tag?.id ?? i}
                className="px-3 py-1 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-full text-xs font-medium border border-stone-100 dark:border-stone-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:hover:text-amber-400 hover:border-amber-100 dark:hover:border-amber-900/50 transition-colors duration-150 cursor-default select-none"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {showTravelMeta &&
          (address ||
            (location.extra.hiking?.bestSeasons?.length ?? 0) > 0) && (
            <div className="mt-5 border-t border-stone-100 pt-5 dark:border-stone-800">
              {address && (
                <div className="flex items-start gap-2.5 mb-3">
                  <MapPin className="h-4 w-4 text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed flex-1">
                    {address}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    {hasValidCoordinates && (
                      <button
                        type="button"
                        onClick={handleNavigate}
                        title={t("locations.navigateTooltip")}
                        aria-label={t("locations.navigateTooltip")}
                        className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
                      >
                        <Navigation className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCopy}
                      title={t("common.copyAddress")}
                      aria-label={t("common.copyAddress")}
                      className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {(location.extra.hiking?.bestSeasons?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                  <span className="text-xs text-stone-600 dark:text-stone-400">
                    {t("locations.detailSeasonsLabel")}：
                  </span>
                  {location.extra.hiking!.bestSeasons!.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-100 dark:border-amber-900/50"
                    >
                      {seasonLabels[s] ?? s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>

      {showGallery && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="absolute top-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/40 text-white/70 text-xs font-medium">
            {lightboxActive + 1} / {galleryImages.length}
          </div>
          {galleryImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxActive(
                  (i) => (i - 1 + galleryImages.length) % galleryImages.length,
                );
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/30 flex items-center justify-center transition-colors"
              aria-label={t("locationDetail.prevImage")}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
          )}
          <img
            src={galleryImages[lightboxActive]}
            alt={t("locationDetail.imageAlt", {
              index: String(lightboxActive + 1),
            })}
            className="max-h-[88vh] max-w-[90vw] rounded-xl object-contain shadow-2xl outline outline-1 -outline-offset-1 outline-white/10"
            onClick={(e) => e.stopPropagation()}
          />
          {galleryImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxActive((i) => (i + 1) % galleryImages.length);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/30 flex items-center justify-center transition-colors"
              aria-label={t("locationDetail.nextImage")}
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          )}
          <p className="absolute bottom-6 text-white/50 text-xs">
            {t("common.posterNavHint")}
          </p>
        </div>
      )}
    </section>
  );
}
