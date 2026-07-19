/**
 * P0-C T1 (task #172) — GET /api/recommendations/home
 *
 * spec: notes/gomate-p0c-homepage-recommend-spec.md v1.1 §5.2
 *
 * Query:
 *   - seed?: string  可选，不传则服务端生成（返回 nextSeed）
 *   - locale?: string 保留字段（未来 T3 i18n 可能读，本 T1 不消费）
 *
 * Response（200）：
 *   {
 *     recommendations: [{ kind, locationId, reason: { key, params } }, ...],
 *     candidatePoolSize: number,
 *     nextSeed: string,
 *     _meta?: { cacheHit: boolean, bucket: number }   // dev only（正式版可裁）
 *   }
 *
 * 匿名可访问（不需登录，seed 不写 cookie）。
 * 登录用户附加 session.user.city 作为 city fallback（spec §4.5）。
 */

import { Hono } from "hono";
import { logger } from "../../lib/logger";
import { createDb } from "../../db";
import { createAuth, type Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { recommendHome } from "../../services/recommendations";
import * as schema from "../../db/schema";
import { eq } from "drizzle-orm";

/** cache salt 从 env 取（在 Env 上扩展一个可选字段） */
interface RecoEnv extends Env {
  RECOMMEND_CACHE_SALT?: string;
}

const home = new Hono<{ Bindings: RecoEnv }>();

home.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);

    // 匿名可访问；登录用户拿 city
    let sessionCity: string | null = null;
    try {
      const authInstance = createAuth(c.env);
      const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
      if (session?.user?.id) {
        const rows = await db
          .select({ city: schema.users.city })
          .from(schema.users)
          .where(eq(schema.users.id, session.user.id))
          .limit(1);
        sessionCity = rows[0]?.city ?? null;
      }
    } catch {
      // getSession 失败静默；走匿名路径
    }

    const seed = c.req.query("seed") || null;
    const result = await recommendHome({
      db,
      kv: c.env.GOMATE_KV,
      request: c.req.raw,
      sessionCity,
      seed,
      salt: c.env.RECOMMEND_CACHE_SALT,
    });

    return c.json({
      recommendations: result.recommendations,
      candidatePoolSize: result.candidatePoolSize,
      nextSeed: result.nextSeed,
      _meta: {
        cacheHit: result.cache.hit,
        bucket: result.cache.bucket,
      },
    });
  } catch (err) {
    logger.error("[recommendations/home] failed", err);
    return c.json(APIErrors.internalError("Failed to compute recommendations"), 500);
  }
});

export { home as recommendationsHomeRoute };
