"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ToastContextValue {
  showToast: (message: string) => void;
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
  const [toasts, setToasts] = React.useState<{ id: number; message: string }[]>([]);
  const [mounted, setMounted] = React.useState(false);

  // 只在客户端挂载后才渲染 portal
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = React.useCallback((message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);

    // 3秒后自动消失
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[600] flex flex-col gap-2">
            {toasts.map((toast) => (
              <Toast key={toast.id} message={toast.message} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-lg",
        "bg-stone-900 text-white text-sm font-medium",
        "shadow-lg animate-in fade-in-0 slide-in-from-bottom-4",
        "duration-300"
      )}
    >
      <Check className="h-4 w-4 text-emerald-400" />
      <span>{message}</span>
    </div>
  );
}

export { ToastProvider, useToast };