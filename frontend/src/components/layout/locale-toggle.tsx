"use client";

import * as React from "react";
import {
  type Locale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  getLocale,
  setLocale,
} from "@/i18n";

const LOCALE_LABELS: Record<string, string> = {
  "zh-CN": "中文",
  en: "English",
  ja: "日本語",
};

/**
 * LocaleToggle — pure text language switcher
 */
export function LocaleToggle() {
  const [current, setCurrent] = React.useState<Locale>(DEFAULT_LOCALE);

  React.useEffect(() => {
    setCurrent(getLocale());
  }, []);

  const handleSelect = (locale: Locale) => {
    if (locale === current) return;
    setLocale(locale);
    setCurrent(locale);

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
    <div className="flex items-center gap-1 text-sm" data-locale-toggle>
      {SUPPORTED_LOCALES.map((locale, i) => {
        const isActive = locale === current;
        return (
          <React.Fragment key={locale}>
            <button
              type="button"
              onClick={() => handleSelect(locale)}
              className={`px-1.5 py-0.5 transition-colors duration-150 border-b-2 ${
                isActive
                  ? "text-white border-amber-400 font-medium"
                  : "text-muted-foreground border-transparent hover:text-white"
              }`}
            >
              {LOCALE_LABELS[locale] || locale.toUpperCase()}
            </button>
            {i < SUPPORTED_LOCALES.length - 1 && (
              <span className="text-muted-foreground/40 select-none">|</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
