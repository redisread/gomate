"use client";

import * as React from "react";
import { Loader2, Mountain, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { copy } from "@/lib/copy";
import { fetchAPI } from "@/lib/api";

/**
 * 忘记密码页 — 温暖品牌风格（居中卡片，品牌色调）
 */
export function ForgotPasswordClient() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [email, setEmail] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetchAPI("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || result.message || copy.auth.sendEmailFailed);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.auth.sendEmailFailed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(160deg, #FEF3C7 0%, rgba(255,122,101,0.04) 40%, #faf8f5 100%)",
      }}
    >
      {/* 顶部 Logo 栏 */}
      <div className="px-6 pt-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <Mountain className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" style={{ color: "#D97706" }} />
          <span className="text-lg font-bold" style={{ color: "#1e1812" }}>GoMate</span>
        </a>
        <a
          href="/login"
          className="flex items-center gap-1.5 text-sm transition-colors duration-150"
          style={{ color: "#8f7f6e" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#D97706"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#8f7f6e"; }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {copy.common.backLogin}
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
                style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.15) 0%, rgba(252,211,77,0.20) 100%)" }}
              >
                <CheckCircle2 className="h-10 w-10" style={{ color: "#D97706" }} />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: "#1e1812" }}>
                  {copy.auth.emailSent}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "#8f7f6e" }}>
                  {copy.auth.emailSentDesc}
                </p>
              </div>

              {/* 提示框 */}
              <div
                className="rounded-xl px-4 py-3 text-sm text-left"
                style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.15)" }}
              >
                <p style={{ color: "#92400E" }}>
                  💡 {copy.auth.noEmailTip}
                </p>
              </div>

              <a
                href="/login"
                className="inline-block w-full py-3 rounded-xl text-sm font-semibold text-white text-center transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                  boxShadow: "0 4px 18px rgba(217,119,6,0.35)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(-1px)";
                  el.style.boxShadow = "0 6px 24px rgba(217,119,6,0.45)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 4px 18px rgba(217,119,6,0.35)";
                }}
              >
                {copy.common.backLogin}
              </a>
            </div>
          ) : (
            /* 表单状态 */
            <>
              {/* 图标 + 标题 */}
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(217,119,6,0.10)" }}
                >
                  <Mail className="h-8 w-8" style={{ color: "#D97706" }} />
                </div>
                <h1 className="text-2xl font-bold mb-1.5" style={{ color: "#1e1812" }}>
                  {copy.auth.forgotPasswordTitle}
                </h1>
                <p className="text-sm" style={{ color: "#8f7f6e" }}>
                  {copy.auth.forgotPasswordSubtitle}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 邮箱输入 */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium" style={{ color: "#4a3f35" }}>
                    {copy.auth.email}
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{ color: "#8f7f6e" }}
                    />
                    <input
                      id="email"
                      type="email"
                      placeholder={copy.auth.emailPlaceholder}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none"
                      style={{
                        background: "#fff",
                        borderColor: "#e8e0d7",
                        color: "#1e1812",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#D97706";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,119,6,0.10)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e8e0d7";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                    style={{ background: "rgba(255,122,101,0.08)", color: "#c0392b", border: "1px solid rgba(255,122,101,0.20)" }}
                  >
                    <span className="text-base">⚠️</span>
                    {error}
                  </div>
                )}

                {/* 发送按钮 */}
                <button
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
                      {copy.auth.sendingResetLink}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      {copy.auth.sendResetLink}
                    </>
                  )}
                </button>

                {/* 提示文案 */}
                <p className="text-center text-xs" style={{ color: "#c4b5a8" }}>
                  {copy.email.checkJunkFolder}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
