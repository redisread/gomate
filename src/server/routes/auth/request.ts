import type { Context } from "hono";
import type { Env } from "../../lib/auth";
import { z } from "../../lib/openapi";
import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";

const AUTH_RATE_LIMIT_WINDOW_SECONDS = 60;

const MAX_AUTH_JSON_BYTES = 16 * 1024;

export type AuthContext = Context<{ Bindings: Env }>;

export function getExecutionContext(
  c: AuthContext,
): { waitUntil(promise: Promise<unknown>): void } | undefined {
  try {
    return c.executionCtx;
  } catch {
    return undefined;
  }
}

export async function readBoundedJson<T>(
  c: AuthContext,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: Response }> {
  const contentType = c.req
    .header("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return {
      response: c.json(
        APIErrors.badRequest(
          "Authentication requests require application/json",
        ),
        415,
      ),
    };
  }

  const contentLength = c.req.header("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (!Number.isSafeInteger(declared) || declared < 0) {
      return {
        response: c.json(APIErrors.badRequest("Invalid Content-Length"), 400),
      };
    }
    if (declared > MAX_AUTH_JSON_BYTES) {
      return {
        response: c.json(
          APIErrors.badRequest("Authentication payload is too large"),
          413,
        ),
      };
    }
  }

  const reader = c.req.raw.body?.getReader();
  if (!reader) {
    return {
      response: c.json(
        APIErrors.validationError("Invalid authentication payload"),
        400,
      ),
    };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_AUTH_JSON_BYTES) {
      return {
        response: c.json(
          APIErrors.badRequest("Authentication payload is too large"),
          413,
        ),
      };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes),
    );
  } catch {
    return {
      response: c.json(
        APIErrors.validationError("Invalid authentication payload"),
        400,
      ),
    };
  }
  const parsed = await schema["~standard"].validate(raw);
  if (parsed.issues) {
    return {
      response: c.json(
        APIErrors.validationError("Invalid authentication payload"),
        400,
      ),
    };
  }
  return { data: parsed.value };
}

async function privateRateLimitKey(scope: string, kind: string, value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${scope}\n${kind}\n${value}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function enforceNativeRateLimit(
  c: AuthContext,
  limiter: RateLimit,
  scope: string,
  email?: string,
): Promise<Response | null> {
  const clientIp = (c.req.header("CF-Connecting-IP") || "unknown")
    .trim()
    .slice(0, 64);
  try {
    const keys = await Promise.all([
      privateRateLimitKey(scope, "ip", clientIp),
      ...(email ? [privateRateLimitKey(scope, "email", email)] : []),
    ]);
    const decisions = await Promise.all(
      keys.map((key) => limiter.limit({ key })),
    );
    if (decisions.every(({ success }) => success)) return null;
  } catch (error) {
    logger.error("auth_rate_limiter_failed", {
      errorType: error instanceof Error ? error.name : "UnknownRateLimitError",
    });
    return c.json(
      APIErrors.serviceUnavailable("Authentication protection unavailable"),
      503,
    );
  }

  c.header("Retry-After", String(AUTH_RATE_LIMIT_WINDOW_SECONDS));
  return c.json(APIErrors.rateLimited("请求过于频繁，请稍后重试"), 429);
}

export function normalizeBetterAuthUrl(input: string): string {
  const url = new URL(input);
  const authMarker = url.pathname.match(/\/auth(?=\/|$)/u);
  const endpointPath =
    authMarker?.index === undefined
      ? url.pathname
      : url.pathname.slice(authMarker.index + authMarker[0].length);
  url.pathname = `/api/auth${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;
  return url.toString();
}

export function normalizedJsonRequest(c: AuthContext, data: unknown): Request {
  const headers = new Headers(c.req.raw.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  return new Request(normalizeBetterAuthUrl(c.req.raw.url), {
    method: c.req.raw.method,
    headers,
    body: JSON.stringify(data),
    signal: c.req.raw.signal,
  });
}

export function noStoreResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function noStoreJsonResponse(
  response: Response,
  payload: unknown,
): Response {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return new Response(JSON.stringify(payload), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
