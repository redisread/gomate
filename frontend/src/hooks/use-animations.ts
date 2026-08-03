/**
 * GoMate 动效 Hooks 系统
 * 纯 CSS 变量 + Intersection Observer 实现，不依赖额外动画库
 */

import { useState, useEffect, useRef, useCallback, type RefObject } from "react";

/* ============================================================
   useInView — 视口进入检测
   用于 Section 滚动进入时触发动画
   ============================================================ */
export function useInView(threshold = 0.1): [RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true); // 默认可见，渐进增强

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // 触发后取消观察，避免重复触发
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}



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

export function useAnimateIn(enabled = true): AnimateInConfig {
  // 修复 hydration 错误：统一 SSR/CSR 返回值
  // 动画通过 CSS animation-delay 控制，hydration 完成后自动播放
  if (!enabled) {
    return {
      badge: "opacity-0",
      title: "opacity-0",
      subtitle: "opacity-0",
      search: "opacity-0",
      cta: "opacity-0",
      stats: "opacity-0",
    };
  }

  return {
    badge:    "animate-fade-up [animation-delay:0ms]   [animation-fill-mode:both]",
    title:    "animate-fade-up [animation-delay:100ms] [animation-fill-mode:both]",
    subtitle: "animate-fade-up [animation-delay:200ms] [animation-fill-mode:both]",
    search:   "animate-fade-up [animation-delay:300ms] [animation-fill-mode:both]",
    cta:      "animate-fade-up [animation-delay:400ms] [animation-fill-mode:both]",
    stats:    "animate-fade-up [animation-delay:500ms] [animation-fill-mode:both]",
  };
}

/* ============================================================
   useSearchInteraction — 搜索框交互状态
   管理 focus、输入、清空按钮的交互状态
   ============================================================ */
export interface SearchState {
  value: string;
  isFocused: boolean;
  setValue: (v: string) => void;
  setFocused: (v: boolean) => void;
  clear: () => void;
}

export function useSearchInteraction(initialValue = ""): SearchState {
  const [value, setValue] = useState(initialValue);
  const [isFocused, setFocused] = useState(false);

  const clear = useCallback(() => {
    setValue("");
  }, []);

  return {
    value,
    isFocused,
    setValue,
    setFocused,
    clear,
  };
}
