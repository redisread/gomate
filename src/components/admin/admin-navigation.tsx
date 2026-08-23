import {
  ExternalLink,
  House,
  MapPinPlus,
  Menu,
  Mountain,
  X,
} from "lucide-react";
import * as React from "react";

import type { AdminIdentity } from "@/server/lib/admin-access";

export interface AdminNavigationCopy {
  brand: string;
  navigationLabel: string;
  navHome: string;
  navNewLocation: string;
  backToFrontend: string;
  openNavigation: string;
  closeNavigation: string;
}

interface AdminNavigationProps {
  copy: AdminNavigationCopy;
  currentPath: string;
  admin: AdminIdentity;
}

function navigationItems(copy: AdminNavigationCopy) {
  return [
    { href: "/admin", label: copy.navHome, icon: House, exact: true },
    {
      href: "/admin/locations/new",
      label: copy.navNewLocation,
      icon: MapPinPlus,
      exact: false,
    },
  ];
}

function NavigationLinks({
  copy,
  currentPath,
}: Pick<AdminNavigationProps, "copy" | "currentPath">) {
  return (
    <>
      <div className="space-y-1">
        {navigationItems(copy).map(({ href, label, icon: Icon, exact }) => {
          const current = exact
            ? currentPath === href
            : currentPath === href || currentPath.startsWith(`${href}/`);
          return (
            <a
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-100 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary"
            >
              <Icon className="size-5 shrink-0" strokeWidth={2} />
              <span className="min-w-0 break-words">{label}</span>
            </a>
          );
        })}
      </div>
      <a
        href="/"
        className="mt-auto flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-100 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ExternalLink className="size-5 shrink-0" strokeWidth={2} />
        <span className="min-w-0 break-words">{copy.backToFrontend}</span>
      </a>
    </>
  );
}

function Brand({ copy }: { copy: AdminNavigationCopy }) {
  return (
    <a
      href="/admin"
      className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Mountain className="size-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="min-w-0 break-words text-sm font-semibold text-foreground">
        {copy.brand}
      </span>
    </a>
  );
}

export function AdminNavigation({
  copy,
  currentPath,
  admin,
}: AdminNavigationProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current && triggerRef.current) {
      triggerRef.current.focus();
      wasOpenRef.current = false;
    }
  }, [open]);

  return (
    <>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col bg-card px-4 py-5 shadow-[1px_0_0_0_var(--border)] lg:flex">
        <Brand copy={copy} />
        <nav
          aria-label={copy.navigationLabel}
          className="mt-8 flex min-h-0 flex-1 flex-col"
        >
          <NavigationLinks copy={copy} currentPath={currentPath} />
        </nav>
        <p className="mt-5 truncate px-3 text-xs text-muted-foreground">
          {admin.displayName}
        </p>
      </aside>

      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 bg-background/95 px-4 shadow-[0_1px_0_0_var(--border)] backdrop-blur lg:hidden">
        <Brand copy={copy} />
        <button
          ref={triggerRef}
          type="button"
          aria-label={copy.openNavigation}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-[background-color,scale] duration-100 hover:bg-muted active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <Menu className="size-5" strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-foreground/25 lg:hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={copy.navigationLabel}
            className="ms-auto flex h-full w-[min(20rem,calc(100%-2rem))] flex-col bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-xl transition-transform duration-150 ease-out motion-reduce:transition-none"
          >
            <div className="flex items-center justify-between gap-3">
              <Brand copy={copy} />
              <button
                ref={closeRef}
                type="button"
                aria-label={copy.closeNavigation}
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-[background-color,scale] duration-100 hover:bg-muted active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <X className="size-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <nav
              aria-label={copy.navigationLabel}
              className="mt-8 flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
              <NavigationLinks copy={copy} currentPath={currentPath} />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
