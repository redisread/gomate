import * as React from "react";
import { X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export function HomeGuestStickyCta() {
  const { t } = useI18n(["home"]);
  const [visible, setVisible] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const updateVisibility = () => {
      const threshold = Math.min(640, window.innerHeight * 0.72);
      setVisible(window.scrollY > threshold);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <aside className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-2 rounded-2xl bg-[color:oklch(0.32_0.08_155)] px-3 py-3 text-white shadow-warm-xl md:hidden" aria-label={t("home.guestSticky.ariaLabel")}>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold">{t("home.guestSticky.title")}</p>
        <p className="mt-0.5 truncate text-[0.65rem] text-white/70">{t("home.guestSticky.description")}</p>
      </div>
      <a href="/register?redirect=/teams" className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-primary-50 px-4 py-2 text-xs font-bold text-amber-950 transition-transform duration-150 active:scale-95">
        {t("home.guestSticky.cta")}
      </a>
      <button
        type="button"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={t("home.guestSticky.close")}
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </aside>
  );
}
