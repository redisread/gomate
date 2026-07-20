/**
 * P0-D T1 (task #175) — GET /api/local-circle/home
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §3.4
 *
 * Query:
 *   - cityId: string (必需) — 前端从 session/用户 city 或 fallback 深圳传
 *
 * Response（200）：LocalCircle（见 services/local-circle.ts）
 *
 * 匿名可访问：cityId 是纯输入不依赖 session；
 * 登录用户附带 currentUserId 用于邻居队伍关联。
 */

import { Hono } from "hono";
import { logger } from "../../lib/logger";
import { createDb } from "../../db";
import { createAuth, type Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { getLocalCircleHome } from "../../services/local-circle";

const home = new Hono<{ Bindings: Env }>();

home.get("/", async (c) => {
  try {
    const cityId = c.req.query("cityId");
    if (!cityId) {
      return c.json(APIErrors.badRequest("cityId is required"), 400);
    }

    const db = createDb(c.env.DB);

    // 匿名允许；登录用户拿 id
    let currentUserId: string | null = null;
    try {
      const authInstance = createAuth(c.env);
      const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
      currentUserId = session?.user?.id ?? null;
    } catch {
      // getSession 失败静默；走匿名路径
    }

    const result = await getLocalCircleHome({
      db,
      kv: c.env.GOMATE_KV,
      cityId,
      currentUserId,
    });

    return c.json(result);
  } catch (err) {
    logger.error("[local-circle/home] failed", err);
    return c.json(APIErrors.internalError("Failed to fetch local circle home"), 500);
  }
});

export { home as localCircleHomeRoute };
