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
   useCountUp — 数字计数动画
   从 0 缓动到目标值，配合 useInView 使用
   ============================================================ */
export function useCountUp(target: number, duration = 1500, trigger = true): number {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) return;

    // easeOutCubic 缓动函数，数字越接近目标值越慢
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      setCount(Math.round(easedProgress * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      startTimeRef.current = null;
    };
  }, [target, duration, trigger]);

  return count;
}

/* ============================================================
   useParallax — 视差滚动
   背景装饰元素随页面滚动轻微移动，最大位移 30px
   ============================================================ */
export function useParallax(speed: number): { y: number } {
  const [y, setY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // 限制最大位移为 30px
      const scrollY = window.scrollY;
      const rawY = scrollY * speed;
      setY(Math.min(Math.max(rawY, -30), 30));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return { y };
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
  /** 搜索按钮是否触发弹跳动画 */
  isButtonBouncing: boolean;
  setValue: (v: string) => void;
  setFocused: (v: boolean) => void;
  triggerButtonBounce: () => void;
  clear: () => void;
}

export function useSearchInteraction(initialValue = ""): SearchState {
  const [value, setValue] = useState(initialValue);
  const [isFocused, setFocused] = useState(false);
  const [isButtonBouncing, setIsButtonBouncing] = useState(false);
  const bounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerButtonBounce = useCallback(() => {
    setIsButtonBouncing(true);
    if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    // scale-in 动画时长 200ms，动画结束后重置
    bounceTimerRef.current = setTimeout(() => setIsButtonBouncing(false), 300);
  }, []);

  const clear = useCallback(() => {
    setValue("");
  }, []);

  useEffect(() => {
    // 输入时触发按钮弹跳
    if (value.length > 0) {
      triggerButtonBounce();
    }
  }, [value, triggerButtonBounce]);

  useEffect(() => {
    return () => {
      if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    };
  }, []);

  return {
    value,
    isFocused,
    isButtonBouncing,
    setValue,
    setFocused,
    triggerButtonBounce,
    clear,
  };
}
