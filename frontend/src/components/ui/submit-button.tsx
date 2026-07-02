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

const GRADIENT_BG = "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)";

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
    <button
      type="submit"
      disabled={isDisabled}
      className={`py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-allowed ${className ?? ""}`}
      style={{
        background: isDisabled ? "#D97706" : GRADIENT_BG,
        boxShadow: isDisabled ? "none" : "0 4px 18px rgba(217,119,6,0.35)",
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(217,119,6,0.45)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        if (!isDisabled) {
          e.currentTarget.style.boxShadow = "0 4px 18px rgba(217,119,6,0.35)";
        }
      }}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
