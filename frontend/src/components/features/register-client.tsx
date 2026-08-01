"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, Mountain, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { signUp } from "@/lib/auth-client";

/**
 * 注册页 — 温暖品牌双栏布局
 * 左侧：品牌故事 + 功能亮点（桌面端可见）
 * 右侧：注册表单
 */
export function RegisterClient() {
  const { t } = useI18n(["auth"]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError(t("auth.passwordMismatch"));
      setIsLoading(false);
      return;
    }

    if (formData.name.length < 2) {
      setError(t("auth.nicknameTooShort"));
      setIsLoading(false);
      return;
    }

    try {
      // 注册成功后，用户昵称默认等于用户名（通过后端钩子或在 profile 页面设置）
      const result = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      if (result.error) {
        if (result.error.message?.includes("already")) {
          setError(t("auth.emailTaken"));
        } else {
          setError(t("auth.registerErrorRetry"));
        }
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch {
      setError(t("auth.registerErrorRetry"));
    } finally {
      setIsLoading(false);
    }
  };

  // 注册成功状态
  if (isSuccess) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 bg-background"
      >
        <div className="text-center space-y-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--primary) 15%, transparent) 0%, color-mix(in oklab, var(--primary-300) 20%, transparent) 100%)" }}
          >
            <CheckCircle2 className="h-10 w-10" style={{ color: "var(--primary)" }} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("auth.registerSuccess")}
          </h2>
          <p className="text-muted-foreground">{t("auth.registerSuccessRedirect")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── 左侧：品牌区（桌面端） ── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{
          background: "linear-gradient(160deg, var(--accent-foreground) 0%, var(--primary) 45%, var(--primary-400) 100%)",
        }}
      >
        {/* 背景装饰 */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, color-mix(in oklab, white 8%, transparent) 0%, transparent 70%)" }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-20 -left-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--warm) 12%, transparent) 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 relative z-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "color-mix(in oklab, white 20%, transparent)" }}
          >
            <Mountain className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">GoMate</span>
        </a>

        {/* 中部主文案 */}
        <div className="relative z-10 space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-white/70" />
              <span className="text-white/60 text-sm font-medium uppercase tracking-widest">
                {t("auth.registerBrandTagline")}
              </span>
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              {t("auth.registerBrandTitle")}
            </h2>
          </div>

          <p className="text-white/75 text-lg leading-relaxed max-w-sm">
            {t("auth.registerBrandDesc")}
          </p>

          {/* 功能亮点 */}
          <div className="space-y-3">
            {[
              { icon: "🗺️", text: t("auth.featureExplore") },
              { icon: "👥", text: t("auth.featureTeam") },
              { icon: "📅", text: t("auth.featureManage") },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: "color-mix(in oklab, white 15%, transparent)" }}
                >
                  {item.icon}
                </div>
                <span className="text-white/85 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 底部 SVG 山脉装饰 */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full pointer-events-none"
          viewBox="0 0 560 120"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 120L80 80L160 100L240 55L320 75L400 30L480 55L560 20V120H0Z"
            fill="color-mix(in oklab, white 6%, transparent)"
          />
          <path
            d="M0 120L100 90L200 110L300 65L420 85L520 45L560 60V120H0Z"
            fill="color-mix(in oklab, white 4%, transparent)"
          />
        </svg>
      </div>

      {/* ── 右侧：表单区 ── */}
      <div
        className="flex-1 flex flex-col bg-background"
      >
        {/* 移动端顶部 Logo */}
        <div className="lg:hidden px-6 pt-6">
          <a href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6" style={{ color: "var(--primary)" }} />
            <span className="text-lg font-bold text-foreground">GoMate</span>
          </a>
        </div>

        {/* 表单主体 */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            {/* 标题 */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold mb-1.5 text-foreground">
                {t("auth.registerTitle")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("auth.registerSubtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 昵称 */}
              <FormField
                id="name"
                testId="register-name"
                label={t("auth.nickname")}
                type="text"
                placeholder={t("auth.nicknamePlaceholder")}
                value={formData.name}
                onChange={handleInputChange}
                required
                hint={t("auth.nicknameRange")}
              />

              {/* 邮箱 */}
              <FormField
                id="email"
                testId="register-email"
                label={t("auth.email")}
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={formData.email}
                onChange={handleInputChange}
                required
              />

              {/* 密码 */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    data-testid="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.passwordMinHint")}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-11 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors duration-150"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* 密码强度指示 */}
                {formData.password && (
                  <PasswordStrength password={formData.password} />
                )}
              </div>

              {/* 确认密码 */}
              <FormField
                id="confirmPassword"
                testId="register-confirm-password"
                label={t("auth.confirmPassword")}
                type="password"
                placeholder={t("auth.reenterPassword")}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                hasError={!!(formData.confirmPassword && formData.password !== formData.confirmPassword)}
              />

              {/* 错误提示 */}
              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-red-400 border border-destructive/20 dark:border-red-500/30"
                >
                  <span className="text-base">⚠️</span>
                  {error}
                </div>
              )}

              {/* 注册按钮 */}
              <button
                data-testid="register-submit"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: isLoading ? "var(--primary)" : "linear-gradient(135deg, var(--primary) 0%, var(--primary-400) 100%)",
                  boxShadow: isLoading ? "none" : "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.transform = "translateY(-1px)";
                    el.style.boxShadow = "0 6px 24px color-mix(in oklab, var(--primary) 45%, transparent)";
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)";
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("auth.registerBtnLoading")}
                  </>
                ) : (
                  <>
                    {t("auth.registerBtn")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* 登录链接 */}
              <p className="text-center text-sm text-muted-foreground">
                {t("auth.hasAccount")}{" "}
                <a
                  href="/login"
                  className="font-semibold text-primary hover:text-amber-700 dark:hover:text-amber-400 transition-colors duration-150"
                >
                  {t("auth.loginNow")} →
                </a>
              </p>
            </form>
          </div>
        </div>

        {/* 底部版权 */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-muted-foreground">
            © 2025 GoMate · {t("auth.footerTagline")}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── 通用表单字段 ── */
function FormField({
  id,
  testId,
  label,
  type,
  placeholder,
  value,
  onChange,
  required,
  hint,
  hasError,
}: {
  id: string;
  testId?: string;
  label: string;
  type: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  hint?: string;
  hasError?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        data-testid={testId}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full px-4 py-3 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground text-sm transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 ${hasError ? "border-destructive ring-3 ring-destructive/10" : ""}`}
      />
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/* ── 密码强度指示器 ── */
function PasswordStrength({ password }: { password: string }) {
  const getStrength = (pwd: string, t: (key: string, vars?: Record<string, string | number>) => string): { level: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd) || /[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: t("auth.passwordStrengthWeak"), color: "var(--warm)" };
    if (score === 2) return { level: 2, label: t("auth.passwordStrengthFair"), color: "var(--warning)" };
    if (score === 3) return { level: 3, label: t("auth.passwordStrengthGood"), color: "var(--primary)" };
    return { level: 4, label: t("auth.passwordStrengthStrong"), color: "var(--accent-foreground)" };
  };

  const { t } = useI18n(["auth"]);
  const { level, label, color } = getStrength(password, t);

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-300"
            style={{ background: i <= level ? color : "var(--border)" }}
          />
        ))}
      </div>
      <span className="text-xs font-medium flex-shrink-0" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
