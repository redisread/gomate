import { useState, useCallback } from "react";

interface ToastOptions {
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: string;
  isExiting: boolean;
}

/**
 * Toast 通知 Hook
 * @example
 * const { toast, show, hide } = useToast();
 * show({ type: "success", message: "操作成功" });
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);

    setToast({
      ...options,
      id,
      isExiting: false,
      duration: options.duration || 2500,
    });

    // 自动隐藏
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? { ...prev, isExiting: true } : prev));

      setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 200);
    }, options.duration || 2500);
  }, []);

  const hide = useCallback(() => {
    setToast((prev) => (prev ? { ...prev, isExiting: true } : null));

    setTimeout(() => {
      setToast(null);
    }, 200);
  }, []);

  return {
    toast,
    show,
    hide,
    isVisible: !!toast,
    isExiting: toast?.isExiting ?? false,
  };
}

/**
 * 多 Toast 管理 Hook
 * 支持同时显示多个通知
 */
