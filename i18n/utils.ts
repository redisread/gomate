import { cookies, headers } from "next/headers";
import { Locale, defaultLocale, locales } from "./config";

const COOKIE_NAME = "NEXT_LOCALE";

/**
 * 获取用户语言偏好
 * 优先级: Cookie > Accept-Language Header > 默认语言
 */
export async function getUserLocale(): Promise<Locale> {
  // 1. 检查 cookie
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(COOKIE_NAME)?.value as Locale | undefined;

  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. 检查 Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");

  if (acceptLanguage) {
    // 解析 Accept-Language，查找支持的语言
    const preferredLocales = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].trim().toLowerCase());

    for (const preferred of preferredLocales) {
      // 完全匹配
      if (locales.includes(preferred as Locale)) {
        return preferred as Locale;
      }
      // 前缀匹配 (如 "zh-CN" 匹配 "zh")
      const prefix = preferred.split("-")[0];
      if (locales.includes(prefix as Locale)) {
        return prefix as Locale;
      }
    }
  }

  // 3. 返回默认语言
  return defaultLocale;
}

/**
 * 设置用户语言偏好
 */
export async function setUserLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1年
    sameSite: "strict",
  });
}
