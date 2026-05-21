"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface ImageGridProps {
  images: string[];
  maxImages?: number;
  className?: string;
}

export function ImageGrid({ images, maxImages = 3, className }: ImageGridProps) {
  const displayImages = images.slice(0, maxImages);
  const hasMore = images.length > maxImages;

  if (displayImages.length === 0) return null;

  // Single image: full width with max height
  if (displayImages.length === 1) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <div className={cn("cursor-pointer overflow-hidden rounded-xl", className)}>
            <img
              src={displayImages[0]}
              alt="Activity photo"
              className="w-full h-auto max-h-64 object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-3xl p-0 bg-transparent border-none">
          <img
            src={displayImages[0]}
            alt="Activity photo"
            className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Multiple images: grid layout
  const gridCols = displayImages.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className={cn(`grid ${gridCols} gap-2`, className)}>
      {displayImages.map((image, index) => (
        <Dialog key={index}>
          <DialogTrigger asChild>
            <div
              className={cn(
                "relative aspect-square cursor-pointer overflow-hidden rounded-lg",
                index === 0 && displayImages.length === 3 && "row-span-2"
              )}
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
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0 bg-transparent border-none">
            <img
              src={image}
              alt={`Activity photo ${index + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
