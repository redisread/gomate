"use client";
import type { BrowserSession } from "@/contracts/auth-api";
import type { ApiResult, LocationResponse, LocationsResponse } from "@/contracts/http-responses";

import { Button as SwButton } from "@/components/starwind-react/button";

import * as React from "react";
import { AnimatePresence, usePresence } from "motion/react";
import { animate } from "motion/mini";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { GalleryImage } from "./location-detail/gallery-image";
import { BrandIcon } from "@/components/brand-icon";
import {
  MapPin,
  Mountain,
  Users,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Pencil,
  X,
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI } from "@/lib/api";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Modal } from "@/components/ui/modal";
import { Footer } from "@/components/layout/footer";
import { LocationCoverGallery } from "@/components/features/location-detail/location-cover-gallery";
import { LocationIntroCard } from "@/components/features/location-detail/location-intro-card";
import { TeamListSection } from "@/components/features/location-detail/team-list-section";

function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-background pt-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <BrandIcon />
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="aspect-[3/2] rounded-3xl bg-muted skeleton" />
          <div className="space-y-5 py-8">
            <div className="h-12 w-2/3 rounded-xl bg-muted skeleton" />
            <div className="h-24 rounded-xl bg-muted skeleton" />
          </div>
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
  onSelect: (index: number) => void;
}

function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
  onSelect,
}: LightboxProps) {
  const { t } = useI18n([
    "locationDetail",
    "locations",
    "common",
    "errors",
    "admin",
    "nav",
    "enums",
  ]);
  const [present, remove] = usePresence();
  const reduced = useReducedMotion();
  const id = React.useId();
  React.useEffect(() => {
    const element = document.getElementById(id);
    if (!element) return;
    if (typeof element.animate !== "function") {
      if (!present) remove?.();
      return;
    }
    const animation = animate(
      element,
      { opacity: present ? [0, 1] : 0 },
      { duration: reduced ? 0 : 0.16 },
    );
    if (!present) void Promise.resolve(animation).then(() => remove?.());
    return () => animation.stop();
  }, [id, present, reduced, remove]);
  React.useEffect(() => {
    if (!present) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [present, onClose, onPrev, onNext]);

  return (
    <Modal
      id={id}
      open
      onClose={onClose}
      labelledBy="location-lightbox-title"
      overlayClassName="z-[100] flex items-center justify-center"
      backdropClassName="bg-black/92 backdrop-blur-md"
      panelClassName="pointer-events-none flex h-full w-full items-center justify-center [&_button]:pointer-events-auto [&_img]:pointer-events-auto"
    >
      <h2 id="location-lightbox-title" className="sr-only">
        {t("locationDetail.photoGallery")}
      </h2>
      {/* 关闭按钮 */}
      <SwButton variant="plain" size="inherit" type="button"
        onClick={onClose}
        className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors z-10"
        aria-label={t("locationDetail.closeImage")}
      >
        <X className="h-5 w-5 text-white" />
      </SwButton>

      {/* 计数器 */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/70 text-xs font-medium">
        {index + 1} / {images.length}
      </div>

      {/* 上一张 */}
      {images.length > 1 && (
        <SwButton variant="plain" size="inherit" type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
          aria-label={t("locationDetail.prevImage")}
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </SwButton>
      )}

      {/* 图片 */}
      <div className="relative h-[75dvh] w-[80vw]">
        <GalleryImage
          src={images[index]}
          alt={t("locationDetail.imageAlt", { index: String(index + 1) })}
          contain
        />
      </div>

      {/* 下一张 */}
      {images.length > 1 && (
        <SwButton variant="plain" size="inherit" type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
          aria-label={t("locationDetail.nextImage")}
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </SwButton>
      )}

      {/* 底部缩略图条 */}
      {images.length > 1 && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto flex max-w-[90vw] gap-2 overflow-x-auto p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <SwButton variant="plain" size="inherit" type="button"
              key={i}
              onClick={() => {
                if (present) onSelect(i);
              }}
              aria-label={t("locationDetail.switchImage", {
                index: String(i + 1),
              })}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "w-11 h-11 shrink-0 rounded-lg overflow-hidden border-2 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200",
                i === index
                  ? "border-white scale-110"
                  : "border-white/30 hover:border-white/60",
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </SwButton>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ActionCard({ location }: { location: Location }) {
  const { t } = useI18n(["locationDetail", "locations"]);
  return (
    <section
      aria-labelledby="location-action-title"
      className="rounded-3xl bg-warm-subtle p-6"
    >
      <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary shadow-card">
        <Users aria-hidden="true" className="h-5 w-5" />
      </span>
      <h2
        id="location-action-title"
        className="text-xl font-bold text-foreground"
      >
        {t("locations.detailParticipate")}
      </h2>
      <p className="mb-6 mt-3 text-sm leading-7 text-muted-foreground">
        {t("locationDetail.actionDescription")}
      </p>
      <SwButton as="a" variant="plain" size="inherit"
        href={`/teams/create?locationId=${location.id}`}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-foreground dark:text-primary-foreground shadow-card transition-[transform,background-color] hover:bg-primary/90 active:scale-[0.96] motion-reduce:transform-none"
      >
        <Users aria-hidden="true" className="h-4 w-4 shrink-0" />
        {t("locations.detailCreateTeam")}
      </SwButton>
      <SwButton as="a" variant="plain" size="inherit"
        href="#location-teams"
        className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-foreground hover:bg-card/60"
      >
        {t("locationDetail.browseTeams")}
        <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
      </SwButton>
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
  const { t } = useI18n([
    "locationDetail",
    "locations",
    "common",
    "errors",
    "admin",
    "nav",
    "enums",
  ]);

  if (locations.length === 0) return null;

  return (
    <section className="px-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-foreground">
          {t("locations.relatedTitle")}
        </h2>
        <a
          href="/locations"
          className="min-h-11 text-xs text-accent-foreground hover:text-foreground font-semibold transition-colors flex items-center gap-0.5"
        >
          {t("common.viewAll")}
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="space-y-2">
        {locations.map((loc) => {
          return (
            <a
              key={loc.id}
              href={`/locations/${loc.id}`}
              className="flex items-center gap-3 group rounded-xl p-2 -mx-2 transition-colors duration-150 hover:bg-muted"
            >
              <div className="w-[68px] h-[52px] rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                {loc.coverImageUrl ? (
                  <img
                    src={loc.coverImageUrl}
                    alt={loc.name}
                    className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Mountain className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  title={loc.name}
                  className="font-semibold text-foreground group-hover:text-accent-foreground transition-colors text-sm truncate leading-snug"
                >
                  {loc.name}
                </h3>
              </div>

              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent-foreground transition-colors flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </section>
  );
}

function MobileFloatingCTA({ location }: { location: Location }) {
  const { t } = useI18n(["locationDetail"]);
  return (
    <nav
      aria-label={t("locationDetail.gatherPartners")}
      data-testid="location-mobile-actions"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-stretch gap-3 rounded-3xl bg-card/95 p-3 shadow-card-hover backdrop-blur-md lg:hidden"
    >
      <SwButton as="a" variant="plain" size="inherit"
        href="#location-teams"
        className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-2xl bg-muted px-3 py-2 text-center text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
      >
        {t("locationDetail.browseTeams")}
      </SwButton>
      <SwButton as="a" variant="plain" size="inherit"
        href={`/teams/create?locationId=${location.id}`}
        className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2 text-center text-sm font-semibold text-foreground dark:text-primary-foreground transition-[transform,background-color] hover:bg-primary/90 active:scale-[0.96] motion-reduce:transform-none"
      >
        <Users aria-hidden="true" className="h-4 w-4 shrink-0" />
        {t("locationDetail.gatherPartners")}
      </SwButton>
    </nav>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
interface LocationDetailClientProps {
  locationId: string;
}

export function LocationDetailClient({
  locationId,
}: LocationDetailClientProps) {
  const { t } = useI18n([
    "locationDetail",
    "locations",
    "common",
    "errors",
    "admin",
    "nav",
    "enums",
  ]);
  const [location, setLocation] = React.useState<Location | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<"missing" | "failed" | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const [relatedLocations, setRelatedLocations] = React.useState<Location[]>(
    [],
  );
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const closeLightbox = React.useCallback(() => setLightboxIndex(null), []);

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchAPI("/auth/get-session", { signal: controller.signal })
      .then((res) => res.json<BrowserSession>())
      .then((data) => {
        if (!controller.signal.aborted)
          setIsAdmin(data?.user?.role === "admin");
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(15_000),
    ]);
    setIsLoading(true);
    setError(null);
    setLocation(null);
    setRelatedLocations([]);
    setLightboxIndex(null);
    void (async () => {
      try {
        const res = await fetchAPI(`/locations/${locationId}`, { signal });
        if (res.status === 404) {
          if (!signal.aborted) setError("missing");
          return;
        }
        if (!res.ok) throw new Error("location_unavailable");
        const data = await res.json<ApiResult<LocationResponse>>();
        if (!data.success || !data.location)
          throw new Error("location_unavailable");
        if (!signal.aborted) setLocation(data.location);
      } catch {
        if (!controller.signal.aborted) setError("failed");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();
    void fetchAPI("/locations?limit=4", { signal })
      .then((res) => (res.ok ? res.json<ApiResult<LocationsResponse>>() : null))
      .then((data) => {
        if (!signal.aborted && data?.success)
          setRelatedLocations(
            data.locations
              .filter((item) => item.id !== locationId)
              .slice(0, 3),
          );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [locationId, attempt]);

  if (isLoading) return <LoadingSkeleton />;
  if (error || !location)
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
          <Mountain
            aria-hidden="true"
            className="mb-6 h-12 w-12 text-primary"
          />
          <h1 className="text-xl font-bold text-foreground">
            {t(
              error === "missing"
                ? "errors.locationNotFound"
                : "locationDetail.locationLoadFailed",
            )}
          </h1>
          {error !== "missing" && (
            <SwButton variant="plain" size="inherit"
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="mt-6 min-h-11 rounded-xl bg-primary px-5 text-foreground dark:text-primary-foreground"
            >
              {t("common.retry")}
            </SwButton>
          )}
          <SwButton as="a" variant="plain" size="inherit"
            href="/locations"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg text-accent-foreground underline underline-offset-4"
          >
            {t("common.back")}
          </SwButton>
        </div>
        <Footer />
      </main>
    );

  // 构建画廊图片列表
  const galleryImages: string[] = [];
  if (location.coverImageUrl) galleryImages.push(location.coverImageUrl);
  if (location.images) {
    for (const img of location.images) {
      if (img && !galleryImages.includes(img)) galleryImages.push(img);
    }
  }

  return (
    <main className="location-journal min-h-screen bg-background pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-0">
      <Navbar />
      <header className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <SwButton as="a" variant="plain" size="inherit"
            href="/locations"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            {t("nav.locations")}
          </SwButton>
          {isAdmin && (
            <SwButton as="a" variant="plain" size="inherit"
              href={`/admin/locations/${location.id}/edit`}
              aria-label={t("admin.editLocation")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card text-foreground shadow-card hover:bg-muted"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
            </SwButton>
          )}
        </div>
        <div className="grid min-w-0 items-center gap-6 pb-10 pt-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12 lg:pb-14">
          <div className="min-w-0 rounded-3xl bg-warm-subtle pb-4">
            <LocationCoverGallery
              key={location.id}
              images={galleryImages}
              name={location.name}
              onOpen={setLightboxIndex}
            />
          </div>
          <div className="min-w-0 py-3">
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-warm"
              />
              {t("locationDetail.journal")}
            </p>
            <h1 className="break-words text-4xl sm:text-5xl font-black text-foreground">
              {location.name}
            </h1>
            {location.subtitle && (
              <p className="mt-4 break-words text-lg leading-8 text-muted-foreground">
                {location.subtitle}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              {location.supportedActivityTypes.map((activity) => (
                <span
                  key={activity}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
                >
                  {t(`enums.locationType.${activity}`)}
                </span>
              ))}
              {location.tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
            {location.region && (
              <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="break-words">{location.region.name}</span>
              </p>
            )}
          </div>
        </div>
      </header>
      <div
        data-testid="location-detail-content"
        className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8"
      >
        <div className="grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-16">
          <div
            data-testid="location-detail-primary-column"
            className="min-w-0 space-y-12"
          >
            <LocationIntroCard
              key={location.id}
              location={location}
              address={location.address ?? undefined}
            />
            <TeamListSection key={location.id} locationId={location.id} />
          </div>
          <aside
            data-testid="location-detail-sidebar"
            className="hidden min-w-0 space-y-8 lg:sticky lg:top-24 lg:block"
          >
            <ActionCard location={location} />
            <RelatedLocations locations={relatedLocations} />
          </aside>
        </div>
      </div>
      <MobileFloatingCTA location={location} />

      {/* Lightbox */}
      <AnimatePresence initial={false}>
        {lightboxIndex !== null && (
          <Lightbox
            images={galleryImages}
            index={lightboxIndex}
            onSelect={setLightboxIndex}
            onClose={closeLightbox}
            onPrev={() =>
              setLightboxIndex((i) =>
                i === null
                  ? null
                  : (i - 1 + galleryImages.length) % galleryImages.length,
              )
            }
            onNext={() =>
              setLightboxIndex((i) =>
                i === null ? null : (i + 1) % galleryImages.length,
              )
            }
          />
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}
