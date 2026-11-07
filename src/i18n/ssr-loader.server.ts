/**
 * SSR i18n 数据加载器
 *
 * 使用构建时预读的翻译数据，Cloudflare Workers 兼容
 */

import type { Locale } from "./index";
import { localesData } from "./locales-data";
import { resolveLocale } from "../contracts/locale";
import type { I18nSnapshot } from "./context";

export function getPageI18n(locals: App.Locals, includeContent = false): I18nSnapshot {
  const locale = resolveLocale(locals.locale);
  // `content` contains long legal copy and SEO strings; interactive pages do not
  // need a second serialized copy of it in their island props.
  const names = new Set([...(locals.__i18n_namespaces ?? []), "nav", "common", "admin"]);
  if (!includeContent) names.delete("content");
  const namespaces = Object.fromEntries([...names].flatMap((name) => {
    const data = localesData[locale]?.[name];
    return data ? [[name, data]] : [];
  }));
  return { locale, namespaces };
}

/**
 * 服务端加载翻译数据（使用构建时预读的数据）
 *
 * @param nsList - 需要加载的 namespace 列表
 * @param locale - 当前语言
 * @param _baseUrl - 站点的基础 URL（保留参数兼容）
 */
export async function loadLocaleData(
  nsList: string[],
  locale: Locale,
  _baseUrl: string,
): Promise<Record<string, Record<string, unknown>>> {
  const results: Record<string, Record<string, unknown>> = {};
  const localeData = localesData[locale] || {};

  for (const ns of nsList) {
    if (localeData[ns]) {
      results[ns] = localeData[ns];
    }
  }

  return results;
}
