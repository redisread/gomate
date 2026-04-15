/**
 * React hook for i18n in Islands components
 *
 * - Accepts optional namespace list for auto-loading
 * - Reads locale from cookie on client side
 * - Provides t() function with loaded translations
 */

import * as React from "react";
import {
  t as translate,
  getLocale,
  loadNamespaces,
  getNamespaceData,
  type Locale,
} from "@/i18n";

interface UseI18nReturn {
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: Locale;
  loading: boolean;
  getNsData: () => Record<string, unknown> | null;
}

/**
 * Hook for Islands components to access i18n
 *
 * @param nsList - Optional list of namespaces to auto-load
 * @returns { t, locale, loading }
 *
 * @example
 * const { t } = useI18n(['common', 'teams']);
 * <button>{t('teams.joinTeam')}</button>
 */
export function useI18n(nsList?: string[]): UseI18nReturn {
  const [locale, setLocale] = React.useState<Locale>(getLocale());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!nsList || nsList.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadNamespaces(nsList, locale)
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[i18n] Failed to load namespaces:", err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [nsList, locale]);

  // Re-read locale on visibility change
  React.useEffect(() => {
    const handler = () => setLocale(getLocale());
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const tFn = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      return translate(key, { locale, vars });
    },
    [locale],
  );

  const getNsData = React.useCallback(() => {
    if (!nsList || nsList.length === 0) return null;
    const results: Record<string, unknown> = {};
    for (const ns of nsList) {
      const data = getNamespaceData(ns, locale);
      if (data) results[ns] = data;
    }
    return Object.keys(results).length > 0 ? results : null;
  }, [locale, nsList]);

  return { t: tFn, getNsData, locale, loading };
}
