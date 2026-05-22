"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 懒加载图片组件
 * - 首屏外图片延迟加载
 * - 加载前显示占位符
 * - 加载后淡入显示
 */
export function LazyImage({
  src,
  alt,
  className,
  placeholderClassName,
  onLoad,
  onError,
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    onError?.();
  }, [onError]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 占位符/骨架屏 */}
      {!loaded && !error && (
        <div
          className={cn(
            "absolute inset-0 bg-muted animate-pulse",
            placeholderClassName
          )}
        />
      )}

      {/* 错误状态占位符 */}
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">加载失败</span>
        </div>
      )}

      {/* 实际图片 */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </div>
  );
}

/**
 * 用于地点卡片的封面图组件
 * 包含渐变色占位符和悬停放大效果
 */
export function LocationCoverImage({
  src,
  alt,
  className,
}: Omit<LazyImageProps, "placeholderClassName">) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 渐变色占位符 */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 dark:from-amber-950/40 to-teal-100 dark:to-teal-950/40" />
      )}

      {/* 图片 */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "w-full h-full object-cover",
          "transition-all duration-500 ease-out",
          "group-hover:scale-[1.06]",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </div>
  );
}
