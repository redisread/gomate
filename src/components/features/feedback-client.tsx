"use client";

import * as React from "react";
import {
  Lightbulb,
  Bug,
  Home,
  ChevronRight,
  Send,
  CheckCircle,
  Monitor,
  Globe,
  Link,
  ListOrdered,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useI18n } from "@/hooks/useI18n";
import { submitFeedback } from "@/lib/api";

type FeedbackType = "suggestion" | "bug";

/** 反馈建议页主组件 */
export function FeedbackClient() {
  const { t } = useI18n(["feedback", "nav"]);
  const [type, setType] = React.useState<FeedbackType>("suggestion");
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    content: "",
    device: "",
    browser: "",
    steps: "",
    pageUrl: "",
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
      await submitFeedback({
        type,
        name: form.name,
        email: form.email,
        content: form.content,
        device: type === "bug" ? form.device : undefined,
        browser: type === "bug" ? form.browser : undefined,
        steps: type === "bug" ? form.steps : undefined,
        pageUrl: type === "bug" ? form.pageUrl : undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("feedback.submitError")
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setForm({
      name: "",
      email: "",
      content: "",
      device: "",
      browser: "",
      steps: "",
      pageUrl: "",
    });
    setSubmitted(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero 区域 */}
        <div className="bg-background border-b border-border">
          <div className="max-w-3xl mx-auto px-6 py-10">
            {/* 面包屑 */}
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
              <a
                href="/"
                className="flex items-center gap-1 hover:text-amber-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>{t("nav.home")}</span>
              </a>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground/70 font-medium">
                {t("feedback.pageTitle")}
              </span>
            </nav>

            <h1 className="text-3xl font-bold text-foreground">
              {t("feedback.pageSubtitle")}
            </h1>
            <p className="mt-2 text-muted-foreground text-base">
              {type === "suggestion"
                ? t("feedback.suggestionDesc")
                : t("feedback.bugDesc")}
            </p>
          </div>
        </div>

        {/* 正文内容 */}
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {submitted ? (
              /* 提交成功状态 */
              <div className="text-center py-12 px-8">
                <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-5 border border-green-100 dark:border-green-900/50">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t("feedback.successTitle")}
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {t("feedback.successDesc")}
                </p>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
                >
                  {t("feedback.continueSubmitBtn")}
                </button>
              </div>
            ) : (
              <>
                {/* 类型切换 Tab */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setType("suggestion")}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                      type === "suggestion"
                        ? "text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    {t("feedback.tabSuggestion")}
                  </button>
                  <button
                    onClick={() => setType("bug")}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                      type === "bug"
                        ? "text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400 bg-red-50/50 dark:bg-red-950/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <Bug className="w-4 h-4" />
                    {t("feedback.tabBug")}
                  </button>
                </div>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  {/* 姓名 + 邮箱 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                        {t("feedback.nameLabel")}
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder={t("feedback.namePlaceholder")}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors bg-card"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                        {t("feedback.emailLabel")}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder={t("feedback.emailPlaceholder")}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors bg-card"
                      />
                    </div>
                  </div>

                  {/* Bug 专属字段 */}
                  {type === "bug" && (
                    <div className="space-y-4 p-4 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/50">
                      <p className="text-sm text-muted-foreground font-medium">
                        {t("feedback.bugDetailHint")}
                      </p>

                      {/* 设备 + 浏览器 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5">
                            <Monitor className="w-3.5 h-3.5" />
                            {t("feedback.deviceLabel")}
                          </label>
                          <input
                            type="text"
                            name="device"
                            value={form.device}
                            onChange={handleChange}
                            placeholder={t("feedback.devicePlaceholder")}
                            className="w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-colors bg-card"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5">
                            <Globe className="w-3.5 h-3.5" />
                            {t("feedback.browserLabel")}
                          </label>
                          <input
                            type="text"
                            name="browser"
                            value={form.browser}
                            onChange={handleChange}
                            placeholder={t("feedback.browserPlaceholder")}
                            className="w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-colors bg-card"
                          />
                        </div>
                      </div>

                      {/* 问题页面 URL */}
                      <div>
                        <label className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5">
                          <Link className="w-3.5 h-3.5" />
                          {t("feedback.pageUrlLabel")}
                        </label>
                        <input
                          type="url"
                          name="pageUrl"
                          value={form.pageUrl}
                          onChange={handleChange}
                          placeholder={t("feedback.pageUrlPlaceholder")}
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-colors bg-card"
                        />
                      </div>

                      {/* 复现步骤 */}
                      <div>
                        <label className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5">
                          <ListOrdered className="w-3.5 h-3.5" />
                          {t("feedback.stepsLabel")}
                        </label>
                        <textarea
                          name="steps"
                          value={form.steps}
                          onChange={handleChange}
                          placeholder={t("feedback.stepsPlaceholder")}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-colors resize-none bg-card"
                        />
                      </div>
                    </div>
                  )}

                  {/* 详细描述 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                      {t("feedback.contentLabel")}
                    </label>
                    <textarea
                      name="content"
                      value={form.content}
                      onChange={handleChange}
                      placeholder={
                        type === "suggestion"
                          ? t("feedback.contentPlaceholderSuggestion")
                          : t("feedback.contentPlaceholderBug")
                      }
                      required
                      rows={6}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors resize-none bg-card"
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
                      className={`inline-flex items-center gap-2 ${
                        type === "bug"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-amber-600 hover:bg-amber-700"
                      } disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors`}
                    >
                      <Send className="h-4 w-4" />
                      {submitting ? t("feedback.submitting") : t("feedback.submitBtn")}
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
