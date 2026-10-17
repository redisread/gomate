import * as React from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useI18n } from "@/hooks/useI18n";
import { submitFeedback } from "@/lib/api";

/** One short feedback form; keep submitted text available after a failed request. */
export function FeedbackClient() {
  const { t } = useI18n(["feedback"]);
  const [email, setEmail] = React.useState("");
  const [content, setContent] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const pending = React.useRef(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError(false);
    try {
      await submitFeedback({ email, content });
      setSubmitted(true);
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-bold">{t("feedback.pageTitle")}</h1>
        <p className="mt-3 text-muted-foreground">
          {t("feedback.description")}
        </p>
        {submitted ? (
          <div role="status" className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold">
              {t("feedback.successTitle")}
            </h2>
            <p>{t("feedback.successDesc")}</p>
            <button
              className="min-h-11 underline"
              onClick={() => {
                setContent("");
                setSubmitted(false);
              }}
            >
              {t("feedback.continueSubmitBtn")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="feedback-email"
                className="block mb-2 font-medium"
              >
                {t("feedback.emailLabel")}
              </label>
              <input
                id="feedback-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={320}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-11 rounded-xl border border-border bg-card p-3"
              />
            </div>
            <div>
              <label
                htmlFor="feedback-content"
                className="block mb-2 font-medium"
              >
                {t("feedback.contentLabel")}
              </label>
              <textarea
                id="feedback-content"
                name="content"
                required
                maxLength={5000}
                rows={7}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("feedback.contentPlaceholder")}
                className="w-full rounded-xl border border-border bg-card p-3"
              />
            </div>
            {error && (
              <p role="alert" className="text-destructive">
                {t("feedback.submitError")}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="min-h-11 rounded-full bg-primary px-6 py-3 text-primary-foreground disabled:opacity-60"
            >
              {t(submitting ? "feedback.submitting" : "feedback.submitBtn")}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
