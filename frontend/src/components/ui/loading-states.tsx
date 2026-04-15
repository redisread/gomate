import * as React from "react";
import { Mountain, SearchX, Users, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

/* ============================================================
   LoadingStates — 加载骨架屏 + 空状态组件集合
   Design System v2.0：温暖沙米骨架 + 品牌绿空状态图标
   ============================================================ */

/* ============================================================
   TeamCard 骨架屏（shimmer 扫光，与卡片结构完全一致）
   ============================================================ */
export function TeamCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-[1.25rem] border border-[#e8e0d7] bg-white/85"
          style={{
            boxShadow: "0 2px 8px rgba(30,24,18,0.06)",
            animationDelay: `${i * 60}ms`,
          }}
        >
          {/* 封面图占位 */}
          <div className="skeleton h-40 w-full rounded-none" />

          <div className="flex flex-col gap-3 p-4">
            {/* 徽章行 */}
            <div className="flex items-center gap-2">
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-5 w-10 rounded-md" />
            </div>

            {/* 标题 */}
            <div className="space-y-1.5">
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-2/3 rounded" />
            </div>

            {/* 地点 */}
            <div className="skeleton h-3 w-1/2 rounded" />

            {/* 信息网格 */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {[75, 55, 65, 45].map((w, j) => (
                <div
                  key={j}
                  className="skeleton h-3 rounded"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>

            {/* 进度条 */}
            <div className="skeleton h-1.5 w-full rounded-full" />

            {/* 底部头像行 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="skeleton h-7 w-7 rounded-full" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3].map((k) => (
                  <div
                    key={k}
                    className="skeleton h-6 w-6 rounded-full ring-2 ring-white"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   LocationCard 骨架屏
   ============================================================ */
export function LocationCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-[1.25rem] border border-[#e8e0d7] bg-white/85"
          style={{ boxShadow: "0 2px 8px rgba(30,24,18,0.06)" }}
        >
          <div className="skeleton h-44 w-full rounded-none" />
          <div className="flex flex-col gap-2.5 p-4">
            <div className="skeleton h-5 w-3/4 rounded" />
            <div className="skeleton h-3.5 w-1/2 rounded" />
            <div className="flex gap-2">
              <div className="skeleton h-5 w-14 rounded-full" />
              <div className="skeleton h-5 w-12 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   全屏页面加载器（首屏）
   ============================================================ */
export function PageLoader() {
  const { t } = useI18n(["ui", "common"]);
  return (
    <div className="fixed inset-0 bg-[#faf8f5]/85 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {/* Mountain 图标浮动 */}
          <Mountain className="h-10 w-10 text-[#249a87] animate-[float_3s_ease-in-out_infinite]" />
          {/* 品牌色涟漪 */}
          <span
            className="absolute inset-0 rounded-full border-2 border-[#249a87]/30 animate-ping"
            style={{ animationDuration: "1.5s" }}
          />
        </div>
        <p className="text-sm text-[#8f7f6e] animate-[pulse-soft_2s_ease-in-out_infinite]">
          {t("common.loading")}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   内联 Spinner
   ============================================================ */
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeMap = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" };
  return (
    <svg
      className={cn("animate-spin text-[#249a87]", sizeMap[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/* ============================================================
   EmptyState — 有温度的空状态组件
   支持 4 种变体，可完全通过 props 自定义
   ============================================================ */
type EmptyVariant = "teams" | "locations" | "search" | "general";

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  description?: string;
  /** CTA 按钮或链接，直接传入 JSX */
  action?: React.ReactNode;
  className?: string;
}

const ICON_MAP: Record<EmptyVariant, React.ElementType> = {
  teams:     Users,
  locations: MapPin,
  search:    SearchX,
  general:   Mountain,
};

export function EmptyState({
  variant = "general",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const { t } = useI18n(["ui"]);
  const Icon = ICON_MAP[variant];
  const defaultTitle = t(`ui.emptyState.${variant}.title`);
  const defaultDesc = t(`ui.emptyState.${variant}.desc`);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        "animate-[fade-up_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards]",
        className
      )}
    >
      {/* 图标容器：品牌绿渐变圆形 + 外圈光晕 */}
      <div className="relative mb-6">
        <div
          className="h-20 w-20 rounded-full flex items-center justify-center"
          style={{ background: "#f0faf8" }}
        >
          <Icon className="h-9 w-9" style={{ color: "#249a87", opacity: 0.75 }} />
        </div>
        {/* 柔和外发光 */}
        <div
          className="absolute inset-0 rounded-full blur-xl scale-125 pointer-events-none"
          style={{ background: "rgba(36,154,135,0.10)" }}
        />
      </div>

      <h3 className="text-lg font-semibold text-[#1e1812] mb-2">
        {title ?? defaultTitle}
      </h3>
      <p className="text-sm text-[#8f7f6e] max-w-xs leading-relaxed">
        {description ?? defaultDesc}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
