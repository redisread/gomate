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
 * LocaleToggle — dropdown language selector
 *
 * - 触发按钮：Globe 图标 + 当前语言名
 * - 下拉菜单：所有支持语言，当前项带 ✓
 * - 选择后跳转对应 locale 前缀路径
 */
export function LocaleToggle() {
  const [current, setCurrent] = React.useState<Locale>(DEFAULT_LOCALE);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setCurrent(getLocale());
  }, []);

  // 点击外部关闭菜单
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-locale-toggle]")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [isOpen]);

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

  return (
    <div className="relative" data-locale-toggle>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-9 flex items-center gap-1.5 px-2 rounded-lg text-muted-foreground",
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
