import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

/* ============================================================
   FormInput — 表单输入组件套件
   包含：
   - FormField（带标签+错误消息的容器）
   - Input（文本输入）
   - PasswordInput（密码输入，带切换显示）
   - Textarea（多行文本）
   - Select（下拉选择）
   ============================================================ */

/* ---- FormField 容器 ---- */
interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required && (
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          )}
        </label>
      )}

      {children}

      {/* 错误消息 */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive animate-fade-down">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 提示文字（无错误时显示） */}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/* ---- 共享输入框样式 ---- */
const inputBase = cn(
  // 基础
  "w-full bg-background text-foreground text-sm",
  "border border-input rounded-lg px-3 py-2.5",
  "placeholder:text-muted-foreground/60",
  // 焦点：品牌色环
  "outline-none transition-all duration-150",
  "focus:ring-2 focus:ring-brand/30 focus:border-brand",
  // 错误状态
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:focus:ring-destructive/30",
  // 禁用状态
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50",
  // 温暖感
  "shadow-warm-xs"
);

/* ---- Input ---- */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, leftIcon, rightIcon, className, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-muted-foreground pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            aria-invalid={error}
            className={cn(
              inputBase,
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-muted-foreground">
              {rightIcon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        aria-invalid={error}
        className={cn(inputBase, className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

/* ---- PasswordInput（带显示/隐藏切换） ---- */
interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ error, className, ...props }, ref) => {
    const { t } = useI18n(["common"]);
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative flex items-center">
        <input
          ref={ref}
          type={showPassword ? "text" : "password"}
          aria-invalid={error}
          className={cn(inputBase, "pr-10", className)}
          {...props}
        />
        {/* 切换按钮 */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors duration-150"
          aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

/* ---- Textarea ---- */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={error}
      className={cn(
        inputBase,
        "resize-none min-h-[100px] leading-relaxed",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

/* ---- Select ---- */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, options, placeholder, className, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={error}
      className={cn(inputBase, "cursor-pointer appearance-none pr-8", className)}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
);
Select.displayName = "Select";

/* ---- 成功状态展示（表单提交成功后） ---- */
interface SuccessMessageProps {
  title: string;
  description?: string;
  className?: string;
}

export function SuccessMessage({ title, description, className }: SuccessMessageProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl",
        "bg-[var(--success-subtle)] border border-[var(--success)]/20",
        "animate-scale-in",
        className
      )}
    >
      <CheckCircle2 className="h-5 w-5 text-[var(--success)] shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-[var(--success)]">{title}</p>
        {description && (
          <p className="text-xs text-[var(--success)]/80 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

/* ---- 错误消息横幅（表单级错误） ---- */
interface ErrorBannerProps {
  message: string;
  className?: string;
}

export function ErrorBanner({ message, className }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl",
        "bg-destructive/8 border border-destructive/20",
        "animate-scale-in",
        className
      )}
    >
      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
