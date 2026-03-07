"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { DifficultyBadge } from "@/app/components/ui/difficulty-badge";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LocationHeaderProps {
  location: Location;
  className?: string;
}

// 滑动动画变体
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

function LocationHeader({ location, className }: LocationHeaderProps) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(0);

  const allImages = [location.coverImage, ...location.images];

  // 预加载下一张图片
  React.useEffect(() => {
    if (allImages.length <= 1) return;
    const nextIndex = (currentImageIndex + 1) % allImages.length;
    const img = new Image();
    img.src = allImages[nextIndex];
  }, [currentImageIndex, allImages]);

  // 键盘导航支持
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (allImages.length <= 1) return;
      if (e.key === "ArrowLeft") {
        handlePrevImage();
      } else if (e.key === "ArrowRight") {
        handleNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentImageIndex, allImages.length]);

  // 切换到上一张图片
  const handlePrevImage = React.useCallback(() => {
    if (allImages.length <= 1) return;
    setDirection(-1);
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  }, [allImages.length]);

  // 切换到下一张图片
  const handleNextImage = React.useCallback(() => {
    if (allImages.length <= 1) return;
    setDirection(1);
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  }, [allImages.length]);

  // 处理拖动手势结束
  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (allImages.length <= 1) return;

    const swipeThreshold = 50; // 滑动距离阈值
    const swipeVelocity = 500; // 滑动速度阈值

    if (info.offset.x > swipeThreshold || info.velocity.x > swipeVelocity) {
      // 向右拖动 -> 上一张
      handlePrevImage();
    } else if (
      info.offset.x < -swipeThreshold ||
      info.velocity.x < -swipeVelocity
    ) {
      // 向左拖动 -> 下一张
      handleNextImage();
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Main Image */}
      <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh]">
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
        {/* Image with drag and animation */}
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentImageIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag={allImages.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <Image
              src={allImages[currentImageIndex]}
              alt={location.name}
              fill
              className="object-cover pointer-events-none"
              priority
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Navigation Arrows (desktop only) */}
        {allImages.length > 1 && (
          <>
            {/* Left Arrow */}
            <button
              onClick={handlePrevImage}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex",
                "w-12 h-12 items-center justify-center",
                "bg-white/90 backdrop-blur-sm rounded-full",
                "text-stone-700 hover:bg-white hover:scale-110",
                "transition-all duration-200 shadow-lg",
                currentImageIndex === 0 && "opacity-50 cursor-not-allowed hover:scale-100"
              )}
              disabled={currentImageIndex === 0}
              aria-label="上一张图片"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Right Arrow */}
            <button
              onClick={handleNextImage}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex",
                "w-12 h-12 items-center justify-center",
                "bg-white/90 backdrop-blur-sm rounded-full",
                "text-stone-700 hover:bg-white hover:scale-110",
                "transition-all duration-200 shadow-lg",
                currentImageIndex === allImages.length - 1 && "opacity-50 cursor-not-allowed hover:scale-100"
              )}
              disabled={currentImageIndex === allImages.length - 1}
              aria-label="下一张图片"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Image Counter */}
            <div className="absolute top-4 right-4 z-20 md:hidden">
              <span className="px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                {currentImageIndex + 1} / {allImages.length}
              </span>
            </div>
          </>
        )}

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
                onClick={() => {
                  setDirection(index > currentImageIndex ? 1 : -1);
                  setCurrentImageIndex(index);
                }}
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
