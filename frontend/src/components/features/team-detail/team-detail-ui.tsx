import * as React from "react";
import { CheckCircle, X, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface ToastOptions {
  type: "success" | "error";
  message: string;
}

export function ToastDisplay({ toast, exiting }: { toast: ToastOptions | null; exiting: boolean }) {
  if (!toast) return null;
  const isSuccess = toast.type === "success";
  return (
    <div
      className={cn(
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-[60]",
        exiting ? "animate-[fade-out_0.2s_ease-in_both]" : "animate-[fade-up_0.25s_ease_both]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium",
          isSuccess ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
        )}
      >
        {isSuccess ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

export function Avatar({ name, avatar, isLeader, size = "md" }: { name?: string; avatar?: string | null; isLeader?: boolean; size?: "sm" | "md" | "lg" }) {
  const displayChar = name?.[0] || "?";
  const kaomoji = ["◡‿◡", "˘◡˘", "◠‿◠", "◕‿◕", "◉‿◉"];
  const randomKaomoji = kaomoji[(name?.charCodeAt(0) || 0) % kaomoji.length];

  const sizeClasses = {
    sm: "w-10 h-10 text-base",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-xl",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-medium relative",
        sizeClasses[size],
        isLeader ? "bg-amber-200 text-amber-800 ring-2 ring-amber-400 ring-offset-2" : "bg-secondary text-muted-foreground"
      )}
    >
      {avatar ? (
        <img src={avatar} alt={name} className="w-full h-full object-cover rounded-full" />
      ) : (
        <span className="text-sm">{randomKaomoji}</span>
      )}
      {isLeader && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
          <Crown className="w-3 h-3 text-white" />
        </span>
      )}
    </div>
  );
}

export function AnimatedProgress({ ratio, isFull }: { ratio: number; isFull: boolean }) {
  const { t } = useI18n(["teams"]);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setWidth(ratio), 100);
    return () => clearTimeout(t);
  }, [ratio]);
  return (
    <div
      role="progressbar"
      aria-valuenow={ratio}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('teams.progressAriaLabel').replace('{ratio}', String(ratio))}
      className="h-1.5 rounded-full bg-secondary overflow-hidden"
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          isFull ? "bg-amber-600" : "bg-gradient-to-r from-amber-600 to-amber-400"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
