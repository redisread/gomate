import * as React from "react";

/**
 * FieldGroup — 表单字段区块（图标 + 标签 + 可选必填/提示）
 *
 * 用于 create-team / edit-team 等表单场景，替代各自内联实现的 FormSection。
 */
export interface FieldGroupProps {
  icon: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export function FieldGroup({ icon, label, required, hint, children }: FieldGroupProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-base">{icon}</span>
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        {hint && (
          <span className="text-xs ml-auto text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
