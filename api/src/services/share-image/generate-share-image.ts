import satori from "satori";
// @ts-ignore - resvg-wasm types
import * as resvgWasm from "@resvg/resvg-wasm";
import type { Env } from "../../lib/auth";
import { loadFonts } from "./load-fonts";
import { renderTestTemplate } from "../../templates/share-image/test-poster";
import { renderLocationPoster } from "../../templates/share-image/location-poster";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { eq, and } from "drizzle-orm";

// WASM 模块缓存
let wasmInitialized = false;
let wasmModule: WebAssembly.Module | null = null;

/**
 * 生成 MD5 哈希（使用 Web Crypto API）
 */
async function generateMD5(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("MD5", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 初始化 resvg-wasm
 * 使用全局变量缓存，避免每次请求重新初始化
 */
async function initResvgWasm() {
  if (wasmInitialized) {
    return;
  }

  // 从 CDN 加载 WASM
  const wasmResponse = await fetch(
    "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"
  );
  const wasmBuffer = await wasmResponse.arrayBuffer();

  // 初始化 WASM
  // @ts-ignore
  if (resvgWasm.initWasm) {
    // @ts-ignore
    await resvgWasm.initWasm(wasmBuffer);
  }

  wasmInitialized = true;
}

/**
 * Phase 1: 生成预览图片（固定数据测试）
 */
export async function generatePreviewImage(env: Env): Promise<Uint8Array> {
  console.log("[ShareImage] Starting preview image generation");

  // 1. 初始化 WASM
  await initResvgWasm();
  console.log("[ShareImage] WASM initialized");

  // 2. 加载字体
  const fonts = await loadFonts(env);
  console.log("[ShareImage] Fonts loaded:", fonts.length);

  // 3. 渲染 SVG（使用固定测试数据）
  const svg = await renderTestTemplate({
    title: "GoMate 测试海报",
    subtitle: " Phase 1 基础能力验证",
    date: "2026-05-29",
    location: "测试地点",
    description: "这是一个测试海报，用于验证 Satori + resvg-wasm 的图片生成能力。",
    leaderName: "测试队长",
    membersInfo: "3/5",
    fonts,
  });
  console.log("[ShareImage] SVG rendered");

  // 4. SVG 转 PNG
  const png = await renderSvgToPng(svg);
  console.log("[ShareImage] PNG generated, size:", png.length);

  return png;
}

/**
 * SVG 转 PNG
 */
export async function renderSvgToPng(svg: string): Promise<Uint8Array> {
  // @ts-ignore
  const { Resvg } = resvgWasm;
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 750,
    },
    font: {
      defaultFontFamily: "system-ui",
    },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}

/**
 * Phase 2: 生成地点分享图片
 * 查询地点数据，生成分享海报
 */
export async function generateLocationImage(
  env: Env,
  locationId: string
): Promise<{ png: Uint8Array; cacheKey: string }> {
  console.log("[ShareImage] Generating location image for:", locationId);

  const db = createDb(env.DB);

  // 1. 查询地点数据
  const location = await db.query.locations.findFirst({
    where: eq(schema.locations.id, locationId),
  });

  if (!location) {
    throw new Error(`Location not found: ${locationId}`);
  }

  // 2. 查询地点标签
  const tagRelations = await db
    .select({ tagName: schema.tags.name })
    .from(schema.entityToTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.entityToTags.tagId))
    .where(
      and(
        eq(schema.entityToTags.entityId, locationId),
        eq(schema.entityToTags.entityType, "location")
      )
    );

  const tags = tagRelations.map((r) => r.tagName);

  // 3. 生成内容哈希（用于缓存）
  const contentData = {
    title: location.name,
    subtitle: location.subtitle,
    description: location.description,
    address: location.address,
    coverImage: location.coverImage,
    tags,
  };
  const contentHash = (await generateMD5(JSON.stringify(contentData))).slice(0, 12);

  const cacheKey = `share/location/${locationId}-${contentHash}.png`;

  // 4. 检查 R2 缓存
  if (env.R2) {
    try {
      const cached = await env.R2.get(cacheKey);
      if (cached) {
        console.log("[ShareImage] Cache hit:", cacheKey);
        const png = new Uint8Array(await cached.arrayBuffer());
        return { png, cacheKey };
      }
    } catch (e) {
      console.error("[ShareImage] Cache check failed:", e);
    }
  }

  // 5. 初始化 WASM
  await initResvgWasm();
  console.log("[ShareImage] WASM initialized");

  // 6. 加载字体
  const fonts = await loadFonts(env);
  console.log("[ShareImage] Fonts loaded:", fonts.length);

  // 7. 加载封面图并转为 base64
  let coverImageBase64: string | null = null;
  if (location.coverImage) {
    try {
      coverImageBase64 = await loadImageAsBase64(location.coverImage, env);
      console.log("[ShareImage] Cover image loaded");
    } catch (e) {
      console.error("[ShareImage] Failed to load cover image:", e);
    }
  }

  // 8. 生成二维码
  const locationUrl = `https://gomate.live/locations/${location.slug}`;
  const qrCodeDataUrl = await generateQRCode(locationUrl);
  console.log("[ShareImage] QR code generated");

  // 9. 渲染 SVG
  const svg = await renderLocationPoster({
    title: location.name,
    subtitle: location.subtitle,
    description: location.description,
    address: location.address,
    coverImage: coverImageBase64,
    tags,
    qrCodeDataUrl,
    fonts,
  });
  console.log("[ShareImage] SVG rendered");

  // 10. SVG 转 PNG
  const png = await renderSvgToPng(svg);
  console.log("[ShareImage] PNG generated, size:", png.length);

  // 11. 保存到 R2 缓存
  if (env.R2) {
    try {
      await env.R2.put(cacheKey, png, {
        httpMetadata: {
          contentType: "image/png",
          cacheControl: "public, max-age=86400",
        },
      });
      console.log("[ShareImage] Cached to R2:", cacheKey);
    } catch (e) {
      console.error("[ShareImage] Cache save failed:", e);
    }
  }

  return { png, cacheKey };
}

/**
 * 加载图片并转为 base64 Data URL
 */
async function loadImageAsBase64(
  imageUrl: string,
  env: Env
): Promise<string | null> {
  try {
    // 处理 R2 路径
    let fetchUrl = imageUrl;
    if (imageUrl.startsWith("assets/") || imageUrl.startsWith("images/")) {
      // 从 R2 加载
      if (env.R2) {
        const object = await env.R2.get(imageUrl);
        if (object) {
          const buffer = await object.arrayBuffer();
          const contentType = object.httpMetadata?.contentType || "image/jpeg";
          return `data:${contentType};base64,${btoa(String.fromCharCode(...new Uint8Array(buffer)))}`;
        }
      }
      return null;
    }

    // 处理 CDN URL
    if (imageUrl.startsWith("http")) {
      const response = await fetch(imageUrl);
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";
      return `data:${contentType};base64,${btoa(String.fromCharCode(...new Uint8Array(buffer)))}`;
    }

    return null;
  } catch (e) {
    console.error("[ShareImage] Load image error:", e);
    return null;
  }
}

/**
 * 生成二维码
 * 使用纯 JS 实现（Cloudflare Workers 兼容）
 */
async function generateQRCode(text: string): Promise<string> {
  // 简化版：返回一个占位符 SVG 二维码
  // 实际生产可以使用 qrcode 库的纯 JS 版本
  // 这里使用一个 SVG 占位符表示二维码
  const qrSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25">
      <rect width="25" height="25" fill="white"/>
      <rect x="2" y="2" width="7" height="7" fill="#1e1812"/>
      <rect x="3" y="3" width="5" height="5" fill="white"/>
      <rect x="4" y="4" width="3" height="3" fill="#1e1812"/>
      <rect x="16" y="2" width="7" height="7" fill="#1e1812"/>
      <rect x="17" y="3" width="5" height="5" fill="white"/>
      <rect x="18" y="4" width="3" height="3" fill="#1e1812"/>
      <rect x="2" y="16" width="7" height="7" fill="#1e1812"/>
      <rect x="3" y="17" width="5" height="5" fill="white"/>
      <rect x="4" y="18" width="3" height="3" fill="#1e1812"/>
      <rect x="10" y="10" width="5" height="5" fill="#1e1812"/>
      <rect x="11" y="11" width="3" height="3" fill="white"/>
      <rect x="12" y="12" width="1" height="1" fill="#1e1812"/>
      <rect x="8" y="2" width="1" height="1" fill="#1e1812"/>
      <rect x="14" y="4" width="1" height="1" fill="#1e1812"/>
      <rect x="2" y="10" width="1" height="1" fill="#1e1812"/>
      <rect x="20" y="14" width="1" height="1" fill="#1e1812"/>
      <rect x="16" y="16" width="3" height="3" fill="#1e1812"/>
      <rect x="20" y="18" width="2" height="2" fill="#1e1812"/>
      <rect x="12" y="20" width="2" height="2" fill="#1e1812"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(qrSvg)}`;
}
