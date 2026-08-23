import { MapPinPlus, X } from "lucide-react";
import * as React from "react";

import { Modal } from "@/components/ui/modal";

export interface AdminQuickActionProps {
  label: string;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  onOpenChange?: (open: boolean) => void;
}

export function AdminQuickAction({
  label,
  title,
  closeLabel,
  children,
  initialFocusRef,
  onOpenChange,
}: AdminQuickActionProps) {
  const [open, setOpen] = React.useState(false);
  const titleId = React.useId();

  const updateOpen = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => updateOpen(true)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-[background-color,scale] duration-100 hover:bg-primary/90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <MapPinPlus className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span className="hidden min-w-0 break-words sm:inline">{label}</span>
      </button>

      <Modal
        open={open}
        onClose={() => updateOpen(false)}
        labelledBy={titleId}
        initialFocusRef={initialFocusRef}
        lockBodyScroll
        data-testid="admin-quick-action-overlay"
        overlayClassName="flex items-end justify-center sm:items-center sm:p-4"
        backdropClassName="bg-foreground/30 backdrop-blur-sm"
        panelClassName="flex max-h-[calc(100dvh-env(safe-area-inset-top))] w-full flex-col overflow-hidden rounded-t-2xl bg-card pb-[env(safe-area-inset-bottom)] text-card-foreground shadow-xl transition-[transform,opacity] duration-150 ease-out sm:max-h-[min(44rem,calc(100dvh-2rem))] sm:max-w-xl sm:rounded-2xl sm:pb-0 motion-reduce:transition-none"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 px-4 py-4 shadow-[0_1px_0_0_var(--border)] sm:px-6">
          <h2
            id={titleId}
            className="min-w-0 break-words text-lg font-semibold leading-7 text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => updateOpen(false)}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-[background-color,color,scale] duration-100 hover:bg-muted hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <X className="size-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {children}
        </div>
      </Modal>
    </>
  );
}
