/**
 * In-memory rate limiter for Cloudflare Workers.
 *
 * Usage:
 *   const result = await checkRateLimit("rate:auth:login:<ip>", 20, 60);
 *   if (!result.allowed) return c.json(APIErrors.tooManyRequests("Too many requests"), 429);
 *
 * 2026-08-01 P0 修复：原实现每次请求 kv.put 写 Cloudflare KV 计数。Workers Free
 * 账号 KV 每日写入限额（1000 次/天，账号级共享）被 e2e rate-limit 契约测试打爆后，
 * 连带 better-auth session 写入 KV 失败（try/catch 吞错），导致 staging + production
 * 认证全部 401（get-session 读不到 session）。本实现改为进程内 Map 计数：
 *
 * - 不写 KV：不再消耗每日写入额度，session 等关键 KV 写入不再被连带拖垮
 * - 单 isolate 下计数精确；smart placement 多 isolate 下计数分散（限制放宽）。
 *   原 KV 方案也无原子递增（并发 burst 下同样超限），属可接受的软屏障
 * - Worker 重启（部署）后计数清零，限制重置
 */

import { Context, Next } from "hono";
import type { Env } from "./auth";
import { resolveAuditActor } from "./audit";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets (0 if under limit)
}

interface RateLimitEntry {
  count: number;
  ts: number;
  windowSeconds: number;
}

/** 进程内计数表；过期条目惰性清理（下次访问同 key 时删除）。
 * 上限 RATE_STORE_MAX_ENTRIES 防内存膨胀（攻击者用海量不同 key 撑爆 isolate 内存的 DoS 面）。 */
const RATE_STORE_MAX_ENTRIES = 10_000;
let lastRateStorePrune = 0;
const rateStore = new Map<string, RateLimitEntry>();

/** Map 超过上限时清理已过期条目（每分钟至多一次）；均为活跃条目时让出（防御性降级放行） */
function pruneRateStore(now: number) {
  if (rateStore.size < RATE_STORE_MAX_ENTRIES || now - lastRateStorePrune < 60) return;
  lastRateStorePrune = now;
  for (const [k, v] of rateStore) {
    if (v.ts + v.windowSeconds <= now) rateStore.delete(k);
  }
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  pruneRateStore(now);
  const existing = rateStore.get(key);

  let entry: RateLimitEntry | null = null;
  if (existing) {
    if (existing.ts + windowSeconds <= now) {
      rateStore.delete(key);
    } else {
      entry = existing;
    }
  }

  if (!entry) {
    rateStore.set(key, { count: 1, ts: now, windowSeconds });
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 };
  }

  const remaining = maxRequests - entry.count;
  const retryAfter = entry.ts + windowSeconds - now;

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) };
  }

  entry.count += 1;
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
  scope: "read" | "write",
  actorId: string,
  actorType: "apiKey" | "user",
  limit: number,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const key = buildApiRateLimitKey(scope, actorId, actorType);
  return checkRateLimit(key, limit, windowSeconds);
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

    const result = await checkApiRateLimit(scope, actorId, actorType, limit);

    // 头必须在 await next() 之前 set（Hono 在 next 之后 flush response，post-next set 无效）
    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(result.retryAfter));

    if (!result.allowed) {
      c.header("Retry-After", String(result.retryAfter));
      return c.json(
        { success: false, error: "RATE_LIMIT_EXCEEDED", message: "Too many requests", retryAfter: result.retryAfter },
        429,
      );
    }

    await next();
  };
}
