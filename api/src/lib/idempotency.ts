/**
 * P2-2 #218: Idempotency-Key 中间件（KV 回放契约）
 *
 * 为写端点提供幂等保证。客户端在 POST/PUT/PATCH 请求的 HTTP 头
 * 中传递 Idempotency-Key: <uuid>, 服务端:
 *  - 首次请求: 执行 handler, 将 (status + body) 缓存到 KV, TTL 2h
 *  - 同 key 同 body 重放: 返回缓存的 response
 *  - 同 key 不同 body: 409 IDEMPOTENCY_KEY_REUSED
 *  - handler 5xx: 不缓存
 */

import { Context, Next } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import type { Env } from "./auth";

const IDEM_KEY_PREFIX = "idem";
const IDEM_TTL_SECONDS = 2 * 60 * 60; // 2 hours
const IDEM_HEADER = "Idempotency-Key";

// ---------- Internal types ----------

interface IdempotencyEntry {
  status: number;
  body: string;
  bodyHash: string;
}

/** 从 c.req.raw 取请求体并计算 SHA-256 hex */
async function hashBody(c: Context<{ Bindings: Env }>): Promise<string> {
  // 克隆请求体（Hono 的 c.req.raw.body 是 ReadableStream，只能读一次）
  const cloned = c.req.raw.clone();
  const body = await cloned.text();
  const bytes = new TextEncoder().encode(body);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex;
}

/** 构建 KV key: idem:<route>:<userId>:<key> */
function buildKvKey(
  method: string,
  path: string,
  _userId: string | undefined,
  idempotencyKey: string,
): string {
  const scope = `${method}:${path}`;
  return `${IDEM_KEY_PREFIX}:${scope}:${idempotencyKey}`;
}

// ---------- Middleware ----------

/**
 * Hono middleware: 截取 Idempotency-Key header, 执行 KV 回放逻辑。
 *
 * 使用方式（在 v1 写端点 POST 路由上挂载）:
 *   v1.post("/teams", idempotencyMiddleware, myHandler)
 *
 * 或全局挂载（如果未来所有写端点都需要）:
 *   v1.use("/teams/*", idempotencyMiddleware)
 */
export async function idempotencyMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<Response | void> {
  const kv = c.env.GOMATE_KV;
  const idempKey = c.req.header(IDEM_HEADER);

  // 只处理 POST / PUT / PATCH
  const method = c.req.method;
  if (!["POST", "PUT", "PATCH"].includes(method)) {
    await next();
    return;
  }

  // 必需：Idempotency-Key header
  if (!idempKey) {
    return c.json(
      { success: false, error: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key header is required" },
      400 as const,
    );
  }

  // 验证 UUID 格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempKey)) {
    return c.json(
      { success: false, error: "INVALID_IDEMPOTENCY_KEY", message: "Idempotency-Key must be a valid UUID v4" },
      400 as const,
    );
  }

  // 如果没有 KV, 跳过幂等（降级到非幂等）
  if (!kv) {
    await next();
    return;
  }

  const path = c.req.path;
  const bodyHash = await hashBody(c);

  // scope: route + method (user scoping handled by auth in route handler)
  const kvKey = buildKvKey(method, path, undefined, idempKey);

  try {
    const existing = await kv.get(kvKey);
    if (existing) {
      const entry: IdempotencyEntry = JSON.parse(existing);

      // 同 key 不同 body → 409
      if (entry.bodyHash !== bodyHash) {
        return c.json(
          {
            success: false,
            error: "IDEMPOTENCY_KEY_REUSED",
            message: "This idempotency key was already used with a different request body",
          },
          409,
        );
      }

      // 同 key 同 body → 回放缓存的 response
      return new Response(entry.body, {
        status: entry.status,
        headers: { "Content-Type": "application/json", "X-Idempotency-Replay": "true" },
      });
    }

    // miss → 执行 handler
    await next();

    // handler 执行完毕, 检查 response
    const res = c.res;
    if (!res) return;

    // 只缓存 2xx 成功 response
    if (res.status >= 200 && res.status < 300) {
      const resBody = await res.clone().text();
      const entry: IdempotencyEntry = {
        status: res.status,
        body: resBody,
        bodyHash,
      };
      // fire-and-forget 写 KV
      void kv
        .put(kvKey, JSON.stringify(entry), { expirationTtl: IDEM_TTL_SECONDS })
        .catch((err: unknown) => console.warn("[Idempotency] KV write failed:", err));
    }
  } catch (err) {
    console.warn("[Idempotency] middleware error:", err);
    // 中间件异常 → 放行 handler（降级幂等，不阻塞请求）
    await next();
  }
}
