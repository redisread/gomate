import { Alert as SwAlert } from "@/components/starwind-react/alert";
import { Button as SwButton } from "@/components/starwind-react/button";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { signIn } from "@/lib/auth-client";
import { resolveLoginReturnPath } from "@/lib/login-return-path";

export function GoogleSignIn({
  enabled,
  disabled = false,
  onBusyChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useI18n(["auth"]);
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    setFailed(new URLSearchParams(window.location.search).has("oauthError"));
  }, []);

  async function continueWithGoogle() {
    setBusy(true);
    onBusyChange?.(true);
    setFailed(false);
    const params = new URLSearchParams(window.location.search);
    const callbackURL = resolveLoginReturnPath(
      params.get("returnTo") ?? params.get("redirect"),
    );
    try {
      const result = await signIn.social({ provider: "google", callbackURL });
      if (result.error || !result.data?.redirect)
        throw new Error("OAuth redirect unavailable");
      // Keep the action locked until Better Auth navigates to Google.
    } catch {
      setFailed(true);
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  if (!enabled) return null;
  return (
    <div className="mb-6 space-y-3">
      <SwButton variant="plain" size="inherit"
        type="button"
        data-testid="google-sign-in"
        disabled={disabled || busy}
        onClick={continueWithGoogle}
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
        aria-busy={busy}
      >
        {busy ? (
          <Loader2
            className="h-5 w-5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <img src="/google-g.png" width="20" height="20" alt="" />
        )}
        {t(busy ? "auth.googleLoading" : "auth.googleContinue")}
      </SwButton>
      {failed && (
        <SwAlert as="p" variant="plain" role="alert" className="text-sm text-destructive">
          {t("auth.googleError")}
        </SwAlert>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("auth.googleNotice")}{" "}
        <a href="/terms" className="underline underline-offset-2">
          {t("auth.termsOfService")}
        </a>
        {" · "}
        <a href="/privacy" className="underline underline-offset-2">
          {t("auth.privacyPolicy")}
        </a>
      </p>
      <div
        className="flex items-center gap-3 text-xs text-muted-foreground"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-border" />
        {t("auth.orEmail")}
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
