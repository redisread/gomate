import { Alert as SwAlert } from "@/components/starwind-react/alert";
import { Button as SwButton } from "@/components/starwind-react/button";
import { useI18n } from "@/hooks/useI18n";

/** A failed dependency is recoverable and must not masquerade as signed-out. */
export function RequestFailure() {
  const { t } = useI18n(["common", "errors"]);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <SwAlert as="p" variant="plain" role="alert">{t("errors.loadFailed")}</SwAlert>
      <SwButton variant="plain" size="inherit"
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-11 underline"
      >
        {t("common.retry")}
      </SwButton>
    </main>
  );
}
