/**
 * Shared cache + render primitives for the unified poster pipeline.
 *
 * Replaces the Phase-1..Phase-5 split that had cache-get / cache-put / Satori /
 * resvg-wasm glue duplicated across three (formerly four) generator functions
 * in `generate-share-image.ts`.
 *
 * Skill: `zero-tech-debt` — Step 4 "Move shared rules to one place".
 */

import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { eq } from "drizzle-orm";
import * as resvgWasm from "@resvg/resvg-wasm";
// resvg.wasm is intentionally NOT statically imported — see initResvgWasm() comment.
import QRCode from "qrcode";
import type { Env } from "../../lib/auth";
import { logger } from "../../lib/logger";
import { loadFonts } from "./load-fonts";

let wasmInitialized = false;

/** Initialise @resvg/resvg-wasm once per worker.
 *
 * The wasm bytes are lazy-loaded (not a top-level import) so that
 * Vitest and similar environments can mock the module or import
 * the file without crashing on ESM .wasm support. In production
 * (Cloudflare Workers) the dynamic import resolves fine because
 * the worker bundler inlines the wasm bytes.
 */
export async function initResvgWasm(): Promise<void> {
  if (wasmInitialized) return;
  const mod = await import("./resvg.wasm");
  await resvgWasm.initWasm(mod.default);
  wasmInitialized = true;
}

/** Load woff2 fonts from R2 (or empty array when R2 is unset). */
export async function loadPosterFonts(env: Env) {
  return loadFonts(env);
}

/** MD5 over a UTF-8 string — used for cache-key derivation. Web Crypto has no MD5, so we use SubtleCrypto with the algorithm identified by `md5`. */
export async function md5(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("MD5", buffer);
  const bytes = new Uint8Array(hashBuffer);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/** Render an Satori SVG string to PNG bytes via resvg-wasm. */
export async function renderSvgToPng(svg: string): Promise<Uint8Array> {
  await initResvgWasm();
  const resvg = new resvgWasm.Resvg(svg);
  return resvg.render().asPng();
}

/**
 * Render a QR code as a data: URL string (PNG, base64). Used as a small image
 * embedded inside Satori templates.
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 200,
  });
}

/**
 * Cache-get / cache-put wrapper around an SVG-render pipeline.
 *
 * Semantics:
 * - On `refresh`, delete every R2 object under the same hash prefix and re-render.
 * - On cache hit, return the cached bytes.
 * - On cache miss, run `render()` (which must build PNG bytes; Satori happens inside).
 * - Cache-write is best-effort: a write failure doesn't fail the request.
 */
export async function cachedPosterRender({
  env,
  cacheKey,
  refresh,
  render,
}: {
  env: Env;
  cacheKey: string;
  refresh: boolean;
  render: () => Promise<Uint8Array>;
}): Promise<{ png: Uint8Array; cacheKey: string; cached: boolean }> {
  if (refresh && env.R2) {
    try {
      const prefix = cacheKey.replace(/-[\da-f]{12}\.png$/, "-");
      const list = await env.R2.list({ prefix });
      for (const object of list.objects) {
        await env.R2.delete(object.key);
      }
    } catch (e) {
      logger.error("[ShareImage] Cache clear failed:", e);
    }
  }

  if (env.R2) {
    try {
      const cached = await env.R2.get(cacheKey);
      if (cached) {
        const buf = new Uint8Array(await cached.arrayBuffer());
        return { png: buf, cacheKey, cached: true };
      }
    } catch (e) {
      logger.error("[ShareImage] Cache check failed:", e);
    }
  }

  const png = await render();

  if (env.R2) {
    try {
      await env.R2.put(cacheKey, png, {
        httpMetadata: { contentType: "image/png" },
      });
    } catch (e) {
      logger.error("[ShareImage] Cache put failed:", e);
    }
  }

  return { png, cacheKey, cached: false };
}

// ---------- Image → base64 (for Satori-embeddable cover/avatar images) ----------

/**
 * Convert an ArrayBuffer to a base64 string.
 * Chunked to avoid blowing the stack on large files.
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

/**
 * Load an image (by URL or R2 key) and return a base64 data: URL.
 *
 * Cache-backed by the `imageCaches` D1 table (24h TTL).
 * Used by the Satori template rendering to embed cover/avatar
 * images so resvg can rasterize them.
 */
export async function loadImageAsBase64(
  imageUrl: string,
  env: Env,
  timeoutMs = 5000,
): Promise<string | null> {
  try {
    const db = createDb(env.DB);
    const cached = await db
      .select({
        base64Data: schema.imageCaches.base64Data,
        expiresAt: schema.imageCaches.expiresAt,
      })
      .from(schema.imageCaches)
      .where(eq(schema.imageCaches.imageUrl, imageUrl))
      .limit(1);

    if (cached.length > 0 && cached[0].expiresAt.getTime() > Date.now()) {
      return cached[0].base64Data;
    }
  } catch {
    // no-op on cache miss errors (cache is best-effort)
  }

  let base64Result: string | null = null;
  let contentType = "image/jpeg";

  if (imageUrl.startsWith("assets/") || imageUrl.startsWith("images/")) {
    if (env.R2) {
      try {
        const object = await env.R2.get(imageUrl);
        if (object) {
          const buffer = await object.arrayBuffer();
          contentType = object.httpMetadata?.contentType || "image/jpeg";
          base64Result = `data:${contentType};base64,${bufferToBase64(buffer)}`;
        }
      } catch (e) {
        logger.error("[PosterImage] R2 load failed:", e);
      }
    }
  }

  // CDN URL branch (with timeout) — keep behaviour from original
  if (!base64Result && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
    try {
      const cdnBase = (env as unknown as { ASSETS_BASE_URL?: string }).ASSETS_BASE_URL ?? "https://gomate.cos.jiahongw.com";
      const fullUrl = imageUrl.startsWith("http") ? imageUrl : `${cdnBase}/${imageUrl.replace(/^\//, "")}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(fullUrl, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        contentType = res.headers.get("content-type") || "image/jpeg";
        base64Result = `data:${contentType};base64,${bufferToBase64(buffer)}`;
      }
    } catch (e) {
      logger.error("[PosterImage] CDN fetch failed:", e);
    }
  }

  if (base64Result) {
    try {
      const { generateId } = await import("../../lib/id");
      const db = createDb(env.DB);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db
        .insert(schema.imageCaches)
        .values({
          id: generateId(),
          imageUrl,
          base64Data: base64Result,
          contentType: contentType ?? "image/jpeg",
          expiresAt,
        })
        .onConflictDoUpdate({
          target: schema.imageCaches.imageUrl,
          set: { base64Data: base64Result, expiresAt },
        });
    } catch {
      // best-effort
    }
  }

  return base64Result;
}
