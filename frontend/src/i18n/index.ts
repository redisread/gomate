/**
 * i18n 翻译引擎 - 支持按需 namespace 加载
 *
 * 功能：
 * - 运行时 fetch 翻译文件（public/locales/{locale}/{ns}.json）
 * - 双层缓存：内存 Map + localStorage（24h 过期）
 * - 语言回退链：ja → en → zh-CN
 * - SSR 内联数据：window.__I18N_DATA__
 * - 向后兼容的 t(key, options) 签名
 */

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export type Locale = "zh-CN" | "en";

const SUPPORTED_LOCALES: Locale[] = ["zh-CN", "en"];
const DEFAULT_LOCALE: Locale = "zh-CN";

// 语言回退链：en → zh-CN
const FALLBACK_MAP: Record<Locale, Locale[]> = {
  en: ["zh-CN"],
  "zh-CN": [],
};

// 缓存过期时间（24 小时）
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ─── 缓存层 ───────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// 内存缓存：key 格式 "locale:ns"
const memoryCache = new Map<string, CacheEntry<Record<string, unknown>>>();

/**
 * 从 localStorage 读取缓存
 */
function loadFromPersistentCache(key: string): CacheEntry<unknown> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 写入 localStorage 缓存
 */
function saveToPersistentCache(key: string, entry: CacheEntry<unknown>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage 满了或不可用，静默失败
  }
}

/**
 * 从缓存中获取数据（内存优先，回退到 localStorage）
 */
function getFromCache(ns: string, locale: Locale): Record<string, unknown> | null {
  const memKey = `${locale}:${ns}`;
  const mem = memoryCache.get(memKey);
  if (mem && mem.expiresAt > Date.now()) {
    return mem.data;
  }

  // 检查 SSR 预注入的内存缓存（Layout.astro 内联脚本设置）
  if (typeof window !== "undefined") {
    const ssrMemCache = (window as unknown as Record<string, unknown>).__I18N_MEMORY_CACHE__ as
      | Map<string, CacheEntry<Record<string, unknown>>>
      | undefined;
    if (ssrMemCache) {
      const ssrEntry = ssrMemCache.get(memKey);
      if (ssrEntry && ssrEntry.expiresAt > Date.now()) {
        // 同步到模块内存缓存
        memoryCache.set(memKey, ssrEntry);
        return ssrEntry.data;
      }
    }
  }

  // 兜底：直接从 SSR 内联数据读取（防止 hydration 未执行或时序问题）
  if (typeof window !== "undefined") {
    const ssrData = (window as unknown as Record<string, unknown>).__I18N_DATA__ as
      | Record<string, Record<string, Record<string, unknown>>>
      | undefined;
    if (ssrData && ssrData[locale]) {
      const nsData = ssrData[locale][ns];
      if (nsData) {
        // 注入缓存，后续请求走内存
        setCache(ns, locale, nsData as Record<string, unknown>);
        return nsData as Record<string, unknown>;
      }
    }
  }

  const persist = loadFromPersistentCache(`i18n:${memKey}`);
  if (persist && persist.expiresAt > Date.now()) {
    const entry: CacheEntry<Record<string, unknown>> = {
      data: persist.data as Record<string, unknown>,
      expiresAt: persist.expiresAt,
    };
    memoryCache.set(memKey, entry);
    return entry.data;
  }

  return null;
}

/**
 * 写入缓存（同时更新内存和 localStorage）
 */
function setCache(ns: string, locale: Locale, data: Record<string, unknown>): void {
  const memKey = `${locale}:${ns}`;
  const entry: CacheEntry<Record<string, unknown>> = {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  memoryCache.set(memKey, entry);
  saveToPersistentCache(`i18n:${memKey}`, entry);
}

// ─── 运行时加载 ───────────────────────────────────────────────────────────────

const pendingLoads = new Map<string, Promise<Record<string, unknown>>>();

/**
 * 加载单个 namespace 到内存和缓存
 */
export async function loadNamespace(ns: string, locale: Locale): Promise<Record<string, unknown>> {
  // 1. 检查缓存
  const cached = getFromCache(ns, locale);
  if (cached) return cached;

  // 2. 检查是否有正在进行的相同请求
  const loadKey = `${locale}:${ns}`;
  const existing = pendingLoads.get(loadKey);
  if (existing) return existing;

  // 3. 发起 fetch
  const promise = fetch(`/locales/${locale}/${ns}.json`)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to load locale ${locale}/${ns}.json: ${res.status}`);
      }
      const data = (await res.json()) as Record<string, unknown>;
      setCache(ns, locale, data);
      pendingLoads.delete(loadKey);
      return data;
    })
    .catch((err) => {
      pendingLoads.delete(loadKey);
      throw err;
    });

  pendingLoads.set(loadKey, promise);
  return promise;
}

/**
 * 批量加载多个 namespace（并行 fetch）
 */
export async function loadNamespaces(
  nsList: string[],
  locale: Locale,
): Promise<Record<string, Record<string, unknown>>> {
  const results: Record<string, Record<string, unknown>> = {};
  await Promise.all(
    nsList.map(async (ns) => {
      results[ns] = await loadNamespace(ns, locale);
    }),
  );
  return results;
}

/**
 * 预加载 SSR 内联数据（客户端 hydration 时调用）
 * 从 window.__I18N_DATA__ 读取服务端注入的翻译
 */
export function hydrateSSRData(
  data?: Record<Locale, Record<string, Record<string, unknown>>>,
): void {
  const ssrData =
    data ?? (typeof window !== "undefined" ? (window as unknown as Record<string, unknown>).__I18N_DATA__ : null);
  if (!ssrData) return;

  for (const [locale, nsMap] of Object.entries(ssrData)) {
    for (const [ns, nsData] of Object.entries(nsMap)) {
      setCache(ns, locale as Locale, nsData as Record<string, unknown>);
    }
  }
  // 清理全局变量
  if (typeof window !== "undefined") {
    delete (window as unknown as Record<string, unknown>).__I18N_DATA__;
  }
}

// ─── 核心翻译函数 ─────────────────────────────────────────────────────────────

/**
 * 从嵌套对象中通过点号路径获取值
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
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
 * 在缓存中查找翻译值
 */
function findTranslation(key: string, locale: Locale): string | undefined {
  // key 格式: "namespace.subKey.leafKey"
  // 我们尝试用不同层级拆分 namespace
  const parts = key.split(".");
  if (parts.length < 2) return undefined;

  // 尝试所有可能的 namespace 边界
  // 例如 "teams.joinTeam" -> ns="teams", path="joinTeam"
  // 例如 "teams.storyNarrative.growing" -> ns="teams", path="storyNarrative.growing"
  for (let i = 1; i < parts.length; i++) {
    const ns = parts.slice(0, i).join(".");
    const path = parts.slice(i).join(".");

    // 检查缓存
    const nsData = getFromCache(ns, locale);
    if (nsData) {
      const value = getNestedValue(nsData, path);
      if (value !== undefined) return value;
    }
  }

  return undefined;
}

/**
 * 翻译函数（向后兼容）
 *
 * @param key - 翻译 key（包含 namespace，如 'teams.joinTeam'）
 * @param options - 可选参数：locale 和 vars（变量替换）
 * @returns 翻译后的字符串
 *
 * @example
 * t('hero.titleLine1', { locale: 'en' })
 * t('teams.openTeamsSubtitle', { vars: { count: 5 } })
 */
export function t(
  key: string,
  options?: { locale?: Locale; vars?: Record<string, string | number> },
): string {
  const locale = options?.locale || getLocale();

  // 1. 尝试当前语言
  const value = findTranslation(key, locale);
  if (value !== undefined) {
    return interpolate(value, options?.vars);
  }

  // 2. 回退链
  for (const fallback of FALLBACK_MAP[locale]) {
    const fallbackValue = findTranslation(key, fallback);
    if (fallbackValue !== undefined) {
      return interpolate(fallbackValue, options?.vars);
    }
  }

  // 3. 仍然缺失，开发模式告警
  if (import.meta.env.DEV) {
    console.warn(`[i18n] Missing translation key: "${key}" for locale "${locale}"`);
  }
  return key;
}

/**
 * 获取已缓存的 namespace 原始数据
 * 用于访问非字符串值（如数组、嵌套对象）
 */
export function getNamespaceData(ns: string, locale: Locale): Record<string, unknown> | null {
  return getFromCache(ns, locale);
}

// ─── Locale 管理 ──────────────────────────────────────────────────────────────

/**
 * SSR 期间由 Layout.astro 设置，确保 islands 服务端渲染时
 * 与客户端 hydration 使用同一 locale，避免 hydration mismatch
 */
declare global {
   
  var __SSR_LOCALE__: Locale | undefined;
}

/**
 * 获取当前 locale（从 cookie 读取；无 cookie 时与 SSR 渲染保持一致）
 */
export function getLocale(): Locale {
  // SSR 环境（无 document）：优先使用 Layout 注入的 locale
  if (typeof document === "undefined") {
    return globalThis.__SSR_LOCALE__ ?? DEFAULT_LOCALE;
  }

  const match = document.cookie.match(/gomate_locale=(zh-CN|en)/);
  if (match) return match[1] as Locale;

  // task #162：无 cookie 时回退到 SSR 渲染的 locale（html lang 由 Layout 按
  // middleware 决议写入），而非 navigator.language——后者在 Accept-Language
  // 缺失/不一致时会与 SSR locale 分叉，造成整树 hydration mismatch
  const htmlLang = document.documentElement.lang;
  if ((SUPPORTED_LOCALES as string[]).includes(htmlLang)) return htmlLang as Locale;

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
  const match = cookieStr.match(/gomate_locale=(zh-CN|en)/);
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
  };
  return names[locale];
}

/**
 * SSR 翻译辅助 - 直接基于已加载的数据查找，不依赖客户端缓存
 */
export function getSSRT(
  locale: Locale,
  loadedData?: Record<string, Record<string, unknown>>,
) {
  return {
    t: (key: string, vars?: Record<string, string | number>) => {
      // 如果有已加载的 SSR 数据，直接从里面查找
      if (loadedData && loadedData[locale]) {
        const localeData = loadedData[locale];
        // key 格式: "namespace.subKey.leafKey"
        // 尝试所有可能的 namespace 边界
        const parts = key.split(".");
        for (let i = 1; i < parts.length; i++) {
          const ns = parts.slice(0, i).join(".");
          const path = parts.slice(i).join(".");
          const nsData = localeData[ns];
          if (nsData && typeof nsData === "object") {
            const value = getNestedValue(nsData as Record<string, unknown>, path);
            if (value !== undefined) {
              return interpolate(value, vars);
            }
          }
        }
      }
      // fallback 到通用 t()（会使用缓存）
      return t(key, { locale, vars });
    },
  };
}

// ─── 导出 ─────────────────────────────────────────────────────────────────────

export type { TranslationKey, NamespacedKeys } from "./types";
export { DEFAULT_LOCALE, SUPPORTED_LOCALES, FALLBACK_MAP };
