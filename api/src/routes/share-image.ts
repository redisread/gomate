import { Hono } from "hono";
import type { Env } from "../lib/auth";
import { generatePreviewImage } from "../services/share-image/generate-share-image";

const shareImageRoute = new Hono<{ Bindings: Env }>();

/**
 * Phase 1: 基础能力验证
 * GET /share-image/preview
 * 使用固定数据测试 Satori + resvg-wasm 图片生成
 */
shareImageRoute.get("/preview", async (c) => {
  try {
    const png = await generatePreviewImage(c.env);

    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[ShareImage] Preview generation failed:", error);
    return c.json(
      { error: "Failed to generate preview image", details: String(error) },
      500
    );
  }
});

export { shareImageRoute };
