"use client";

import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { useImageGallery } from "@/hooks/useImageGallery";

interface LocationDetailGalleryProps {
  images: string[];
  locationName: string;
}

export function LocationDetailGallery({ images, locationName }: LocationDetailGalleryProps) {
  const {
    activeIndex,
    visible,
    showArrows,
    lightboxIndex,
    heroRef,
    switchImage,
    prevImage,
    nextImage,
    openLightbox,
    closeLightbox,
    setShowArrows,
  } = useImageGallery({ images });

  if (images.length === 0) return null;

  const currentImage = images[activeIndex] ?? images[0];
  const hasMultiple = images.length > 1;

  return (
    <>
      {/* 主图片区域 */}
      <div
        ref={heroRef}
        className="relative w-full aspect-[16/9] sm:aspect-[2/1] overflow-hidden rounded-xl"
        onMouseEnter={() => setShowArrows(true)}
        onMouseLeave={() => setShowArrows(false)}
      >
        <img
          src={currentImage}
          alt={locationName}
          className={`w-full h-full object-cover transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
          onClick={() => openLightbox(activeIndex)}
        />

        {/* 放大按钮 */}
        <button
          onClick={() => openLightbox(activeIndex)}
          className="absolute top-3 right-3 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="查看大图"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* 左右箭头 */}
        {hasMultiple && showArrows && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="上一张"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="下一张"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* 指示器 */}
        {hasMultiple && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); switchImage(idx); }}
                className={`w-2 h-2 rounded-full transition-colors ${idx === activeIndex ? "bg-white" : "bg-white/50"}`}
                aria-label={`切换到第 ${idx + 1} 张图片`}
              />
            ))}
          </div>
        )}
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
            src={images[lightboxIndex]}
            alt={locationName}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />

          {hasMultiple && (
            <>
              <button
                onClick={() => switchImage((lightboxIndex - 1 + images.length) % images.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="上一张"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => switchImage((lightboxIndex + 1) % images.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="下一张"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
