import type { Env } from "../../lib/auth";

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
 * 从 R2 加载字体文件，并在 Worker 全局变量中缓存
 */
export async function loadFonts(env: Env): Promise<FontData[]> {
  // 检查缓存
  if (fontCache && Date.now() - fontCacheTime < FONT_CACHE_TTL) {
    console.log("[Fonts] Using cached fonts");
    return fontCache;
  }

  console.log("[Fonts] Loading fonts from R2");

  const fonts: FontData[] = [];

  try {
    // 1. 加载系统字体作为 fallback
    // 由于无法直接加载系统字体，我们使用一个默认配置
    // 实际字体从 R2 加载

    // 2. 尝试从 R2 加载自定义字体
    // 支持的字体路径：
    // - assets/fonts/zpix-400.woff2 (Zpix 像素字体 Regular)
    // - assets/fonts/zpix-700.woff2 (Zpix 像素字体 Bold)

    const fontPaths = [
      { path: "assets/fonts/zpix-400.woff2", name: "Zpix", weight: 400 },
      { path: "assets/fonts/noto-sans-400.woff2", name: "Noto Sans SC", weight: 400 },
      { path: "assets/fonts/noto-sans-700.woff2", name: "Noto Sans SC", weight: 700 },
    ];

    for (const { path, name, weight } of fontPaths) {
      try {
        const fontObject = await env.R2?.get(path);
        if (fontObject) {
          const fontData = await fontObject.arrayBuffer();
          fonts.push({
            name,
            data: fontData,
            weight,
            style: "normal",
          });
          console.log(`[Fonts] Loaded ${path} (${fontData.byteLength} bytes)`);
        } else {
          console.log(`[Fonts] Font not found in R2: ${path}`);
        }
      } catch (e) {
        console.error(`[Fonts] Failed to load ${path}:`, e);
      }
    }

    // 3. 如果没有从 R2 加载到任何字体，使用系统默认配置
    // Satori 会使用系统字体作为 fallback
    if (fonts.length === 0) {
      console.log("[Fonts] No custom fonts loaded, using system defaults");
    }

    // 更新缓存
    fontCache = fonts;
    fontCacheTime = Date.now();

    return fonts;
  } catch (error) {
    console.error("[Fonts] Failed to load fonts:", error);
    // 返回空数组，Satori 会使用系统默认字体
    return [];
  }
}

/**
 * 清除字体缓存
 * 用于字体更新后强制重新加载
 */
export function clearFontCache(): void {
  fontCache = null;
  fontCacheTime = 0;
  console.log("[Fonts] Cache cleared");
}
