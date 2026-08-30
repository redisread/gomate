import QRCode from "qrcode";
import type { Env } from "../../lib/auth";
import { logger } from "../../lib/logger";
import { loadFonts } from "./load-fonts";

export const MAX_EMBEDDED_IMAGE_BYTES = 5 * 1024 * 1024;
const POSTER_CACHE_PATH = "/__poster-cache/";
const SATORI_SUPPORTED_IMAGE_TYPES = new Set([
  "image/apng",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
]);

export async function loadPosterFonts(env: Env) {
  return loadFonts(env);
}

export async function sha256(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    const svg = await QRCode.toString(text, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 2,
      color: { dark: "#1e1812", light: "#ffffff" },
    });
    return `data:image/svg+xml;base64,${stringToBase64(svg)}`;
  } catch (error) {
    logger.error("share_image_qr_generate_failed", error);
    return `data:image/svg+xml;base64,${stringToBase64(FALLBACK_QR_SVG)}`;
  }
}

function stringToBase64(value: string): string {
  return bufferToBase64(new TextEncoder().encode(value));
}

function bufferToBase64(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + 8192, bytes.length))
    );
  }
  return btoa(binary);
}

const FALLBACK_QR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25">
  <rect width="25" height="25" fill="#fff"/>
  <rect x="2" y="2" width="7" height="7" fill="#1e1812"/>
  <rect x="3" y="3" width="5" height="5" fill="#fff"/>
  <rect x="4" y="4" width="3" height="3" fill="#1e1812"/>
  <rect x="16" y="2" width="7" height="7" fill="#1e1812"/>
  <rect x="17" y="3" width="5" height="5" fill="#fff"/>
  <rect x="18" y="4" width="3" height="3" fill="#1e1812"/>
  <rect x="2" y="16" width="7" height="7" fill="#1e1812"/>
  <rect x="3" y="17" width="5" height="5" fill="#fff"/>
  <rect x="4" y="18" width="3" height="3" fill="#1e1812"/>
</svg>`;

export async function cachedPosterRender({
  env,
  cacheKey,
  render,
}: {
  env: Env;
  cacheKey: string;
  render: () => Promise<string>;
}): Promise<{ svg: string; cacheKey: string; cached: boolean }> {
  const cache = (
    globalThis.caches as CacheStorage & { default?: Cache } | undefined
  )?.default;
  const cacheRequest = cache
    ? new Request(
        `${env.APP_URL.replace(/\/$/u, "")}${POSTER_CACHE_PATH}${encodeURIComponent(cacheKey)}`,
      )
    : null;

  if (cache && cacheRequest) {
    const hit = await cache.match(cacheRequest).catch(() => undefined);
    if (hit) {
      const svg = await hit.text();
      if (svg) return { svg, cacheKey, cached: true };
    }
  }

  const svg = await render();

  if (cache && cacheRequest) {
    await cache
      .put(
        cacheRequest,
        new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        }),
      )
      .catch(() => undefined);
  }

  return { svg, cacheKey, cached: false };
}

function isAllowedImageUrl(url: URL, env: Env): boolean {
  if (url.protocol !== "https:") return false;
  const configuredHost = (() => {
    try {
      return new URL(env.R2_PUBLIC_URL).hostname;
    } catch {
      return "";
    }
  })();
  const hostname = url.hostname.toLowerCase();
  return (
    hostname === configuredHost ||
    hostname === "gomate.cos.jiahongw.com" ||
    hostname === "cdn.discordapp.com" ||
    hostname.endsWith(".githubusercontent.com") ||
    hostname.endsWith(".googleusercontent.com")
  );
}

async function readImageBodyWithLimit(response: Response): Promise<Uint8Array | null> {
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      totalBytes += chunk.byteLength;
      if (totalBytes > MAX_EMBEDDED_IMAGE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(chunk);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) return null;
  const buffer = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
}

async function convertPosterImage(
  buffer: Uint8Array,
  env: Env,
): Promise<string | null> {
  const copiedBuffer = new Uint8Array(buffer.byteLength);
  copiedBuffer.set(buffer);
  const body = new Response(copiedBuffer.buffer).body;
  if (!body || !env.IMAGES) return null;

  try {
    const transformed = await env.IMAGES
      .input(body)
      .output({ format: "image/jpeg", quality: 85 });
    return readImageResponse(transformed.response(), env, false);
  } catch (error) {
    logger.warn("poster_image_format_conversion_failed", error);
    return null;
  }
}

async function readImageResponse(
  response: Response,
  env: Env,
  allowConversion = true,
): Promise<string | null> {
  if (!response.ok || response.status >= 300) return null;
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (!contentType?.startsWith("image/")) return null;
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_EMBEDDED_IMAGE_BYTES) return null;
  const buffer = await readImageBodyWithLimit(response);
  if (!buffer) return null;
  if (!SATORI_SUPPORTED_IMAGE_TYPES.has(contentType)) {
    return allowConversion ? convertPosterImage(buffer, env) : null;
  }
  return `data:${contentType};base64,${bufferToBase64(buffer)}`;
}

export async function loadImageAsBase64(
  imageUrl: string,
  env: Env,
  timeoutMs = 5000
): Promise<string | null> {
  let value: string | null = null;
  if (imageUrl.startsWith("assets/") || imageUrl.startsWith("images/")) {
    const object = await env.R2.get(imageUrl).catch((error) => {
      logger.warn("poster_image_r2_read_failed", error);
      return null;
    });
    if (object) {
      value = await readImageResponse(
        new Response(object.body, {
          headers: {
            "content-type": object.httpMetadata?.contentType || "application/octet-stream",
          },
        }),
        env,
      );
    }
  } else {
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      return null;
    }
    if (!isAllowedImageUrl(url, env)) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "manual",
      });
      value = await readImageResponse(response, env);
    } catch (error) {
      logger.warn("poster_image_https_fetch_failed", error);
    } finally {
      clearTimeout(timer);
    }
  }

  return value;
}
