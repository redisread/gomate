"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, Mountain, ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { signIn } from "@/lib/auth-client";

/**
 * 登录页 — 温暖品牌双栏布局
 * 左侧：品牌故事 + 山脉装饰（桌面端可见）
 * 右侧：表单区
 */
export function LoginClient() {
  const { t } = useI18n(["auth"]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [formData, setFormData] = React.useState({ email: "", password: "" });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.email({
        email: formData.email,
        password: formData.password,
      });

      if (result.error) {
        setError(t("auth.loginError"));
        return;
      }

      window.location.href = "/";
    } catch {
      setError(t("auth.loginErrorRetry"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── 左侧：品牌区（桌面端） ── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{
          background: "linear-gradient(160deg, #92400E 0%, #D97706 45%, #F59E0B 100%)",
        }}
      >
        {/* 背景装饰光斑 */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)" }}
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,122,101,0.15) 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 relative z-10 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.20)" }}
          >
            <Mountain className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">GoMate</span>
        </a>

        {/* 中部情感文案 */}
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-3">
              {t("auth.loginBrandTagline")}
            </p>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              {t("auth.loginBrandTitle")}
            </h2>
          </div>
          <p className="text-white/75 text-lg leading-relaxed max-w-sm">
            {t("auth.loginBrandDesc")}
          </p>

          {/* 用户见证小卡片 */}
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
          >
            {[
              { avatar: "🧗", name: t("auth.testimonial1Name"), text: t("auth.testimonial1Text") },
              { avatar: "☕", name: t("auth.testimonial2Name"), text: t("auth.testimonial2Text") },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.20)" }}
                >
                  {item.avatar}
                </div>
                <div>
                  <p className="text-white/90 text-sm font-medium">{item.name}</p>
                  <p className="text-white/60 text-xs">{item.text}</p>
                </div>
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
            fill="rgba(255,255,255,0.06)"
          />
          <path
            d="M0 120L100 90L200 110L300 65L420 85L520 45L560 60V120H0Z"
            fill="rgba(255,255,255,0.04)"
          />
        </svg>
      </div>

      {/* ── 右侧：表单区 ── */}
      <div
        className="flex-1 flex flex-col bg-background"
      >
        {/* 移动端顶部 Logo */}
        <div className="lg:hidden px-6 pt-6">
          <a href="/" className="flex items-center gap-2 group">
            <Mountain className="h-6 w-6" style={{ color: "#D97706" }} />
            <span className="text-lg font-bold text-foreground">GoMate</span>
          </a>
        </div>

        {/* 表单主体 */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {/* 标题 */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-1.5 text-foreground">
                {t("auth.loginTitle")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("auth.loginSubtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 邮箱 */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  {t("auth.email")}
                </label>
                <input
                  id="email"
                  data-testid="login-email"
                  name="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                />
              </div>

              {/* 密码 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    {t("auth.password")}
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs text-primary hover:text-amber-700 dark:hover:text-amber-400 transition-colors duration-150"
                  >
                    {t("auth.forgotPassword")}
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    data-testid="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.passwordPlaceholder")}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 pr-11 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground text-sm transition-all duration-200 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors duration-150"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20"
                >
                  <span className="text-base">⚠️</span>
                  {error}
                </div>
              )}

              {/* 登录按钮 */}
              <button
                data-testid="login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: isLoading ? "#D97706" : "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                  boxShadow: isLoading ? "none" : "0 4px 18px rgba(217,119,6,0.35)",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.transform = "translateY(-1px)";
                    el.style.boxShadow = "0 6px 24px rgba(217,119,6,0.45)";
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 4px 18px rgba(217,119,6,0.35)";
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("auth.loginBtnLoading")}
                  </>
                ) : (
                  <>
                    {t("auth.loginBtn")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* 注册链接 */}
              <p className="text-center text-sm text-muted-foreground">
                {t("auth.noAccount")}{" "}
                <a
                  href="/register"
                  className="font-semibold text-primary hover:text-amber-700 dark:hover:text-amber-400 transition-colors duration-150"
                >
                  {t("auth.registerNow")} →
                </a>
              </p>
            </form>
          </div>
        </div>

        {/* 底部版权 */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs" style={{ color: "#c4b5a8" }}>
            © 2025 GoMate · {t("auth.footerTagline")}
          </p>
        </div>
      </div>
    </div>
  );
}
