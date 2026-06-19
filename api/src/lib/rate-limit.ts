/**
 * KV-based rate limiter for Cloudflare Workers.
 *
 * Usage:
 *   const result = await checkRateLimit(kv, "rate:auth:login:<ip>", 20, 60);
 *   if (!result.allowed) return c.json({ error: "Too many requests" }, 429);
 *
 * NOTE: Cloudflare KV has no atomic increment, so concurrent requests within
 * the same window may both read the same count and both be allowed — the
 * effective limit can briefly exceed `maxRequests` under burst traffic. This
 * is acceptable for auth rate limiting (soft barrier, IP-keyed, short window).
 * For stricter limits, consider a Durable Object with single-threaded state.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets (0 if under limit)
}

/**
 * Internal value stored in KV.
 * `ts` is the window start timestamp (seconds since epoch) — lets us compute
 * retryAfter without depending on KV TTL metadata.
 */
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
    // KV not available (e.g. local dev without binding) — allow all
    return { allowed: true, remaining: maxRequests, retryAfter: 0 };
  }

  const now = Math.floor(Date.now() / 1000);
  const raw = await kv.get(key);

  let entry: RateLimitEntry | null = null;
  if (raw) {
    try {
      entry = JSON.parse(raw as string) as RateLimitEntry;
      // If the window has expired, reset
      if (entry.ts + windowSeconds <= now) {
        entry = null;
      }
    } catch {
      entry = null;
    }
  }

  if (!entry) {
    // New window
    const newEntry: RateLimitEntry = { count: 1, ts: now };
    await kv.put(key, JSON.stringify(newEntry), { expirationTtl: windowSeconds });
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 };
  }

  const remaining = maxRequests - entry.count;
  const retryAfter = entry.ts + windowSeconds - now;

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) };
  }

  // Increment counter within existing window
  entry.count += 1;
  await kv.put(key, JSON.stringify(entry), { expirationTtl: Math.max(1, retryAfter) });
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
