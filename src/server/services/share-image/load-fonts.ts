import type { Env } from "../../lib/auth";
import { logger } from "../../lib/logger";

interface FontData {
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: string;
}

const FONT_SIGNATURES = {
  opentype: [0x4f, 0x54, 0x54, 0x4f],
  truetype: [0x00, 0x01, 0x00, 0x00],
  woff: [0x77, 0x4f, 0x46, 0x46],
} as const;

export function isSupportedSatoriFontData(data: ArrayBuffer): boolean {
  const signature = new Uint8Array(data, 0, Math.min(data.byteLength, 4));
  if (signature.byteLength < 4) return false;

  return Object.values(FONT_SIGNATURES).some((expected) =>
    expected.every((byte, index) => signature[index] === byte),
  );
}

// 字体缓存
let fontCache: FontData[] | null = null;
let fontCacheTime = 0;
const FONT_CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
const BUNDLED_FONT_PATH =
  "/fonts/noto-sans-sc-chinese-simplified-400-normal.woff";

type FontAssetPath =
  | "assets/fonts/zpix-400.woff"
  | "assets/fonts/noto-sans-400.woff"
  | "assets/fonts/noto-sans-700.woff";

function logFontAssetLoadFailure(path: FontAssetPath, error: unknown): void {
  switch (path) {
    case "assets/fonts/zpix-400.woff":
      logger.error("share_image_font_zpix_400_r2_load_failed", error);
      break;
    case "assets/fonts/noto-sans-400.woff":
      logger.error("share_image_font_noto_sans_400_r2_load_failed", error);
      break;
    case "assets/fonts/noto-sans-700.woff":
      logger.error("share_image_font_noto_sans_700_r2_load_failed", error);
      break;
  }
}

async function loadBundledFallbackFont(env: Env): Promise<FontData | null> {
  try {
    const assets = env.ASSETS;
    if (!assets) return null;

    const response = await assets.fetch(
      new Request(new URL(BUNDLED_FONT_PATH, env.APP_URL)),
    );
    if (!response.ok) return null;

    const data = await response.arrayBuffer();
    if (!isSupportedSatoriFontData(data)) {
      logger.warn("share_image_bundled_font_unsupported_format");
      return null;
    }

    return {
      name: "Noto Sans SC",
      data,
      weight: 400,
      style: "normal",
    };
  } catch (error) {
    logger.error("share_image_bundled_font_load_failed", error);
    return null;
  }
}

/**
 * 加载字体数据
 * 从 R2 加载字体文件，如果没有则从 Worker 静态资源加载备用字体
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
      { path: "assets/fonts/zpix-400.woff", name: "Zpix", weight: 400 },
      {
        path: "assets/fonts/noto-sans-400.woff",
        name: "Noto Sans SC",
        weight: 400,
      },
      {
        path: "assets/fonts/noto-sans-700.woff",
        name: "Noto Sans SC",
        weight: 700,
      },
    ] as const;

    const fontPromises = fontPaths.map(async ({ path, name, weight }) => {
      try {
        const fontObject = await env.R2?.get(path);
        if (fontObject) {
          const fontData = await fontObject.arrayBuffer();
          if (!isSupportedSatoriFontData(fontData)) {
            logger.warn("share_image_font_unsupported_format");
            return null;
          }
          return {
            name,
            data: fontData,
            weight,
            style: "normal" as const,
          };
        }
        return null;
      } catch (e) {
        logFontAssetLoadFailure(path, e);
        return null;
      }
    });

    const loadedFonts = await Promise.all(fontPromises);
    loadedFonts.forEach((font) => {
      if (font) fonts.push(font);
    });

    // 2. 如果没有从 R2 加载到任何字体，从 Worker 静态资源加载备用字体。
    // 不依赖外部 CDN，避免海报接口因网络抖动或大字体下载失败。
    if (fonts.length === 0) {
      const bundledFont = await loadBundledFallbackFont(env);
      if (bundledFont) fonts.push(bundledFont);
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
    logger.error("share_image_fonts_load_failed", error);
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
