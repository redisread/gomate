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

interface LocationCoverImageProps extends Omit<LazyImageProps, "placeholderClassName"> {
  /** 首屏图片优先级，设为 true 时立即加载（非懒加载） */
  priority?: boolean;
}

/**
 * 用于地点卡片的封面图组件
 * 包含渐变色占位符和悬停放大效果
 * 支持首屏优先加载（priority=true 时使用 eager 加载）
 */
export function LocationCoverImage({
  src,
  alt,
  className,
  priority = false,
}: LocationCoverImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 渐变色占位符 - 首屏图片不显示，立即加载 */}
      {!loaded && !priority && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 dark:from-amber-950/40 to-teal-100 dark:to-teal-950/40" />
      )}

      {/* 图片 - 首屏图片使用 eager 加载，fetchpriority="high" */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        className={cn(
          "w-full h-full object-cover",
          "transition-all duration-500 ease-out",
          "group-hover:scale-[1.06]",
          loaded || priority ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </div>
  );
}
