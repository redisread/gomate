"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "filled" | "subtle";
  color?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md" | "lg";
}

const tagVariants = {
  variant: {
    default: "border border-border bg-background",
    outline: "border border-current bg-transparent",
    filled: "border-transparent text-white",
    subtle: "border-transparent",
  },
  color: {
    default: {
      filled: "bg-stone-800",
      subtle: "bg-stone-100 text-stone-800",
      outline: "text-stone-600",
      default: "",
    },
    primary: {
      filled: "bg-stone-900",
      subtle: "bg-stone-100 text-stone-900",
      outline: "text-stone-800",
      default: "",
    },
    success: {
      filled: "bg-emerald-600",
      subtle: "bg-emerald-50 text-emerald-700",
      outline: "text-emerald-600",
      default: "",
    },
    warning: {
      filled: "bg-amber-500",
      subtle: "bg-amber-50 text-amber-700",
      outline: "text-amber-600",
      default: "",
    },
    danger: {
      filled: "bg-red-600",
      subtle: "bg-red-50 text-red-700",
      outline: "text-red-600",
      default: "",
    },
    info: {
      filled: "bg-sky-600",
      subtle: "bg-sky-50 text-sky-700",
      outline: "text-sky-600",
      default: "",
    },
  },
  size: {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-sm",
    lg: "px-3 py-1 text-sm",
  },
};

function Tag({
  className,
  variant = "default",
  color = "default",
  size = "md",
  ...props
}: TagProps) {
  const colorClasses =
    variant === "default"
      ? ""
      : tagVariants.color[color][variant as keyof typeof tagVariants.color.default];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition-colors",
        tagVariants.variant[variant],
        tagVariants.size[size],
        colorClasses,
        className
      )}
      {...props}
    />
  );
}

export { Tag };
