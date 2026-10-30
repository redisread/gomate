import { Button as SwButton } from "@/components/starwind-react/button";
import * as React from "react";
import { Loader2 } from "lucide-react";

/**
 * SubmitButton — 品牌渐变动效提交按钮
 *
 * 统一渐变背景 + hover shift/shadow，避免在多个表单组件中复制 inline style。
 */
export interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const GRADIENT_BG = "linear-gradient(135deg, var(--primary) 0%, var(--primary-400) 100%)";

export function SubmitButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...rest
}: SubmitButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <SwButton variant="plain" size="inherit"
      type="submit"
      disabled={isDisabled}
      aria-busy={loading}
      className={`py-3 rounded-xl text-sm font-semibold text-white transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed motion-safe:enabled:hover:-translate-y-px motion-safe:enabled:active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${className ?? ""}`}
      style={{
        background: isDisabled ? "var(--primary)" : GRADIENT_BG,
        boxShadow: isDisabled ? "none" : "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)",
      }}
      {...rest}
    >
      {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
      {loading && loadingText ? loadingText : children}
    </SwButton>
  );
}
