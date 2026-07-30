/**
 * P2-3 #219: 审计归属 — actor.metadata.apiKeyId 注入
 *
 * 在鉴权后解析 actor 来源（session vs apiKey），提取 apiKeyId，
 * 注入到请求上下文供写端点 INSERT 时使用。
 *
 * 使用方式：
 *   在 v1 写端点 handler 内：
 *     const audit = injectAudit(c);
 *     // audit.apiKeyId — string | null
 *     // audit.actorType — 'user' | 'apiKey'
 */

import { Context } from "hono";
import type { Env } from "./auth";

export interface AuditActor {
  /** 如果请求通过 apiKey 鉴权，为 apikey.id；否则为 null */
  apiKeyId: string | null;
  /** 如果请求通过 apiKey 鉴权为 'apiKey'，否则为 'user' */
  actorType: "user" | "apiKey";
  /** 用户 ID（始终存在，已认证请求必有） */
  userId: string | null;
}

/**
 * 从 Hono 上下文中提取审计 actor 信息。
 *
 * 解析策略：
 * 1. 尝试从 session（better-auth 的 getSession 结果）取 userId
 * 2. 检查是否通过 x-api-key 鉴权（session 来源是否为 apiKey）
 * 3. 返回 AuditActor 对象
 *
 * 注意：必须在鉴权中间件或路由 handler 内部 session 已解析后调用。
 */
export function injectAudit(c: Context<{ Bindings: Env }>): AuditActor {
  // 从 c.get("session") 取 #217 authMiddleware 已解析的 session
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const session = (c as unknown as Record<string, unknown>).get("session");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const userId: string | null = session?.user?.id ?? null;

  // 从 c.get("x-api-key-actor") 取（由 #217 apiKey middleware 注入）
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const apiKeyId: string | null = (c as unknown as Record<string, unknown>).get("apiKeyId") as string | null ?? null;

  return {
    apiKeyId,
    actorType: apiKeyId ? "apiKey" : "user",
    userId,
  };
}
