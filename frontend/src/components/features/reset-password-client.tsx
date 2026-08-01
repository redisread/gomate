"use client";

import * as React from "react";
import { Loader2, Mountain, Lock, CheckCircle2, KeyRound } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { authClient } from "@/lib/auth-client";

/**
 * 重置密码页 — 温暖品牌风格（居中卡片，品牌色调）
 */
export function ResetPasswordClient() {
  const { t } = useI18n(["auth", "common"]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [token, setToken] = React.useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = React.useState(true);

  // 从 URL query 参数中获取 token
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const resetToken = params.get("token");
      if (resetToken) {
        setToken(resetToken);
      }
      setTokenLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    // 验证
    if (!newPassword || !confirmPassword) {
      setError(t("auth.newPasswordPlaceholder"));
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError(t("auth.passwordTooShort"));
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError(t("auth.invalidResetLink"));
      setIsLoading(false);
      return;
    }

    try {
      // 调用 Better Auth 客户端的 resetPassword 方法
      const result = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (result.error) {
        throw new Error(result.error.message || t("auth.resetFailed"));
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.resetFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  // Token 加载中
  if (tokenLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          background: "linear-gradient(160deg, var(--anthropic-accent-soft) 0%, color-mix(in oklab, var(--warm) 4%, transparent) 40%, var(--background) 100%)",
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} />
        <p className="mt-4 text-sm" style={{ color: "var(--muted-foreground)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  // Token 无效
  if (!token && !success) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          background: "linear-gradient(160deg, var(--anthropic-accent-soft) 0%, color-mix(in oklab, var(--warm) 4%, transparent) 40%, var(--background) 100%)",
        }}
      >
        {/* 顶部 Logo 栏 */}
        <div className="px-6 pt-6 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <Mountain className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--primary)" }} />
            <span className="text-lg font-bold" style={{ color: "var(--foreground)" }}>GoMate</span>
          </a>
        </div>

        {/* 主体内容 */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm text-center space-y-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--warm) 15%, transparent) 0%, color-mix(in oklab, var(--warm) 20%, transparent) 100%)" }}
            >
              <KeyRound className="h-10 w-10" style={{ color: "var(--destructive)" }} />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
                {t("auth.invalidResetLink")}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                {t("auth.resetFailed")}
              </p>
            </div>

            <a
              href="/forgot-password"
              className="inline-block w-full py-3 rounded-xl text-sm font-semibold text-white text-center transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-400) 100%)",
                boxShadow: "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = "translateY(-1px)";
                el.style.boxShadow = "0 6px 24px color-mix(in oklab, var(--primary) 45%, transparent)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)";
              }}
            >
              {t("auth.sendResetLink")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(160deg, var(--anthropic-accent-soft) 0%, color-mix(in oklab, var(--warm) 4%, transparent) 40%, var(--background) 100%)",
      }}
    >
      {/* 顶部 Logo 栏 */}
      <div className="px-6 pt-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <Mountain className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" style={{ color: "var(--primary)" }} />
          <span className="text-lg font-bold" style={{ color: "var(--foreground)" }}>GoMate</span>
        </a>
        <a
          href="/login"
          className="flex items-center gap-1.5 text-sm transition-colors duration-150"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted-foreground)"; }}
        >
          <Lock className="h-3.5 w-3.5" />
          {t("common.backLogin")}
        </a>
      </div>

      {/* 主体内容 */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {success ? (
            /* 成功状态 */
            <div className="text-center space-y-5">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--primary) 15%, transparent) 0%, color-mix(in oklab, var(--primary-300) 20%, transparent) 100%)" }}
              >
                <CheckCircle2 className="h-10 w-10" style={{ color: "var(--primary)" }} />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
                  {t("auth.resetSuccess")}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  {t("auth.resetSuccessDesc")}
                </p>
              </div>

              <a
                href="/login"
                className="inline-block w-full py-3 rounded-xl text-sm font-semibold text-white text-center transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-400) 100%)",
                  boxShadow: "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(-1px)";
                  el.style.boxShadow = "0 6px 24px color-mix(in oklab, var(--primary) 45%, transparent)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 4px 18px color-mix(in oklab, var(--primary) 35%, transparent)";
                }}
              >
                {t("auth.goLogin")}
              </a>
            </div>
          ) : (
            /* 表单状态 */
            <>
              {/* 图标 + 标题 */}
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
                >
                  <Lock className="h-8 w-8" style={{ color: "var(--primary)" }} />
                </div>
                <h1 className="text-2xl font-bold mb-1.5" style={{ color: "var(--foreground)" }}>
                  {t("auth.resetPasswordTitle")}
                </h1>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {t("auth.resetPasswordSubtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 新密码输入 */}
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
                    {t("auth.newPassword")}
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{ color: "var(--muted-foreground)" }}
                    />
                    <input
                      id="newPassword"
                      type="password"
                      placeholder={t("auth.newPasswordPlaceholder")}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError("");
                      }}
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none"
                      style={{
                        background: "#fff",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--primary)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in oklab, var(--primary) 10%, transparent)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                {/* 确认密码输入 */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
                    {t("auth.confirmPassword")}
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{ color: "var(--muted-foreground)" }}
                    />
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder={t("auth.confirmPasswordPlaceholder")}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none"
                      style={{
                        background: "#fff",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--primary)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in oklab, var(--primary) 10%, transparent)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                    style={{ background: "oklch(0.731 0.166 30.7 / 0.08)", color: "oklch(0.543 0.174 29.7)", border: "1px solid color-mix(in oklab, var(--warm) 20%, transparent)" }}
                  >
                    <span className="text-base">⚠️</span>
                    {error}
                  </div>
                )}

                {/* 重置按钮 */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
                      {t("auth.resetPasswordBtnLoading")}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      {t("auth.resetPasswordBtn")}
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
