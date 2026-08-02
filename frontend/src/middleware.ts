/**
 * i18n Middleware - 语言检测与 URL 重写
 *
 * 优先级：URL 前缀 > cookie `gomate_locale` > Accept-Language > 默认 zh-CN
 *
 * 工作原理：
 * - 对于带 locale 前缀的 URL（如 /en/locations），使用 Astro.rewrite() 重写
 * - 同时通过 cookie 设置 locale 供 React Islands 读取
 */

import type { MiddlewareHandler } from "astro";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@/i18n";

// Astro 6 changed locals type, use unknown for compatibility
interface AppLocals {
  locale?: Locale;
  __i18n_namespaces?: string[];
}

// ─── SSR i18n Helpers ──────────────────────────────────────────────────

/**
 * 在页面组件中声明当前页所需的 namespaces。
 *
 * @example
 * // 在 Astro 页面的 frontmatter 中调用
 * declareI18nNs(Astro.locals, ['common', 'teams']);
 */
export function declareI18nNs(locals: unknown, nsList: string[]): void {
  (locals as AppLocals).__i18n_namespaces = nsList;
}

/**
 * 获取当前页面声明的 namespaces。
 */
export function getI18nNs(locals: unknown): string[] | undefined {
  return (locals as AppLocals).__i18n_namespaces;
}

/**
 * 从 Accept-Language 头匹配支持的语言
 */
function matchAcceptLanguage(header: string): Locale {
  const langs = header.split(",").map((part) => {
    const [lang, q] = part.split(";");
    return {
      lang: lang.trim().toLowerCase(),
      q: q ? parseFloat(q.split("=")[1] || "1") : 1,
    };
  });

  langs.sort((a, b) => b.q - a.q);

  for (const { lang } of langs) {
    if (lang === "zh-cn" || lang === "zh") return "zh-CN";
    if (lang === "en") return "en";
    if (lang === "ja" || lang === "jp") return "ja";
    if (lang.startsWith("zh")) return "zh-CN";
    if (lang.startsWith("en")) return "en";
    if (lang.startsWith("ja")) return "ja";
  }

  return DEFAULT_LOCALE;
}

/**
 * 确定当前请求应使用的语言
 */
function detectLocale(request: Request): Locale {
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);

  // 1. URL 前缀优先
  const firstSegment = segments[0] as Locale | undefined;
  if (SUPPORTED_LOCALES.includes(firstSegment as Locale)) {
    return firstSegment as Locale;
  }

  // 2. Cookie 次之
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieMatch = cookieHeader.match(/gomate_locale=(zh-CN|en|ja)/);
  if (cookieMatch) {
    return cookieMatch[1] as Locale;
  }

  // 3. Accept-Language
  const acceptLang = request.headers.get("accept-language");
  if (acceptLang) {
    return matchAcceptLanguage(acceptLang);
  }

  return DEFAULT_LOCALE;
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const firstSegment = segments[0] as Locale | undefined;
  const hasLocalePrefix = SUPPORTED_LOCALES.includes(firstSegment as Locale);

  // 如果 URL 没有 locale 前缀，且检测到的语言不是默认语言
  if (!hasLocalePrefix) {
    const detectedLocale = detectLocale(context.request);
    const existingCookie = context.request.headers.get("cookie") || "";

    if (!existingCookie.includes("gomate_locale=") && detectedLocale !== DEFAULT_LOCALE) {
      // 首次访问，重定向到带前缀的 URL
      return context.redirect(`/${detectedLocale}${url.pathname}`, 302);
    }
  }

  // 如果 URL 带 locale 前缀，使用 rewrite 去掉前缀
  if (hasLocalePrefix) {
    const cleanPath = "/" + segments.slice(1).join("/") || "/";

    // 设置 locale 供后续 middleware 和 Layout.astro 读取
    (context.locals as AppLocals).locale = firstSegment as Locale;

    // 设置 locale cookie 供 React Islands 读取
    context.cookies.set("gomate_locale", firstSegment as string, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    // 重写 URL，让 Astro 路由匹配正确的页面
    return context.rewrite(cleanPath);
  }

  return next();
};
