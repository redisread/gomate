"use client";

import * as React from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * 表单区块组件
 * 用于组织创建队伍表单的不同部分
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={`space-y-4 ${className || ""}`}>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
