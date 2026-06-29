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
import { useToast } from "@/hooks/useToast";

interface LanguageSwitcherProps {
  className?: string;
}

// 国旗 emoji 映射
const LOCALE_FLAGS: Record<Locale, string> = {
  "zh-CN": "🇨🇳",
  en: "🇺🇸",
};

/**
 * 语言切换器组件
 * - 显示当前语言（国旗 + 名称）
 * - 点击展开语言选择菜单
 * - 支持键盘导航（↑↓ Enter Esc）
 * - 选择后设置 cookie、显示 Toast、重定向到对应语言的相同页面
 */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t } = useI18n(["common"]);
  const { toast, show: showToast, isExiting } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentLocale, setCurrentLocale] = React.useState<Locale>(DEFAULT_LOCALE);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    setCurrentLocale(getLocale());
  }, []);

  // 键盘导航
  React.useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % SUPPORTED_LOCALES.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + SUPPORTED_LOCALES.length) % SUPPORTED_LOCALES.length);
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < SUPPORTED_LOCALES.length) {
            handleSelect(SUPPORTED_LOCALES[focusedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex]);

  // 焦点跟随
  React.useEffect(() => {
    if (focusedIndex >= 0) {
      buttonRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  const handleSelect = (locale: Locale) => {
    if (locale === currentLocale) {
      setIsOpen(false);
      return;
    }

    setLocale(locale);
    setCurrentLocale(locale);
    setIsOpen(false);

    // 显示 Toast 反馈
    const localeName = getLocaleName(locale);
    showToast({
      type: "success",
      message: t("common.languageChangedTo", { vars: { lang: localeName } }),
    });

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

  const handleMouseEnter = (index: number) => {
    setFocusedIndex(index);
  };

  return (
    <div className={`relative inline-block ${className || ""}`} data-lang-switcher>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground px-2 py-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-colors duration-150"
        aria-label={t("common.switchLanguage")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-base" role="img" aria-label={getLocaleName(currentLocale)}>
          {LOCALE_FLAGS[currentLocale]}
        </span>
        <span className="hidden sm:inline">{getLocaleName(currentLocale)}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-40 rounded-xl overflow-hidden bg-popover border border-border shadow-lg z-50"
          style={{
            animation: "fade-up 0.15s cubic-bezier(0.16,1,0.3,1) both",
          }}
          role="listbox"
          aria-label={t("common.switchLanguage")}
        >
          {SUPPORTED_LOCALES.map((locale, index) => {
            const isActive = locale === currentLocale;
            const isFocused = index === focusedIndex;
            return (
              <button
                key={locale}
                ref={(el) => { buttonRefs.current[index] = el; }}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(locale)}
                onMouseEnter={() => handleMouseEnter(index)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "text-primary bg-accent font-medium"
                    : isFocused
                    ? "bg-accent/50 text-foreground"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <span className="text-base" role="img" aria-label={getLocaleName(locale)}>
                  {LOCALE_FLAGS[locale]}
                </span>
                <span className="flex-1 text-left">{getLocaleName(locale)}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Toast 通知 */}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-lg shadow-lg bg-popover border border-border text-sm text-foreground transition-all duration-200 ${
            isExiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
