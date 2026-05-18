/**
 * SSR i18n 数据加载器
 *
 * 使用构建时预读的翻译数据，Cloudflare Workers 兼容
 */

import type { Locale } from "./index";
import { localesData } from "./locales-data";

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

/**
 * 生成内联 <script> 标签，包含 SSR 翻译数据
 *
 * @param data - 已加载的 locale 数据
 */
export function renderSSRScript(data: Record<string, Record<string, Record<string, unknown>>>): string {
  const json = JSON.stringify(data);
  return `<script id="__i18n_data__" type="application/json">${json}</script>`;
}
