"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * 侧边栏区块组件
 * 统一风格的侧边栏内容区块
 */
export function SidebarSection({ icon, title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn(
      "p-5 rounded-lg border border-border bg-white shadow-sm",
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        {icon && (
          <span className="text-primary">
            {icon}
          </span>
        )}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}
