import { CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastOptions {
  type: "success" | "error";
  message: string;
}

export function ToastDisplay({
  toast,
  exiting,
}: {
  toast: ToastOptions | null;
  exiting: boolean;
}) {
  if (!toast) return null;
  const isSuccess = toast.type === "success";
  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-[calc(max(var(--team-action-height,0px),env(safe-area-inset-bottom))+1rem)] left-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 z-[60] motion-reduce:animate-none",
        exiting
          ? "animate-[fade-out_0.2s_ease-in_both]"
          : "animate-[fade-up_0.25s_ease_both]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium",
          isSuccess
            ? "bg-success-subtle text-accent-foreground"
            : "bg-card text-foreground ring-1 ring-destructive/40 shadow-warm-md",
        )}
      >
        {isSuccess ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <X className="h-4 w-4" />
        )}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
