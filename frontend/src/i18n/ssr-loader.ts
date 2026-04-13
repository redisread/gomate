/**
 * SSR i18n 数据加载器
 *
 * 在 Astro SSR 渲染时，通过 fetch 读取 public/locales/ 下的翻译 JSON 文件，
 * 内联到页面的 <script id="__i18n_data__"> 中。
 * 客户端 hydration 时优先读取此数据，避免首屏翻译闪烁。
 */

import type { Locale } from "./index";

/**
 * 服务端加载翻译数据（并行 fetch 所有 namespace）
 *
 * @param nsList - 需要加载的 namespace 列表
 * @param locale - 当前语言
 * @param baseUrl - 站点的基础 URL（如 http://localhost:5432 或 https://gomate.live）
 */
export async function loadLocaleData(
  nsList: string[],
  locale: Locale,
  baseUrl: string,
): Promise<Record<string, Record<string, unknown>>> {
  const results: Record<string, Record<string, unknown>> = {};

  await Promise.all(
    nsList.map(async (ns) => {
      try {
        const url = `${baseUrl}/locales/${locale}/${ns}.json`;
        const res = await fetch(url);
        if (res.ok) {
          results[ns] = (await res.json()) as Record<string, unknown>;
        }
      } catch {
        // SSR fetch 失败，客户端会 fallback 到 fetch
      }
    }),
  );

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
