import * as React from "react";
import { Users, MapPin, Mountain, Crown, Hourglass, ClipboardCheck, Loader2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

export function StatBadge({ label, count, highlight = false }: { label: string; count: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        "text-lg font-bold leading-none",
        highlight ? "text-amber-500" : "text-foreground"
      )}>
        {count}
      </span>
      <span className="text-xs text-stone-400 dark:text-stone-500">{label}</span>
      {highlight && count > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="space-y-3 mt-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-2xl border border-stone-100 dark:border-stone-800 p-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl bg-stone-100 dark:bg-stone-800 flex-shrink-0" />
            <div className="flex-1 space-y-2.5 py-1">
              <div className={cn("h-4 bg-stone-100 dark:bg-stone-800 rounded-full", i === 1 ? "w-3/4" : i === 2 ? "w-2/3" : "w-1/2")} />
              <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded-full w-1/3" />
              <div className="flex gap-3 pt-1">
                <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded-full w-20" />
                <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded-full w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  btnLabel,
  href,
}: {
  icon: "users" | "crown" | "mountain" | "clipboard" | "hourglass";
  title: string;
  desc: string;
  btnLabel: string;
  href: string;
}) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    users: Users, crown: Crown, mountain: Mountain,
    clipboard: ClipboardCheck, hourglass: Hourglass,
  } as const;
  const IconEl = iconMap[icon] || Users;
  return (
    <div className="py-14 flex flex-col items-center text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-amber-50 scale-150 opacity-60" />
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-amber-50 scale-125 opacity-80" />
        <div className="relative w-24 h-24 bg-white border-2 border-stone-100 dark:border-stone-800 rounded-full flex items-center justify-center shadow-sm">
          <IconEl className="h-10 w-10 text-amber-500" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-stone-800 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 dark:text-stone-500 mb-6 max-w-xs leading-relaxed">{desc}</p>
      <a href={href}>
        <button className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors text-sm shadow-md shadow-amber-100">
          {btnLabel}
        </button>
      </a>
    </div>
  );
}

export function LoadMoreButton({ hasMore, loading, onClick }: { hasMore: boolean; loading: boolean; onClick: () => void }) {
  const { t } = useI18n();
  if (!hasMore) return null;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-3 mt-2 text-amber-600 hover:text-amber-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("myTeams.loadMore")}
    </button>
  );
}
