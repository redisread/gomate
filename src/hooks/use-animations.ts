/**
 * GoMate 动效 Hooks 系统
 * 通过 CSS 类与 animation-delay 控制入场动画，不依赖额外动画库
 */

/* ============================================================
   useAnimateIn — Hero 入场动画系统
   返回各元素的 CSS 类名，通过 opacity + animation-delay 实现 stagger
   ============================================================ */
export interface AnimateInConfig {
  badge: string;
  title: string;
  subtitle: string;
  search: string;
  cta: string;
  stats: string;
}

export function useAnimateIn(): AnimateInConfig {
  // 修复 hydration 错误：统一 SSR/CSR 返回值
  // 动画通过 CSS animation-delay 控制，hydration 完成后自动播放

  return {
    badge:    "animate-fade-up [animation-delay:0ms]   [animation-fill-mode:both]",
    title:    "animate-fade-up [animation-delay:100ms] [animation-fill-mode:both]",
    subtitle: "animate-fade-up [animation-delay:200ms] [animation-fill-mode:both]",
    search:   "animate-fade-up [animation-delay:300ms] [animation-fill-mode:both]",
    cta:      "animate-fade-up [animation-delay:400ms] [animation-fill-mode:both]",
    stats:    "animate-fade-up [animation-delay:500ms] [animation-fill-mode:both]",
  };
}
