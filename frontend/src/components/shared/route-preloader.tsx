"use client";

import * as React from "react";

/**
 * Route Preloader — 路由预加载优化组件
 *
 * 优化策略：
 * 1. 关键路由预加载 — 首页加载时预加载常用页面
 * 2. Hover 预加载 — 鼠标悬停在链接上时预加载目标页面
 * 3. 智能预加载 — 基于用户行为的预测性加载
 *
 * 性能收益：
 * - 页面切换更快（资源已缓存）
 * - 提升用户体验（感知性能）
 */

// 关键路由列表（按优先级排序）
const CRITICAL_ROUTES = [
  "/locations",
  "/teams",
  "/login",
  "/register",
];

// 用户可能访问的次关键路由
const _SECONDARY_ROUTES = [
  "/about",
  "/help",
  "/contact",
];

/**
 * 创建预加载链接
 * @param href - 目标路由
 */
function prefetchRoute(href: string) {
  if (typeof window === "undefined") return;

  // 检查是否已经预加载过
  const existingLink = document.querySelector(`link[rel="prefetch"][href="${href}"]`);
  if (existingLink) return;

  // 创建 prefetch link
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  link.as = "document";
  document.head.appendChild(link);
}

/**
 * 创建 DNS 预解析
 * @param url - 预解析的域名
 */
function _prefetchDNS(url: string) {
  if (typeof window === "undefined") return;

  const existingLink = document.querySelector(`link[rel="dns-prefetch"][href="${url}"]`);
  if (existingLink) return;

  const link = document.createElement("link");
  link.rel = "dns-prefetch";
  link.href = url;
  document.head.appendChild(link);
}

/**
 * 路由预加载钩子
 * 在组件中使用，自动预加载关键路由
 */
export function useRoutePreloader() {
  React.useEffect(() => {
    // 延迟预加载关键路由（避免与首屏资源竞争）
    const timer = setTimeout(() => {
      CRITICAL_ROUTES.forEach((route, index) => {
        // 错开加载时间，避免突发请求
        setTimeout(() => prefetchRoute(route), index * 100);
      });
    }, 2000); // 首屏加载完成后 2 秒开始预加载

    return () => clearTimeout(timer);
  }, []);
}

/**
 * 带悬停预加载的链接组件
 */
interface PrefetchLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  prefetchOnHover?: boolean;
}

export const PrefetchLink = React.forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ href, children, prefetchOnHover = true, onMouseEnter, ...props }, ref) => {
    const handleMouseEnter = React.useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (prefetchOnHover && href.startsWith("/") && !href.startsWith("//")) {
          prefetchRoute(href);
        }
        onMouseEnter?.(e);
      },
      [href, prefetchOnHover, onMouseEnter]
    );

    return (
      <a ref={ref} href={href} onMouseEnter={handleMouseEnter} {...props}>
        {children}
      </a>
    );
  }
);
PrefetchLink.displayName = "PrefetchLink";

/**
 * 预加载脚本组件
 * 内联到 Layout.astro 中，尽早执行预加载逻辑
 */
export function RoutePreloaderScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            // 关键路由预加载（延迟执行，避免阻塞首屏）
            var criticalRoutes = ["/locations", "/teams"];
            var prefetchQueue = [];

            // 使用 requestIdleCallback 在空闲时预加载
            function prefetchWhenIdle(routes) {
              if (typeof requestIdleCallback !== "undefined") {
                requestIdleCallback(function() {
                  routes.forEach(function(route, i) {
                    setTimeout(function() {
                      var link = document.createElement("link");
                      link.rel = "prefetch";
                      link.href = route;
                      document.head.appendChild(link);
                    }, i * 100);
                  });
                }, { timeout: 3000 });
              } else {
                // 降级：setTimeout
                setTimeout(function() {
                  routes.forEach(function(route, i) {
                    setTimeout(function() {
                      var link = document.createElement("link");
                      link.rel = "prefetch";
                      link.href = route;
                      document.head.appendChild(link);
                    }, i * 100 + 2000);
                  });
                }, 2000);
              }
            }

            // 启动预加载
            if (document.readyState === "complete") {
              prefetchWhenIdle(criticalRoutes);
            } else {
              window.addEventListener("load", function() {
                prefetchWhenIdle(criticalRoutes);
              });
            }
          })();
        `,
      }}
    />
  );
}

/**
 * 图片懒加载属性生成器
 * 返回优化的 img 属性对象
 */
export function getLazyImageProps(
  src: string,
  alt: string,
  options?: {
    width?: number;
    height?: number;
    priority?: boolean;
    className?: string;
  }
): React.ImgHTMLAttributes<HTMLImageElement> {
  const { width, height, priority = false, className } = options || {};

  return {
    src,
    alt,
    width,
    height,
    className,
    // 原生懒加载（如果不是 priority）
    loading: priority ? "eager" : "lazy",
    // 异步解码，避免阻塞主线程
    decoding: "async",
    // fetchpriority 优化（高优先级图片）
    fetchPriority: priority ? "high" : "auto",
  };
}

/**
 * 优化后的图片组件
 */
interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholderSrc?: string;
}

export const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ src, alt, width, height, priority = false, placeholderSrc, className, style, ...props }, ref) => {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);

    // 生成 srcset（如果宽度已知）
    const srcSet = React.useMemo(() => {
      if (!width || width <= 0) return undefined;
      // 简化版 srcset，实际项目中可以配置更多尺寸
      return `${src} 1x, ${src} 2x`;
    }, [src, width]);

    return (
      <img
        ref={ref}
        src={hasError ? placeholderSrc || "/placeholder.png" : src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        srcSet={srcSet}
        className={className}
        style={{
          ...style,
          opacity: isLoaded ? 1 : 0.5,
          transition: "opacity 0.3s ease",
        }}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        {...props}
      />
    );
  }
);
OptimizedImage.displayName = "OptimizedImage";
