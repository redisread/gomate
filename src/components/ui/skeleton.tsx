/**
 * Skeleton 组件 - 加载骨架屏
 *
 * Design Spec v1.0 (by @Robin):
 * - 四种变体：Text / Circular / Rectangular / Rounded
 * - Shimmer 动画效果
 * - 深浅色模式支持
 */

import { Skeleton as StarwindSkeleton } from "@/components/starwind-react/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  /** 变体类型 */
  variant?: "text" | "circular" | "rectangular" | "rounded";
  /** 宽度（CSS 值或数字 px） */
  width?: string | number;
  /** 高度（CSS 值或数字 px） */
  height?: string | number;
  /** 行数（仅 text 变体有效） */
  lines?: number;
  /** 自定义类名 */
  className?: string;
  /** 动画延迟（ms） */
  delay?: number;
}

/**
 * Skeleton 骨架屏组件
 *
 * @example
 * // 单行文本
 * <Skeleton variant="text" width="120px" />
 *
 * // 多行文本
 * <Skeleton variant="text" lines={2} width="200px" />
 *
 * // 圆形头像
 * <Skeleton variant="circular" width="40px" height="40px" />
 *
 * // 圆角按钮
 * <Skeleton variant="rounded" width="100px" height="36px" />
 *
 * // 矩形卡片
 * <Skeleton variant="rectangular" width="100%" height="200px" />
 */
function Skeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  className,
  delay = 0,
}: SkeletonProps) {
  // 处理 width/height 格式
  const formatSize = (size: string | number | undefined): string | undefined => {
    if (size === undefined) return undefined;
    if (typeof size === "number") return `${size}px`;
    return size;
  };

  const w = formatSize(width);
  const h = formatSize(height);

  // Text 变体：多行支持
  if (variant === "text" && lines > 1) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <StarwindSkeleton
            key={i}
            className={cn(
              "skeleton-text",
              "h-4 rounded",
              i === lines - 1 && "w-3/4" // 最后一行短一点
            )}
            style={{
              width: i === lines - 1 ? "75%" : w || "100%",
              animationDelay: `${delay + i * 50}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  // 基础样式
  const baseStyles = "skeleton-shimmer bg-muted motion-reduce:animate-none";

  // 变体特定样式
  const variantStyles = {
    text: "h-4 rounded w-full",
    circular: "rounded-full",
    rectangular: "rounded-none",
    rounded: "rounded-lg",
  };

  return (
    <StarwindSkeleton
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{
        width: w,
        height: h,
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

/**
 * Locations Hero 骨架屏
 * 模拟探索地点页面 Hero 区域
 */
export function LocationsHeroSkeleton() {
  return (
    <section className="relative pt-28 pb-10 bg-card border-b border-border">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Badge */}
        <Skeleton variant="rounded" width={140} height={24} className="mb-4" />

        {/* Title */}
        <Skeleton variant="text" width="60%" height={40} className="mb-2" />

        {/* Tagline */}
        <Skeleton variant="text" width="80%" height={24} className="mb-7" />

        {/* Role buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={60} delay={i * 50} />
          ))}
        </div>

        {/* Search */}
        <Skeleton variant="rounded" width="100%" height={50} className="mb-3" />

        {/* Filter tags */}
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={80} height={32} />
          <Skeleton variant="rounded" width={60} height={32} delay={50} />
          <Skeleton variant="rounded" width={70} height={32} delay={100} />
          <Skeleton variant="rounded" width={55} height={32} delay={150} />
        </div>
      </div>
    </section>
  );
}
