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
import { useI18n } from "@/hooks/useI18n";

interface LanguageSwitcherProps {
  className?: string;
}

/**
 * 语言切换器组件
 * - 显示当前语言
 * - 点击展开语言选择菜单
 * - 选择后设置 cookie 并重定向到对应语言的相同页面
 */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t } = useI18n(["common"]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentLocale, setCurrentLocale] = React.useState<Locale>(DEFAULT_LOCALE);

  React.useEffect(() => {
    setCurrentLocale(getLocale());
  }, []);

  const handleSelect = (locale: Locale) => {
    setLocale(locale);
    setCurrentLocale(locale);
    setIsOpen(false);

    // 重定向到对应语言的页面
    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);
    const firstSegment = segments[0] as Locale | undefined;
    const hasLocalePrefix = SUPPORTED_LOCALES.includes(firstSegment as Locale);

    let newPath: string;
    if (locale === DEFAULT_LOCALE) {
      // 切换到默认语言：去掉前缀
      newPath = hasLocalePrefix ? "/" + segments.slice(1).join("/") : path;
      if (!newPath.startsWith("/")) newPath = "/" + newPath;
    } else {
      // 切换到非默认语言：添加/替换前缀
      if (hasLocalePrefix) {
        segments[0] = locale;
        newPath = "/" + segments.join("/");
      } else {
        newPath = "/" + locale + path;
      }
    }

    // 确保路径有效
    if (!newPath || newPath === "/") newPath = locale === DEFAULT_LOCALE ? "/" : "/" + locale;

    window.location.href = newPath;
  };

  return (
    <div className={`relative inline-block ${className || ""}`} data-lang-switcher>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm text-muted-foreground px-2 py-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-colors duration-150"
        aria-label={t("common.switchLanguage")}
        aria-expanded={isOpen}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{getLocaleName(currentLocale)}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-36 rounded-xl overflow-hidden bg-popover border border-border shadow-lg z-50"
          style={{
            animation: "fade-up 0.15s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {SUPPORTED_LOCALES.map((locale) => {
            const isActive = locale === currentLocale;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => handleSelect(locale)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "text-primary bg-accent font-medium"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {isActive && <Check className="h-3.5 w-3.5" />}
                <span className={isActive ? "" : "ml-5"}>{getLocaleName(locale)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
