"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

interface ToastContextValue {
  showToast: (message: string, type?: "success" | "error") => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const timersRef = React.useRef<Set<NodeJS.Timeout>>(new Set());

  // 只在客户端挂载后才渲染 portal
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 组件卸载时清理所有定时器
  React.useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const showToast = React.useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // 3秒后自动消失
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(timer);
    }, 3000);
    timersRef.current.add(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[600] flex flex-col gap-2">
            {toasts.map((toast) => (
              <Toast key={toast.id} message={toast.message} type={toast.type} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-lg",
        "text-white text-sm font-medium",
        "shadow-lg animate-in fade-in-0 slide-in-from-bottom-4",
        "duration-300",
        type === "success" ? "bg-stone-900" : "bg-red-600"
      )}
    >
      {type === "success" ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <AlertCircle className="h-4 w-4 text-white" />
      )}
      <span>{message}</span>
    </div>
  );
}

export { ToastProvider, useToast };