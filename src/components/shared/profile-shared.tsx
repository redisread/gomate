"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const LEVEL_CONFIG: Record<string, {
  badge: string;
  glow: string;
  icon: string;
  emoji: string;
}> = {
  beginner: {
    badge: "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400",
    glow: "shadow-amber-100",
    icon: "text-amber-500",
    emoji: "🌱",
  },
  intermediate: {
    badge: "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-400",
    glow: "shadow-sky-100",
    icon: "text-sky-500",
    emoji: "⛰️",
  },
  advanced: {
    badge: "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-400",
    glow: "shadow-violet-100",
    icon: "text-violet-500",
    emoji: "🏔️",
  },
  expert: {
    badge: "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400",
    glow: "shadow-amber-100",
    icon: "text-amber-500",
    emoji: "🦅",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent = false,
  sublabel,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  href?: string;
  accent?: boolean;
  sublabel?: string;
}) {
  const inner = (
    <div className={cn(
      "bg-card rounded-2xl border border-border p-5 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 group",
      href && "hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-100/60 hover:border-amber-200/60 cursor-pointer"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200",
          accent
            ? "bg-amber-50 group-hover:bg-amber-100"
            : "bg-muted group-hover:bg-secondary"
        )}>
          <Icon className={cn("h-5 w-5", accent ? "text-amber-600" : "text-muted-foreground")} />
        </div>
        {href && (
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150" />
        )}
      </div>
      <p className={cn(
        "text-3xl font-bold mb-1",
        accent ? "text-foreground" : "text-foreground/70"
      )}>{value}</p>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      {sublabel && <p className="text-xs text-muted-foreground/50 mt-0.5">{sublabel}</p>}
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

export function ProfileSkeleton({ variant = "amber" }: { variant?: "amber" | "sky" }) {
  const _bgColor = variant === "amber" ? "amber" : "sky";
  
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
      <div className="h-36 bg-muted animate-pulse" />
      <div className="px-6 pb-6 pt-20">
        <div className="space-y-3">
          <div className="h-6 bg-muted rounded-full w-40 animate-pulse" />
          <div className="h-4 bg-muted rounded-full w-56 animate-pulse" />
          <div className="flex gap-2 mt-4">
            <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
            <div className="h-6 w-32 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
