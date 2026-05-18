/**
 * Skeleton 组件 - 加载骨架屏
 *
 * Design Spec v1.0 (by @Robin):
 * - 四种变体：Text / Circular / Rectangular / Rounded
 * - Shimmer 动画效果
 * - 深浅色模式支持
 */

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
export function Skeleton({
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
          <div
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
  const baseStyles = "skeleton-shimmer bg-slate-200 dark:bg-slate-700";

  // 变体特定样式
  const variantStyles = {
    text: "h-4 rounded w-full",
    circular: "rounded-full",
    rectangular: "rounded-none",
    rounded: "rounded-lg",
  };

  return (
    <div
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
 * Navbar 专用骨架屏
 * 完全模拟 Navbar 结构
 */
export function NavbarSkeleton() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo 区域 */}
          <div className="flex items-center gap-2.5">
            <Skeleton variant="circular" width={28} height={28} />
            <Skeleton variant="text" width={80} height={24} />
          </div>

          {/* 桌面端导航链接 */}
          <nav className="hidden md:flex items-center gap-1">
            <Skeleton variant="rounded" width={60} height={32} delay={0} />
            <Skeleton variant="rounded" width={70} height={32} delay={50} />
            <Skeleton variant="rounded" width={60} height={32} delay={100} />
          </nav>

          {/* 桌面端操作区 */}
          <div className="hidden md:flex items-center gap-2">
            {/* 语言切换占位 */}
            <Skeleton variant="rounded" width={80} height={32} delay={150} />
            {/* 主题切换占位 */}
            <Skeleton variant="circular" width={32} height={32} delay={200} />
            {/* 登录按钮占位 */}
            <Skeleton variant="rounded" width={70} height={36} delay={250} />
            {/* 注册按钮占位 */}
            <Skeleton variant="rounded" width={70} height={36} delay={300} />
          </div>

          {/* 移动端汉堡按钮占位 */}
          <div className="md:hidden">
            <Skeleton variant="circular" width={36} height={36} />
          </div>
        </div>
      </div>
    </header>
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

/**
 * Locations Grid 骨架屏
 */
export function LocationsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border">
          <Skeleton variant="rectangular" width="100%" height={200} delay={i * 50} />
          <div className="p-4 space-y-3">
            <Skeleton variant="text" width="80%" height={24} delay={i * 50 + 30} />
            <Skeleton variant="text" width="60%" height={16} delay={i * 50 + 60} />
            <div className="flex gap-2 pt-2">
              <Skeleton variant="rounded" width={50} height={20} delay={i * 50 + 90} />
              <Skeleton variant="rounded" width={60} height={20} delay={i * 50 + 120} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Footer 骨架屏
 */
export function FooterSkeleton() {
  return (
    <footer className="w-full py-12 bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo + 简介 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton variant="text" width={80} height={24} />
            </div>
            <Skeleton variant="text" lines={2} width={200} delay={50} />
          </div>

          {/* 链接列 */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton variant="text" width={100} height={20} delay={i * 50} />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton
                    key={j}
                    variant="text"
                    width={120 - j * 10}
                    delay={(i * 50) + (j * 30)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

/**
 * Locations 页面完整骨架屏
 * 包含 Hero + Grid
 */
export function LocationsSkeleton() {
  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <NavbarSkeleton />
      <LocationsHeroSkeleton />
      <section className="py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Result bar skeleton */}
          <div className="flex items-center justify-between mb-7">
            <Skeleton variant="text" width={120} height={16} />
          </div>
          <LocationsGridSkeleton />
        </div>
      </section>
      <FooterSkeleton />
    </main>
  );
}
