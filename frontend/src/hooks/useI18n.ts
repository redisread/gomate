/**
 * React hook for i18n in Islands components
 *
 * Reads locale from cookie on client side, provides t() function
 */

import * as React from "react";
import { t as translate, getLocale, type Locale, type TranslationKey } from "@/i18n";

interface UseI18nReturn {
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  locale: Locale;
}

/**
 * Hook for Islands components to access i18n
 * Reads locale from cookie on mount
 */
export function useI18n(): UseI18nReturn {
  const [locale, setLocale] = React.useState<Locale>(getLocale());

  React.useEffect(() => {
    // Re-read locale on visibility change (user may have changed it in another tab)
    const handler = () => setLocale(getLocale());
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const t = React.useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      return translate(key, { locale, vars });
    },
    [locale],
  );

  return { t, locale };
}
