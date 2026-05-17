/**
 * SSR i18n 数据加载器
 *
 * 在 Astro SSR 渲染时，通过文件系统读取 public/locales/ 下的翻译 JSON 文件，
 * 内联到页面的 <script id="__i18n_data__"> 中。
 * 客户端 hydration 时优先读取此数据，避免首屏翻译闪烁。
 */

import type { Locale } from "./index";

/**
 * 服务端加载翻译数据（直接读取文件系统，避免 fetch 失败）
 *
 * @param nsList - 需要加载的 namespace 列表
 * @param locale - 当前语言
 * @param _baseUrl - 站点的基础 URL（保留参数兼容，实际使用文件系统读取）
 */
export async function loadLocaleData(
  nsList: string[],
  locale: Locale,
  _baseUrl: string,
): Promise<Record<string, Record<string, unknown>>> {
  const results: Record<string, Record<string, unknown>> = {};

  // 仅在 SSR 环境执行文件系统读取
  if (import.meta.env.SSR) {
    const { readFileSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");

    const localesDir = join(process.cwd(), "public", "locales", locale);

    await Promise.all(
      nsList.map(async (ns) => {
        try {
          const filePath = join(localesDir, `${ns}.json`);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, "utf-8");
            results[ns] = JSON.parse(content) as Record<string, unknown>;
          }
        } catch (err) {
          // SSR 读取失败，客户端会 fallback 到 fetch
          console.error(`[SSR] Failed to load locale ${locale}/${ns}:`, err);
        }
      }),
    );
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
