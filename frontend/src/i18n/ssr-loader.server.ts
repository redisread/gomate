/**
 * SSR i18n 数据加载器
 *
 * 在 Astro SSR 渲染时，通过 import.meta.glob 读取翻译 JSON 文件，
 * 内联到页面的 <script id="__i18n_data__"> 中。
 * 客户端 hydration 时优先读取此数据，避免首屏翻译闪烁。
 *
 * Cloudflare Workers 兼容：使用 import.meta.glob 替代 node:fs
 */

import type { Locale } from "./index";

// 使用 import.meta.glob 静态导入所有翻译文件（Cloudflare Workers 兼容）
const translationModules = import.meta.glob("/public/locales/**/*.json", {
  eager: true,
  import: "default",
});

/**
 * 服务端加载翻译数据（使用静态导入，Cloudflare Workers 兼容）
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

  for (const ns of nsList) {
    try {
      // 从 glob 结果中查找对应的翻译文件
      const path = `/public/locales/${locale}/${ns}.json`;
      const module = translationModules[path];
      if (module) {
        results[ns] = module as Record<string, unknown>;
      }
    } catch (err) {
      // SSR 读取失败，客户端会 fallback 到 fetch
      console.error(`[SSR] Failed to load locale ${locale}/${ns}:`, err);
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
