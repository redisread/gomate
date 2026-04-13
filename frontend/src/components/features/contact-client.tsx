"use client";

import * as React from "react";
import {
  Mountain,
  Mail,
  MessageSquare,
  Home,
  ChevronRight,
  Send,
  CheckCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useI18n } from "@/hooks/useI18n";
import { fetchAPI } from "@/lib/api";

/** 联系我们页主组件 */
export function ContactClient() {
  const { t } = useI18n();
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetchAPI("/contact", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t("contact.submitError"));
      } else {
        setSubmitted(true);
      }
    } catch {
      setError(t("contact.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setForm({ name: "", email: "", subject: "", message: "" });
    setSubmitted(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero 区域 */}
        <div className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
          <div className="max-w-3xl mx-auto px-6 py-10">
            {/* 面包屑 */}
            <nav className="flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400 mb-4">
              <a
                href="/"
                className="flex items-center gap-1 hover:text-amber-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>{t("nav.home")}</span>
              </a>
              <ChevronRight className="w-4 h-4" />
              <span className="text-stone-700 dark:text-stone-300 font-medium">
                {t("contact.pageTitle")}
              </span>
            </nav>

            <h1 className="text-3xl font-bold text-foreground">
              {t("contact.pageSubtitle")}
            </h1>
            <p className="mt-2 text-stone-500 dark:text-stone-400 text-base">
              {t("contact.pageDesc")}
            </p>
          </div>
        </div>

        {/* 正文内容 */}
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
          {/* 联系方式卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 邮箱联系 */}
            <div className="bg-card rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm px-6 py-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0 border border-amber-100 dark:border-amber-900/50">
                <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {t("contact.emailContact")}
                </h3>
                <a
                  href="mailto:hi@gomate.live"
                  className="text-sm text-amber-600 hover:text-amber-700 transition-colors"
                >
                  hi@gomate.live
                </a>
              </div>
            </div>

            {/* 微信咨询 */}
            <div className="bg-card rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm px-6 py-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0 border border-amber-100 dark:border-amber-900/50">
                <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {t("contact.wechatContact")}
                </h3>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {t("contact.wechatScanHint")}
                </p>
              </div>
            </div>
          </div>

          {/* 联系表单 */}
          <div className="bg-card rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm px-8 py-8">
            {submitted ? (
              /* 提交成功状态 */
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-4 border border-green-100 dark:border-green-900/50">
                  <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t("contact.successTitle")}
                </h3>
                <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">
                  {t("contact.successDesc")}
                </p>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
                >
                  {t("contact.continueSubmitBtn")}
                </button>
              </div>
            ) : (
              /* 表单 */
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                    }}
                  >
                    <Mountain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {t("contact.formTitle")}
                    </h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                      {t("contact.formSubtitle")}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* 姓名 + 邮箱 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                        {t("contact.nameLabel")}
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder={t("contact.namePlaceholder")}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-foreground placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                        {t("contact.emailLabel")}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder={t("contact.emailPlaceholder")}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-foreground placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* 主题 */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                      {t("contact.subjectLabel")}
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder={t("contact.subjectPlaceholder")}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-foreground placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors"
                    />
                  </div>

                  {/* 详细建议 */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                      {t("contact.messageLabel")}
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder={t("contact.messagePlaceholder")}
                      required
                      rows={5}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-foreground placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors resize-none"
                    />
                  </div>

                  {/* 错误提示 */}
                  {error && (
                    <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg px-3.5 py-2.5">
                      {error}
                    </p>
                  )}

                  {/* 提交按钮 */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      {submitting ? t("contact.submitting") : t("contact.submitBtn")}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
