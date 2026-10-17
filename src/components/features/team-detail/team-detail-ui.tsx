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
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-[60]",
        exiting
          ? "animate-[fade-out_0.2s_ease-in_both]"
          : "animate-[fade-up_0.25s_ease_both]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium",
          isSuccess ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
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
