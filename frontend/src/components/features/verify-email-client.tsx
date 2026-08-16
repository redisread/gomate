"use client";

import * as React from "react";
import { CheckCircle2, Loader2, MailCheck, Mountain, XCircle } from "lucide-react";

import { useI18n } from "@/hooks/useI18n";
import { fetchAPI } from "@/lib/api";

type VerificationState = "ready" | "confirming" | "success" | "error";

export function VerifyEmailClient() {
  const { t } = useI18n(["auth"]);
  const [state, setState] = React.useState<VerificationState>("ready");
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/u, ""));
    const fragmentToken = params.get("token");
    const scrubbedUrl = new URL(window.location.href);
    scrubbedUrl.searchParams.delete("token");
    window.history.replaceState(
      window.history.state,
      "",
      `${scrubbedUrl.pathname}${scrubbedUrl.search}`,
    );
    if (!fragmentToken) {
      setState("error");
      return;
    }
    setToken(fragmentToken);
  }, []);

  const confirmEmail = React.useCallback(() => {
    if (!token || state === "confirming") return;
    setState("confirming");
    void fetchAPI("/auth/confirm-email", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((response) => {
        setState(response.ok ? "success" : "error");
      })
      .catch(() => {
        setState("error");
      });
  }, [state, token]);

  const isChecking = state === "confirming";
  const isSuccess = state === "success";
  const isReady = state === "ready" && token !== null;
  const Icon = isChecking
    ? Loader2
    : isSuccess
      ? CheckCircle2
      : isReady
        ? MailCheck
        : XCircle;

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center text-center">
        <a href="/" className="mb-10 inline-flex items-center gap-2 text-xl font-bold">
          <Mountain className="h-7 w-7 text-primary" aria-hidden="true" />
          GoMate
        </a>
        <section className="w-full rounded-3xl border bg-card p-8 shadow-sm" aria-live="polite">
          <Icon
            className={`mx-auto mb-5 h-12 w-12 ${isChecking ? "animate-spin text-primary" : isSuccess || isReady ? "text-primary" : "text-destructive"}`}
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold">
            {isChecking
              ? t("auth.verificationConfirming")
              : isSuccess
                ? t("auth.verificationConfirmed")
                : isReady
                  ? t("auth.verificationReady")
                  : t("auth.verificationInvalid")}
          </h1>
          {isReady && (
            <button
              type="button"
              onClick={confirmEmail}
              className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              {t("auth.verificationConfirm")}
            </button>
          )}
          {!isChecking && !isReady && (
            <a
              href={isSuccess ? "/login" : "/register"}
              className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              {isSuccess ? t("auth.goLogin") : t("auth.registerNow")}
            </a>
          )}
        </section>
      </div>
    </main>
  );
}
