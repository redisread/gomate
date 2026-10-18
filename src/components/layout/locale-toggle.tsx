"use client";

import { Dropdown, DropdownTrigger, DropdownContent, DropdownRadioGroup, DropdownRadioItem } from "@/components/starwind-react/dropdown";
import { Button as SwButton } from "@/components/starwind-react/button";

import * as React from "react";
import { Globe, Check } from "lucide-react";
import {
  type Locale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  getLocale,
  setLocale,
  getLocaleName,
} from "@/i18n";
import { cn } from "@/lib/utils";

interface LocaleToggleProps {
  initialLocale?: Locale;
  presentation?: "responsive" | "dropdown";
}

export function buildLocalePath(path: string, locale: Locale): string {
  const segments = path.split("/").filter(Boolean);
  const first = segments[0] as Locale | undefined;
  const routeSegments = SUPPORTED_LOCALES.includes(first as Locale)
    ? segments.slice(1)
    : segments;

  if (locale === DEFAULT_LOCALE) {
    return routeSegments.length > 0 ? `/${routeSegments.join("/")}` : "/";
  }

  return `/${[locale, ...routeSegments].join("/")}`;
}

/**
 * LocaleToggle — responsive language selector
 *
 * - Desktop (>md): dropdown (Globe icon + current name)
 * - Mobile (<=md): horizontal button group (all options visible)
 *
 * 选择后跳转对应 locale 前缀路径并刷新页面。
 */
export function LocaleToggle({
  initialLocale,
  presentation = "responsive",
}: LocaleToggleProps = {}) {
  const [current, setCurrent] = React.useState<Locale>(
    initialLocale ?? DEFAULT_LOCALE,
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!initialLocale) setCurrent(getLocale());

    // 检测移动端（与 Tailwind `md` 断点一致）
    if (presentation === "dropdown") return;

    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () =>
      mq.removeEventListener(
        "change",
        handler as (e: MediaQueryListEvent) => void,
      );
  }, [initialLocale, presentation]);

  const handleSelect = (locale: Locale) => {
    if (locale === current) {
      setIsOpen(false);
      return;
    }
    setLocale(locale);
    setCurrent(locale);
    setIsOpen(false);

    const newPath = buildLocalePath(window.location.pathname, locale);
    window.location.href = `${newPath}${window.location.search}${window.location.hash}`;
  };

  // 移动端：横向按钮组
  if (presentation === "responsive" && isMobile) {
    return (
      <div className="flex items-center gap-2" data-locale-toggle>
        {SUPPORTED_LOCALES.map((locale) => {
          const isActive = locale === current;
          return (
            <SwButton variant="plain" size="inherit"
              key={locale}
              type="button"
              onClick={() => handleSelect(locale)}
              className={cn(
                "min-h-11 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150",
                isActive
                  ? // task #180 a11y：active state bg-primary var(--primary) + cream text = ~3.3:1 挂门禁；amber-700 + white 稳过
                    "bg-amber-700 text-white hover:bg-amber-800"
                  : // task #180 a11y：inactive muted-foreground on accent 小字体挂门禁；stone-700/stone-300
                    "bg-accent text-stone-700 hover:text-foreground dark:text-stone-300",
              )}
            >
              {getLocaleName(locale)}
            </SwButton>
          );
        })}
      </div>
    );
  }

  // Starwind owns outside dismissal, roving focus and Escape restoration.
  return (
    <Dropdown open={isOpen} onOpenChange={setIsOpen} className="relative" data-locale-toggle>
      <DropdownTrigger ref={triggerRef} type="button"
        className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-stone-600 dark:text-stone-400 hover:bg-accent hover:text-foreground transition-colors duration-150"
        aria-label={getLocaleName(current)}
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">{getLocaleName(current)}</span>
      </DropdownTrigger>
      <DropdownContent disablePortal align="end" className="w-36 rounded-xl bg-popover border border-border shadow-lg">
        <DropdownRadioGroup value={current} onValueChange={(value) => handleSelect(value as Locale)}>
          {SUPPORTED_LOCALES.map((locale) => (
            <DropdownRadioItem key={locale} value={locale} closeOnClick showIndicator={false}
              className={cn("flex min-h-11 w-full items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors", locale === current ? "text-primary bg-accent" : "text-foreground hover:bg-accent")}
            >
              <span>{getLocaleName(locale)}</span>
              {locale === current && <Check className="h-3.5 w-3.5" />}
            </DropdownRadioItem>
          ))}
        </DropdownRadioGroup>
      </DropdownContent>
    </Dropdown>
  );
}
