import satori from "satori";
// @ts-ignore - resvg-wasm types
import * as resvgWasm from "@resvg/resvg-wasm";
import type { Env } from "../../lib/auth";
import { loadFonts } from "./load-fonts";
import { renderTestTemplate } from "../../templates/share-image/test-poster";

// WASM 模块缓存
let wasmInitialized = false;
let wasmModule: WebAssembly.Module | null = null;

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
