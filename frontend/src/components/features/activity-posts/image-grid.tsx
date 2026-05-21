"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ImageGridProps {
  images: string[];
  maxImages?: number;
  className?: string;
}

export function ImageGrid({ images, maxImages = 3, className }: ImageGridProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [currentImage, setCurrentImage] = React.useState<string | null>(null);

  const displayImages = images.slice(0, maxImages);
  const hasMore = images.length > maxImages;

  const openLightbox = (image: string) => {
    setCurrentImage(image);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setCurrentImage(null);
  };

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    if (lightboxOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  if (displayImages.length === 0) return null;

  // Single image: full width with max height
  if (displayImages.length === 1) {
    return (
      <>
        <div
          className={cn("cursor-pointer overflow-hidden rounded-xl", className)}
          onClick={() => openLightbox(displayImages[0])}
        >
          <img
            src={displayImages[0]}
            alt="Activity photo"
            className="w-full h-auto max-h-64 object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Lightbox Modal */}
        {lightboxOpen && currentImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={closeLightbox}
          >
            <img
              src={currentImage}
              alt="Activity photo"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        )}
      </>
    );
  }

  // Multiple images: grid layout
  const gridCols = displayImages.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <>
      <div className={cn(`grid ${gridCols} gap-2`, className)}>
        {displayImages.map((image, index) => (
          <div
            key={index}
            className={cn(
              "relative aspect-square cursor-pointer overflow-hidden rounded-lg",
              index === 0 && displayImages.length === 3 && "row-span-2"
            )}
            onClick={() => openLightbox(image)}
          >
            <img
              src={image}
              alt={`Activity photo ${index + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
            {hasMore && index === maxImages - 1 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-sm font-medium">+{images.length - maxImages}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeLightbox}
        >
          <img
            src={currentImage}
            alt="Activity photo"
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
