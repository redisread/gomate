"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, ChevronLeft, Share2, Heart } from "lucide-react";
import Link from "next/link";
import { DifficultyBadge } from "@/app/components/ui/difficulty-badge";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LocationHeaderProps {
  location: Location;
  className?: string;
}

function LocationHeader({ location, className }: LocationHeaderProps) {
  const [isLiked, setIsLiked] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  const allImages = [location.coverImage, ...location.images];

  return (
    <div className={cn("relative", className)}>
      {/* Back Navigation */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <Link
          href="/"
          className="flex items-center gap-1 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-stone-700 hover:bg-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          返回
        </Link>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setIsLiked(!isLiked)}
          className={cn(
            "p-2 rounded-full backdrop-blur-sm transition-colors",
            isLiked
              ? "bg-red-500 text-white"
              : "bg-white/90 text-stone-700 hover:bg-white"
          )}
          aria-label={isLiked ? "取消收藏" : "收藏"}
        >
          <Heart
            className={cn("h-5 w-5", isLiked && "fill-current")}
          />
        </button>
        <button
          className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-stone-700 hover:bg-white transition-colors"
          aria-label="分享"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {/* Main Image */}
      <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh]">
        <Image
          src={allImages[currentImageIndex]}
          alt={location.name}
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <DifficultyBadge difficulty={location.difficulty} />
                <span className="flex items-center gap-1 text-white/80 text-sm">
                  <MapPin className="h-4 w-4" />
                  {location.location.address}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                {location.name}
              </h1>
              <p className="text-lg text-white/80">{location.subtitle}</p>
            </motion.div>
          </div>
        </div>

        {/* Image Thumbnails */}
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8">
          <div className="flex gap-2">
            {allImages.slice(0, 4).map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  "relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all",
                  currentImageIndex === index
                    ? "border-white scale-110"
                    : "border-white/50 hover:border-white/80"
                )}
              >
                <Image
                  src={image}
                  alt={`${location.name} ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { LocationHeader };
