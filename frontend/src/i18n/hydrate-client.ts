/**
 * 客户端 i18n 初始化
 *
 * 在 Astro Islands 加载前执行，从 SSR 内联数据注入缓存。
 */

import { hydrateSSRData } from "@/i18n";

if (typeof window !== "undefined") {
  // 读取 SSR 注入的翻译数据并注入缓存
  const data = (window as unknown as Record<string, unknown>).__I18N_DATA__;
  if (data) {
    hydrateSSRData(data as Record<string, Record<string, Record<string, unknown>>>);
  }
}
