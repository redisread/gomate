import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/starwind-react/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/starwind-react/collapsible";
import { SubmitButton } from "@/components/ui/submit-button";
import { useI18n } from "@/hooks/useI18n";
import "./team-form.css";

export function TeamFormFrame({
  title,
  backHref,
  backLabel,
  children,
  beforeForm,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
  beforeForm?: ReactNode;
}) {
  return (
    <main className="team-form-page min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 pt-20 sm:px-6 sm:pb-12 sm:pt-24">
        <header className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <a
            href={backHref}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </a>
          <h1 className="text-page-h1">{title}</h1>
        </header>
        {beforeForm}
        <div className="rounded-2xl bg-card p-4 shadow-card sm:p-6">
          {children}
        </div>
      </div>
    </main>
  );
}

export function TeamFormSupplementary({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const { t } = useI18n(["teams"]);
  const [open, setOpen] = useState(defaultOpen);
  const [animated, setAnimated] = useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => {
        setAnimated(true);
        setOpen(nextOpen);
      }}
      className="rounded-xl bg-muted/60"
    >
      <h2>
        <CollapsibleTrigger
          type="button"
          className="group flex min-h-14 w-full items-center gap-3 rounded-xl px-4 py-3 text-start focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              {t("teams.formSupplementary")}
            </span>
            <span className="block text-xs font-normal text-muted-foreground">
              {t("teams.formSupplementaryHint")}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 transition-transform duration-150 group-aria-expanded:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent
        className="team-form-extra"
        data-animated={animated}
        inert={!open}
      >
        <div className="space-y-4 px-4 pb-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function TeamFormActions({
  label,
  loadingLabel,
  loading,
  disabled,
  error,
  onCancel,
  testId,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  disabled?: boolean;
  error: string;
  onCancel: () => void;
  testId?: string;
}) {
  const { t } = useI18n(["common"]);
  const actionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const actions = actionsRef.current;
    const page = actions?.closest<HTMLElement>(".team-form-page");
    if (!actions || !page) return;
    const viewport = window.visualViewport;
    let frame = 0;
    let keepFocusVisible = false;
    function schedule(keepFocus = false) {
      keepFocusVisible ||= keepFocus;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mobile = window.matchMedia("(max-width: 639px)").matches;
        const active = document.activeElement;
        const editing =
          active instanceof HTMLElement &&
          page!.contains(active) &&
          active.matches("input, textarea, select, [contenteditable=true]");
        const offset =
          mobile && viewport && viewport.scale === 1
            ? Math.max(
                0,
                window.innerHeight - viewport.height - viewport.offsetTop,
              )
            : 0;
        page!.style.setProperty("--team-form-keyboard-offset", `${offset}px`);
        page!.style.setProperty(
          "--team-form-actions-height",
          `${actions!.getBoundingClientRect().height}px`,
        );
        if (keepFocusVisible && mobile && editing) {
          const overlap =
            active.getBoundingClientRect().bottom -
            actions!.getBoundingClientRect().top +
            12;
          if (overlap > 0)
            window.scrollBy({ top: overlap, behavior: "instant" });
        }
        keepFocusVisible = false;
      });
    }
    const update = () => schedule(true);
    const scroll = () => schedule();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(actions);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", scroll);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      page.style.removeProperty("--team-form-keyboard-offset");
      page.style.removeProperty("--team-form-actions-height");
    };
  }, []);
  return (
    <div
      ref={actionsRef}
      className="team-form-actions"
      data-testid="team-form-actions"
    >
      {error && (
        <p
          role="alert"
          className="mb-3 break-words rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="flex gap-3 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={onCancel}
          className="min-h-11 flex-1 sm:flex-none"
        >
          {t("common.cancel")}
        </Button>
        <SubmitButton
          data-testid={testId}
          loading={loading}
          loadingText={loadingLabel}
          disabled={disabled}
          className="min-h-11 flex-[2] px-6 sm:flex-none sm:min-w-36"
        >
          {label}
        </SubmitButton>
      </div>
    </div>
  );
}
