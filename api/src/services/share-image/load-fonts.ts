import type { Env } from "../../lib/auth";
import { logger } from "../../lib/logger";

interface FontData {
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: string;
}

// 字体缓存
let fontCache: FontData[] | null = null;
let fontCacheTime = 0;
const FONT_CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 加载字体数据
 * 从 R2 加载字体文件，如果没有则从 CDN 加载备用字体
 */
export async function loadFonts(env: Env): Promise<FontData[]> {
  // 检查缓存
  if (fontCache && Date.now() - fontCacheTime < FONT_CACHE_TTL) {
    return fontCache;
  }

  const fonts: FontData[] = [];

  try {
    // 1. 并行从 R2 加载所有字体（优化：串行→并行）
    const fontPaths = [
      { path: "assets/fonts/zpix-400.woff2", name: "Zpix", weight: 400 },
      { path: "assets/fonts/noto-sans-400.woff2", name: "Noto Sans SC", weight: 400 },
      { path: "assets/fonts/noto-sans-700.woff2", name: "Noto Sans SC", weight: 700 },
    ];

    const fontPromises = fontPaths.map(async ({ path, name, weight }) => {
      try {
        const fontObject = await env.R2?.get(path);
        if (fontObject) {
          const fontData = await fontObject.arrayBuffer();
          return {
            name,
            data: fontData,
            weight,
            style: "normal" as const,
          };
        }
        return null;
      } catch (e) {
        logger.error(`[Fonts] Failed to load ${path}:`, e);
        return null;
      }
    });

    const loadedFonts = await Promise.all(fontPromises);
    loadedFonts.forEach((font) => {
      if (font) fonts.push(font);
    });

    // 2. 如果没有从 R2 加载到任何字体，从 CDN 加载备用字体
    if (fonts.length === 0) {
      try {
        // 加载 Google Fonts Noto Sans SC 作为 fallback (TTF 格式)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5秒超时

        const fallbackResponse = await fetch(
          "https://fonts.gstatic.com/s/notosanssc/v40/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYw.ttf",
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (fallbackResponse.ok) {
          const fontData = await fallbackResponse.arrayBuffer();
          fonts.push({
            name: "Noto Sans SC",
            data: fontData,
            weight: 400,
            style: "normal",
          });
        }
      } catch (e) {
        logger.error("[Fonts] Failed to load fallback font:", e);
      }
    }

    // 3. 如果仍然没有字体，抛出错误
    if (fonts.length === 0) {
      throw new Error("No fonts available");
    }

    // 更新缓存
    fontCache = fonts;
    fontCacheTime = Date.now();

    return fonts;
  } catch (error) {
    logger.error("[Fonts] Failed to load fonts:", error);
    throw error;
  }
}

/**
 * 清除字体缓存
 * 用于字体更新后强制重新加载
 */
export function clearFontCache(): void {
  fontCache = null;
  fontCacheTime = 0;
}
