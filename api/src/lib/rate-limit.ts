/**
 * KV-based rate limiter for Cloudflare Workers.
 *
 * Usage:
 *   const result = await checkRateLimit(kv, "rate:auth:login:<ip>", 20, 60);
 *   if (!result.allowed) return c.json(APIErrors.tooManyRequests("Too many requests"), 429);
 *
 * NOTE: Cloudflare KV has no atomic increment, so concurrent requests within
 * the same window may both read the same count and both be allowed — the
 * effective limit can briefly exceed `maxRequests` under burst traffic. This
 * is acceptable for auth rate limiting (soft barrier, IP-keyed, short window).
 * For stricter limits, consider a Durable Object with single-threaded state.
 *
 * NOTE: Cloudflare KV enforces a minimum TTL of 60 seconds. When the remaining
 * window is shorter than 60s we clamp to 60. The timestamp in the entry still
 * tracks the real window boundary, so rate-limit decisions stay correct.
 */

import { Context, Next } from "hono";
import type { Env } from "./auth";
import { resolveAuditActor } from "./audit";

/** Cloudflare KV minimum TTL (seconds). */
const KV_MIN_TTL = 60;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets (0 if under limit)
}

interface RateLimitEntry {
  count: number;
  ts: number;
}

export async function checkRateLimit(
  kv: KVNamespace | undefined,
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (!kv) {
    return { allowed: true, remaining: maxRequests, retryAfter: 0 };
  }

  const now = Math.floor(Date.now() / 1000);
  const raw = await kv.get(key);

  let entry: RateLimitEntry | null = null;
  if (raw) {
    try {
      entry = JSON.parse(raw as string) as RateLimitEntry;
      if (entry.ts + windowSeconds <= now) {
        entry = null;
      }
    } catch {
      entry = null;
    }
  }

  const safeTtl = (seconds: number) => Math.max(KV_MIN_TTL, seconds);

  if (!entry) {
    const newEntry: RateLimitEntry = { count: 1, ts: now };
    await kv.put(key, JSON.stringify(newEntry), { expirationTtl: safeTtl(windowSeconds) });
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 };
  }

  const remaining = maxRequests - entry.count;
  const retryAfter = entry.ts + windowSeconds - now;

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) };
  }

  entry.count += 1;
  await kv.put(key, JSON.stringify(entry), { expirationTtl: safeTtl(retryAfter) });
  return { allowed: true, remaining: remaining - 1, retryAfter: 0 };
}

/** Extract client IP from request, preferring CF header. */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// ---------- Per-key API rate limiting (#220) ----------

/**
 * Build a rate limit key for API endpoints.
 * key = "rl:{actorType}:{actorId}:{scope}"
 */
export function buildApiRateLimitKey(
  scope: "read" | "write",
  actorId: string,
  actorType: "apiKey" | "user",
): string {
  return `rl:${actorType}:${actorId}:${scope}`;
}

/**
 * Check rate limit for a v1 API request.
 */
export async function checkApiRateLimit(
  kv: KVNamespace | undefined,
  scope: "read" | "write",
  actorId: string,
  actorType: "apiKey" | "user",
  limit: number,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const key = buildApiRateLimitKey(scope, actorId, actorType);
  return checkRateLimit(kv, key, limit, windowSeconds);
}

/**
 * Hono middleware: enforce API rate limit for a given scope.
 * Must run after auth (session resolved).
 *
 * Usage:
 *   writeTeams.post("/", apiRateLimitMiddleware("write", 30), idempotencyMiddleware, async (c) => {...})
 */
export function apiRateLimitMiddleware(scope: "read" | "write", limit: number) {
  return async (c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> => {
    const audit = await resolveAuditActor(c);

    if (!audit.userId) {
      // Unauthenticated — no rate limit
      await next();
      return;
    }

    const actorId = audit.apiKeyId ?? audit.userId;
    const actorType: "apiKey" | "user" = audit.apiKeyId ? "apiKey" : "user";

    const result = await checkApiRateLimit(c.env.GOMATE_KV, scope, actorId, actorType, limit);

    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.retryAfter),
    };

    if (!result.allowed) {
      headers["Retry-After"] = String(result.retryAfter);
      return c.json(
        { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests", retryAfter: result.retryAfter },
        429,
        headers,
      );
    }

    await next();
    if (c.res) {
      for (const [k, v] of Object.entries(headers)) {
        c.res.headers.set(k, v);
      }
    }
  };
}
