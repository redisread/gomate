import * as React from "react";
import { cn } from "@/lib/utils";

/* ============================================================
   Avatar — 用户头像（可复用）
   ============================================================ */
interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  style?: React.CSSProperties;
}

export function Avatar({ src, name, size = "sm", className, style }: AvatarProps) {
  const sizeClass = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
  }[size];

  // 中文取首字，英文取首字母
  const initials = name
    ? /[\u4e00-\u9fa5]/.test(name[0]) ? name[0] : name[0].toUpperCase()
    : "?";

  // 根据姓名哈希生成一致背景色（使用品牌蓝绿色域 hue 150~220）
  const hue = (name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 60) + 155;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn(
          "rounded-full object-cover shrink-0 ring-2 ring-white",
          sizeClass,
          className
        )}
        style={style}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center shrink-0",
        "font-semibold text-white select-none ring-2 ring-white",
        sizeClass,
        className
      )}
      style={{ background: `hsl(${hue}, 45%, 42%)`, ...style }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
