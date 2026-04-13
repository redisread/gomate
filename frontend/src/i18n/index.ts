/**
 * i18n 翻译工具函数
 *
 * 类型安全的 t(key, options) 函数，支持：
 * - 编译时 key 检查
 * - 变量替换 {variable}
 * - 语言回退链：ja → en → zh-CN
 * - 开发模式缺失 key 告警
 */

import zhCN from "./locales/zh-CN.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<typeof zhCN>;

// 从嵌套路径中提取值
type LeafValue<T, K extends string> = K extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? LeafValue<T[Head], Rest>
    : never
  : K extends keyof T
    ? T[K]
    : never;

// 从值中提取 {variable} 占位符
type TemplateVars<S extends string> = S extends `${string}{${infer Key}}${infer Rest}`
  ? { [P in Key | keyof TemplateVars<Rest>]: string | number }
  : Record<string, never>;

// 合并所有可能的变量 key
type ExtractVars<T> = T extends string ? TemplateVars<T> : never;

// t() 函数的 options 类型
interface TranslateOptions {
  locale?: Locale;
  vars?: Record<string, string | number>;
}

// ─── 语言配置 ─────────────────────────────────────────────────────────────────

export type Locale = "zh-CN" | "en" | "ja";

export const SUPPORTED_LOCALES: Locale[] = ["zh-CN", "en", "ja"];

export const DEFAULT_LOCALE: Locale = "zh-CN";

// 语言回退链：ja → en → zh-CN
const FALLBACK_MAP: Record<Locale, Locale[]> = {
  ja: ["en", "zh-CN"],
  en: ["zh-CN"],
  "zh-CN": [],
};

// ─── 翻译数据存储 ─────────────────────────────────────────────────────────────

const translations: Record<Locale, typeof zhCN> = {
  "zh-CN": zhCN,
  en: en,
  ja: ja,
};

// ─── 核心函数 ─────────────────────────────────────────────────────────────────

/**
 * 从嵌套对象中通过点号路径获取值
 */
function getNestedValue(obj: Record<string, any>, path: string): string | undefined {
  const keys = path.split(".");
  let current: any = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[key];
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * 替换模板字符串中的 {variable} 占位符
 */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in vars ? String(vars[key]) : match;
  });
}

/**
 * 翻译函数
 *
 * @param key - 翻译 key（类型安全，IDE 自动补全）
 * @param options - 可选参数：locale 和 vars（变量替换）
 * @returns 翻译后的字符串
 *
 * @example
 * t('hero.titleLine1', { locale: 'en' })  // "Discover"
 * t('teams.openTeamsSubtitle', { vars: { count: 5 }, locale: 'en' })  // "5 teams waiting for you"
 */
export function t(key: TranslationKey, options?: TranslateOptions): string {
  const locale = options?.locale || DEFAULT_LOCALE;

  // 1. 尝试当前语言
  let value = getNestedValue(translations[locale], key);

  // 2. 如果缺失，尝试回退链
  if (value === undefined) {
    for (const fallback of FALLBACK_MAP[locale]) {
      value = getNestedValue(translations[fallback], key);
      if (value !== undefined) break;
    }
  }

  // 3. 仍然缺失，开发模式告警
  if (value === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation key: "${key}" for locale "${locale}"`);
    }
    value = key; // 返回 key 本身作为 fallback
  }

  // 4. 变量替换
  return interpolate(value, options?.vars);
}

/**
 * 获取当前 locale（从 URL 或 cookie 读取）
 * 在 Astro 页面中使用 Astro.params.locale
 * 在浏览器端使用此函数读取 cookie
 */
export function getLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  const match = document.cookie.match(/gomate_locale=(zh-CN|en|ja)/);
  if (match) return match[1] as Locale;

  // 从浏览器语言推断
  const browserLang = navigator.language;
  if (browserLang.startsWith("ja")) return "ja";
  if (browserLang.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

/**
 * 设置语言 cookie
 */
export function setLocale(locale: Locale): void {
  document.cookie = `gomate_locale=${locale};path=/;max-age=31536000;samesite=lax`;
}

/**
 * 从 cookie 字符串中提取 locale（SSR 用）
 */
export function getLocaleFromCookie(cookieStr: string): Locale {
  const match = cookieStr.match(/gomate_locale=(zh-CN|en|ja)/);
  if (match) return match[1] as Locale;
  return DEFAULT_LOCALE;
}

/**
 * 获取语言显示名称
 */
export function getLocaleName(locale: Locale): string {
  const names: Record<Locale, string> = {
    "zh-CN": "中文",
    en: "English",
    ja: "日本語",
  };
  return names[locale];
}

/**
 * 根据当前 locale 获取对应页面的 title
 * SSR 用，Astro 页面在 <head> 中使用
 */
export function getSSRT(locale: Locale) {
  return {
    t: (key: TranslationKey, vars?: Record<string, string | number>) => {
      return t(key, { locale, vars });
    },
  };
}
