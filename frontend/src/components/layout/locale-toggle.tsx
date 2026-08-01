"use client";

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

/**
 * LocaleToggle — responsive language selector
 *
 * - Desktop (>md): dropdown (Globe icon + current name)
 * - Mobile (<=md): horizontal button group (all options visible)
 *
 * 选择后跳转对应 locale 前缀路径并刷新页面。
 */
export function LocaleToggle() {
  const [current, setCurrent] = React.useState<Locale>(DEFAULT_LOCALE);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    setCurrent(getLocale());

    // 检测移动端（与 Tailwind `md` 断点一致）
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener("change", handler as (e: MediaQueryListEvent) => void);
  }, []);

  // 点击外部关闭下拉菜单（仅桌面端需要）
  React.useEffect(() => {
    if (!isOpen || isMobile) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-locale-toggle]")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [isOpen, isMobile]);

  const handleSelect = (locale: Locale) => {
    if (locale === current) {
      setIsOpen(false);
      return;
    }
    setLocale(locale);
    setCurrent(locale);
    setIsOpen(false);

    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);
    const first = segments[0] as Locale | undefined;
    const hasPrefix = SUPPORTED_LOCALES.includes(first as Locale);

    let newPath: string;
    if (locale === DEFAULT_LOCALE) {
      newPath = hasPrefix ? "/" + segments.slice(1).join("/") : path;
      if (!newPath.startsWith("/")) newPath = "/" + newPath;
    } else {
      newPath = hasPrefix
        ? "/" + [locale, ...segments.slice(1)].join("/")
        : "/" + locale + path;
    }
    if (!newPath || newPath === "/") newPath = locale === DEFAULT_LOCALE ? "/" : "/" + locale;

    window.location.href = newPath;
  };

  // 移动端：横向按钮组
  if (isMobile) {
    return (
      <div className="flex items-center gap-2" data-locale-toggle>
        {SUPPORTED_LOCALES.map((locale) => {
          const isActive = locale === current;
          return (
            <button
              key={locale}
              type="button"
              onClick={() => handleSelect(locale)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150",
                isActive
                  // task #180 a11y：active state bg-primary oklch(0.666 0.157 58.3) + cream text = ~3.3:1 挂门禁；amber-700 + white 稳过
                  ? "bg-amber-700 text-white hover:bg-amber-800"
                  // task #180 a11y：inactive muted-foreground on accent 小字体挂门禁；stone-700/stone-300
                  : "bg-accent text-stone-700 hover:text-foreground dark:text-stone-300"
              )}
            >
              {getLocaleName(locale)}
            </button>
          );
        })}
      </div>
    );
  }

  // 桌面端：下拉菜单
  return (
    <div className="relative" data-locale-toggle>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-9 flex items-center gap-1.5 px-2 rounded-lg text-stone-600 dark:text-stone-400",
          "hover:bg-accent hover:text-foreground transition-colors duration-150"
        )}
        aria-label={getLocaleName(current)}
        aria-expanded={isOpen}
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">{getLocaleName(current)}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-36 rounded-xl overflow-hidden z-50 bg-popover border border-border shadow-lg"
          style={{
            animation: "fade-up 0.15s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {SUPPORTED_LOCALES.map((locale) => {
            const isActive = locale === current;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => handleSelect(locale)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors",
                  isActive
                    ? "text-primary bg-accent"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <span>{getLocaleName(locale)}</span>
                {isActive && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
