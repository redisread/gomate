/** Supported UI and email languages. Kept independent of translation data. */
export const SUPPORTED_LOCALES = ["zh-CN", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh-CN";

export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "en";
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function readLocaleCookie(cookie: string): Locale | undefined {
  const value = cookie.match(/(?:^|;\s*)gomate_locale=([^;]*)/)?.[1];
  return isLocale(value) ? value : undefined;
}

export function getLocaleFromCookie(cookie: string): Locale {
  return readLocaleCookie(cookie) ?? DEFAULT_LOCALE;
}

export function matchAcceptLanguage(header: string): Locale {
  const candidates = header
    .split(",")
    .map((part) => {
      const [language, quality] = part.trim().split(";");
      return {
        language: language.toLowerCase(),
        quality: quality ? Number(quality.trim().replace(/^q=/, "")) : 1,
      };
    })
    .filter(({ quality }) => quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality);
  for (const { language } of candidates) {
    if (language === "zh" || language.startsWith("zh-")) return "zh-CN";
    if (language === "en" || language.startsWith("en-")) return "en";
  }
  return DEFAULT_LOCALE;
}

export function getRequestLocale(headers: Headers): Locale {
  return (
    readLocaleCookie(headers.get("cookie") ?? "") ??
    matchAcceptLanguage(headers.get("accept-language") ?? "")
  );
}
