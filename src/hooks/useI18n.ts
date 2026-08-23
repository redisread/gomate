/**
 * React hook for i18n in Islands components
 *
 * - Accepts optional namespace list for auto-loading
 * - Reads locale from cookie on client side
 * - Provides t() function with loaded translations
 * - 保持 SSR 与客户端 hydration 的首帧一致
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
 * 同步检查所有 namespace 是否已在缓存中
 * 用于 hydration 后立即判断 loading 状态
 */
function areAllNsCached(nsList: string[] | undefined, locale: Locale): boolean {
  if (!nsList || nsList.length === 0) return true;
  return nsList.every((ns) => getNamespaceData(ns, locale) !== null);
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
  // SSR 与客户端首帧必须使用相同的 loading 状态；客户端在 effect 中复用 SSR 缓存。
  const [loading, setLoading] = React.useState(() => Boolean(nsList?.length));

  React.useEffect(() => {
    if (!nsList || nsList.length === 0) {
      setLoading(false);
      return;
    }

    // 如果数据已在缓存中，跳过加载
    if (areAllNsCached(nsList, locale)) {
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
      // loading 时返回空字符串而非 key，避免 SSR/CSR 不一致
      if (loading) return "";
      return translate(key, { locale, vars });
    },
    [locale, loading],
  );

  const getNsData = React.useCallback(() => {
    if (loading || !nsList || nsList.length === 0) return null;
    const results: Record<string, unknown> = {};
    for (const ns of nsList) {
      const data = getNamespaceData(ns, locale);
      if (data) results[ns] = data;
    }
    return Object.keys(results).length > 0 ? results : null;
  }, [loading, locale, nsList]);

  return { t: tFn, getNsData, locale, loading };
}
