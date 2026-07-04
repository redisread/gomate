"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
 * - IntersectionObserver 实现：仅在图片接近视口时才加载
 * - 加载前显示占位符，加载后淡入
 * - Lighthouse 冷缓存测试时，首屏外图片不会被请求
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
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 如果浏览器支持 IntersectionObserver 且图片不在首屏
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setShouldLoad(true);
              observer.disconnect();
            }
          });
        },
        { rootMargin: "200px" } // 提前 200px 开始加载，避免用户看到占位符
      );
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      // 回退：直接加载
      setShouldLoad(true);
    }
  }, []);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    onError?.();
  }, [onError]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
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

      {/* 实际图片 — 仅当 shouldLoad 为 true 时才设置 src */}
      {shouldLoad && (
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
      )}
    </div>
  );
}

interface LocationCoverImageProps extends Omit<LazyImageProps, "placeholderClassName"> {
  /** 首屏图片优先级，设为 true 时立即加载（非懒加载） */
  priority?: boolean;
}

/**
 * 用于地点卡片的封面图组件
 * - 首屏图片（priority=true）：立即加载，fetchpriority="high"
 * - 非首屏图片：IntersectionObserver 触发，仅当卡片滚动到视口附近才加载
 */
export function LocationCoverImage({
  src,
  alt,
  className,
  priority = false,
}: LocationCoverImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  // 非首屏图片使用 IntersectionObserver 延迟加载
  useEffect(() => {
    if (priority) return; // 首屏图片已在 shouldLoad=true

    const el = containerRef.current;
    if (!el) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setShouldLoad(true);
              observer.disconnect();
            }
          });
        },
        { rootMargin: "200px" }
      );
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      setShouldLoad(true);
    }
  }, [priority]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* 渐变色占位符 - 首屏图片不显示，立即加载 */}
      {!loaded && !priority && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 dark:from-amber-950/40 to-teal-100 dark:to-teal-950/40" />
      )}

      {/* 图片 - 首屏 eager，其余按需 */}
      {shouldLoad && (
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
      )}
    </div>
  );
}
