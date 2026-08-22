import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StoryToast({
  toast,
  exiting,
}: {
  toast: { type: "success" | "error" | "info" | "warning"; message: string } | null;
  exiting: boolean;
}) {
  if (!toast) return null;

  const isError = toast.type === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      className={cn(
        "fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:bottom-8",
        exiting
          ? "animate-[fade-out_0.2s_ease-in_both]"
          : "animate-[slide-up-toast_0.25s_ease-out_both]",
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-warm",
          isError
            ? "border-destructive/20 bg-destructive/10 text-destructive"
            : "border-primary/20 bg-card text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
