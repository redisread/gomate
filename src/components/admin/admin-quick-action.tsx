import { Button as SwButton } from "@/components/starwind-react/button";
import { X } from "lucide-react";
import * as React from "react";

import { Modal } from "@/components/ui/modal";

export interface AdminQuickActionDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function AdminQuickActionDialog({
  open,
  onClose,
  title,
  closeLabel,
  children,
  initialFocusRef,
  returnFocusRef,
}: AdminQuickActionDialogProps) {
  const titleId = React.useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      initialFocusRef={initialFocusRef}
      returnFocusRef={returnFocusRef}
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
        <SwButton variant="plain" size="inherit"
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-[background-color,color,scale] duration-100 hover:bg-muted hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <X className="size-5" strokeWidth={2} aria-hidden="true" />
        </SwButton>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        {children}
      </div>
    </Modal>
  );
}
