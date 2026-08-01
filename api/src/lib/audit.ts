/**
 * P2-3 #219: 审计归属 — actor.metadata.apiKeyId 注入
 *
 * 在鉴权后解析 actor 来源（session vs apiKey），提取 apiKeyId。
 * 使用方式：
 *   const audit = await resolveAuditActor(c);
 *   // 写端点 INSERT 时传 audit.apiKeyId（可为 null）
 *   await db.insert(schema.teams).values({ ..., actorApiKeyId: audit.apiKeyId });
 */

import { Context } from "hono";
import { eq, desc } from "drizzle-orm";
import { createDb } from "../db";
import { apiKeys } from "../db/schema";
import { createAuth, type Env } from "./auth";
import { logger } from "./logger";

export interface AuditActor {
  /** 如果请求通过 apiKey 鉴权，为 apikey.id；否则为 null */
  apiKeyId: string | null;
  /** 如果请求通过 apiKey 鉴权为 'apiKey'，否则为 'user' */
  actorType: "user" | "apiKey";
  /** 用户 ID（已认证请求必有） */
  userId: string | null;
}

/**
 * 从 Hono 上下文中解析审计 actor 信息。
 * 调用前提：必须在鉴权后（路由 handler 内 session 已解析）。
 */
export async function resolveAuditActor(
  c: Context<{ Bindings: Env }>,
): Promise<AuditActor> {
  const auth = createAuth(c.env);

  try {
    // 优先用 c.get('user')（route handler 已通过 sessionMiddleware 注入）
    // 兜底走 auth.api.getSession（直接读 headers）
    let sessionUserId: string | null = null;
    const ctxVars = (c as unknown as { get: (k: string) => unknown }).get;
    const ctxUser = (ctxVars?.("user") as { id?: string } | undefined);
    if (ctxUser && typeof ctxUser === "object" && typeof ctxUser.id === "string") {
      sessionUserId = ctxUser.id;
    } else {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      }).catch(() => null);
      sessionUserId = session?.user?.id ?? null;
    }

    if (!sessionUserId) {
      return { apiKeyId: null, actorType: "user", userId: null };
    }

    const userId = sessionUserId;
    const xApiKey = c.req.header("x-api-key");

    if (xApiKey) {
      // 请求通过 apiKey 鉴权 → 查 apiKeys 表获取 id
      // 用 referenceId(userId) + lastRequest 排序取最近使用的 key
      try {
        const db = createDb(c.env.DB);
        const [key] = await db
          .select({ id: apiKeys.id })
          .from(apiKeys)
          .where(eq(apiKeys.referenceId, userId))
          .orderBy(desc(apiKeys.lastRequest), desc(apiKeys.createdAt))
          .limit(1);

        if (key?.id) {
          return { apiKeyId: key.id, actorType: "apiKey", userId };
        }
      } catch (err) {
        logger.warn("[Audit] apiKeyId lookup failed:", err);
      }
    }

    return { apiKeyId: null, actorType: "user", userId };
  } catch {
    return { apiKeyId: null, actorType: "user", userId: null };
  }
}
