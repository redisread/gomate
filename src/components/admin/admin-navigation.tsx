import {
  ExternalLink,
  House,
  MapPinned,
  MapPinPlus,
  Menu,
  Mountain,
  Tags,
  Users,
  X,
} from "lucide-react";
import * as React from "react";

import { LocaleToggle } from "@/components/layout/locale-toggle";
import { Modal } from "@/components/ui/modal";
import { DEFAULT_LOCALE, type Locale } from "@/i18n";
import type { AdminIdentity } from "@/server/lib/admin-access";

export interface AdminNavigationCopy {
  brand: string;
  navigationLabel: string;
  navHome: string;
  navNewLocation: string;
  navLocations: string;
  navTags: string;
  navUsers: string;
  backToFrontend: string;
  openNavigation: string;
  closeNavigation: string;
}

interface AdminNavigationProps {
  copy: AdminNavigationCopy;
  currentPath: string;
  locale: Locale;
  admin: AdminIdentity;
}

function localizedPath(path: string, locale: Locale) {
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

function navigationItems(copy: AdminNavigationCopy, locale: Locale) {
  return [
    { path: "/admin", label: copy.navHome, icon: House, exact: true },
    {
      path: "/admin/locations",
      label: copy.navLocations,
      icon: MapPinned,
      exact: true,
    },
    {
      path: "/admin/locations/new",
      label: copy.navNewLocation,
      icon: MapPinPlus,
      exact: false,
    },
    { path: "/admin/tags", label: copy.navTags, icon: Tags, exact: false },
    { path: "/admin/users", label: copy.navUsers, icon: Users, exact: false },
  ].map((item) => ({ ...item, href: localizedPath(item.path, locale) }));
}

function NavigationLinks({
  copy,
  currentPath,
  locale,
}: Pick<AdminNavigationProps, "copy" | "currentPath" | "locale">) {
  return (
    <>
      <div className="space-y-1">
        {navigationItems(copy, locale).map(
          ({ href, path, label, icon: Icon, exact }) => {
            const current = exact
              ? currentPath === path
              : currentPath === path || currentPath.startsWith(`${path}/`);
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
          },
        )}
      </div>
      <a
        href={localizedPath("/", locale)}
        className="mt-auto flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-100 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ExternalLink className="size-5 shrink-0" strokeWidth={2} />
        <span className="min-w-0 break-words">{copy.backToFrontend}</span>
      </a>
    </>
  );
}

function Brand({
  copy,
  locale,
}: Pick<AdminNavigationProps, "copy" | "locale">) {
  return (
    <a
      href={localizedPath("/admin", locale)}
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
  locale,
  admin,
}: AdminNavigationProps) {
  const [hydrated, setHydrated] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const closeNavigation = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => setHydrated(true), []);

  return (
    <>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col bg-card px-4 py-5 shadow-[1px_0_0_0_var(--border)] lg:flex">
        <Brand copy={copy} locale={locale} />
        <nav
          aria-label={copy.navigationLabel}
          className="mt-8 flex min-h-0 flex-1 flex-col"
        >
          <NavigationLinks
            copy={copy}
            currentPath={currentPath}
            locale={locale}
          />
        </nav>
        <div className="mt-4 border-t border-border pt-4">
          <LocaleToggle initialLocale={locale} presentation="dropdown" />
        </div>
        <p className="mt-5 truncate px-3 text-xs text-muted-foreground">
          {admin.displayName}
        </p>
      </aside>

      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 bg-background/95 px-4 shadow-[0_1px_0_0_var(--border)] backdrop-blur lg:hidden">
        <Brand copy={copy} locale={locale} />
        <div className="flex shrink-0 items-center gap-1">
          <LocaleToggle initialLocale={locale} presentation="dropdown" />
          <button
            ref={triggerRef}
            type="button"
            aria-label={copy.openNavigation}
            aria-haspopup="dialog"
            aria-expanded={open}
            disabled={!hydrated}
            onClick={() => setOpen(true)}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-[background-color,scale] duration-100 hover:bg-muted active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <Menu className="size-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </header>

      <Modal
        open={open}
        onClose={closeNavigation}
        labelledBy={titleId}
        initialFocusRef={closeRef}
        returnFocusRef={triggerRef}
        lockBodyScroll
        backdropClassName="bg-foreground/25"
        panelClassName="ms-auto flex h-full w-[min(20rem,calc(100%-2rem))] flex-col bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-xl transition-transform duration-150 ease-out motion-reduce:transition-none"
      >
        <h2 id={titleId} className="sr-only">
          {copy.navigationLabel}
        </h2>
        <div className="flex items-center justify-between gap-3">
          <Brand copy={copy} locale={locale} />
          <button
            ref={closeRef}
            type="button"
            aria-label={copy.closeNavigation}
            onClick={closeNavigation}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-[background-color,scale] duration-100 hover:bg-muted active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <X className="size-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <nav
          aria-label={copy.navigationLabel}
          className="mt-8 flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <NavigationLinks
            copy={copy}
            currentPath={currentPath}
            locale={locale}
          />
        </nav>
      </Modal>
    </>
  );
}
