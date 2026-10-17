import * as React from "react";
import { motion } from "motion/react";
import { GalleryImage } from "./gallery-image";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Images, Mountain, ChevronDown } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import "./location-cover-gallery.css";

interface LocationCoverGalleryProps {
  images: string[];
  name: string;
  onOpen: (index: number) => void;
}

export function LocationCoverGallery({
  images,
  name,
  onOpen,
}: LocationCoverGalleryProps) {
  const { t } = useI18n(["locationDetail"]);
  const [pinned, setPinned] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const expanded = images.length > 1 && (pinned || hovered);
  const reduced = useReducedMotion();
  const galleryId = React.useId();

  return (
    <div
      className="location-cover-gallery relative mx-auto w-full max-w-6xl"
      data-expanded={expanded}
      data-single={images.length <= 1}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setPinned(false);
          setHovered(false);
          document.getElementById(`${galleryId}-toggle`)?.focus();
        }
      }}
    >
      <div
        id={galleryId}
        className="location-cover-track"
        aria-label={t("locationDetail.photoGallery")}
        role="group"
      >
        {images.length === 0 ? (
          <div className="location-cover-empty flex items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Mountain className="h-20 w-20" aria-hidden="true" />
          </div>
        ) : (
          images.map((src, index) => (
            <motion.div
              onFocus={() => {
                if (index > 0) setPinned(true);
              }}
              layout={!reduced}
              initial={false}
              animate={{
                x: expanded || images.length <= 1 ? 0 : Math.min(index, 4) * 10,
                rotate: expanded
                  ? 0
                  : index === 0
                    ? -2
                    : (index % 2 ? 1 : -1) * (3 + Math.min(index, 4) * 2),
              }}
              transition={{
                duration: reduced ? 0 : 0.36,
                ease: [0.2, 0, 0, 1],
              }}
              key={`${src}-${index}`}
              className="location-cover-card relative bg-card text-card-foreground shadow-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              style={{ zIndex: images.length - index }}
              aria-hidden={!expanded && index > 0 ? true : undefined}
            >
              <div className="relative aspect-[3/2] overflow-hidden rounded-xl">
                {(index < 5 || expanded) && (
                  <GalleryImage
                    src={src}
                    alt={
                      name +
                      " · " +
                      t("locationDetail.imageAlt", { index: String(index + 1) })
                    }
                    interactive={expanded || index === 0}
                    hovered={hovered && expanded}
                  />
                )}
              </div>
              <button
                type="button"
                className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                tabIndex={expanded || index === 0 ? 0 : -1}
                aria-label={
                  t("locationDetail.viewLargeImage") +
                  " · " +
                  t("locationDetail.imageAlt", { index: String(index + 1) })
                }
                onClick={() => onOpen(index)}
              />
              <span
                className="flex items-center justify-between gap-3 px-1 pt-2 text-xs"
                aria-hidden="true"
              >
                <span className="truncate">{name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>
            </motion.div>
          ))
        )}
      </div>
      {images.length > 1 && (
        <div className="flex justify-center pt-1">
          <button
            id={`${galleryId}-toggle`}
            type="button"
            aria-expanded={expanded}
            aria-controls={galleryId}
            onClick={() => {
              setPinned(!expanded);
              setHovered(false);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 text-xs font-medium text-white backdrop-blur-md transition-colors hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <Images className="h-4 w-4" aria-hidden="true" />
            {t(
              expanded
                ? "locationDetail.collapsePhotos"
                : "locationDetail.expandPhotos",
            )}
            <span className="text-white/70">{images.length}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </div>
  );
}
