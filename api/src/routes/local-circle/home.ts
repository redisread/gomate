/**
 * P0-D T1 (task #175) — GET /api/local-circle/home
 *
 * spec: notes/gomate-p0d-local-circle-spec-v1.2.md §3.4
 *
 * Query:
 *   - cityId: string (可选) — 前端传用户 city；缺省时服务端 fallback 到默认城市（深圳）
 *     （spec §3.4「匿名 fallback 深圳」+ Martin PR #406 NIT 方案 a：省前端 /cities 往返）
 *
 * Response（200）：LocalCircle（见 services/local-circle.ts）
 *
 * 匿名可访问：cityId 是纯输入不依赖 session；
 * 登录用户附带 currentUserId 用于邻居队伍关联。
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { createAuth, type Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { getLocalCircleHome } from "../../services/local-circle";

/** 默认城市名（cityId 缺省时 fallback，与 service 层 cityName fallback 语义一致） */
const DEFAULT_CITY_NAME = "深圳";

const home = new Hono<{ Bindings: Env }>();

home.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);

    // cityId 可选：缺省时服务端 fallback 深圳（方案 a，省前端 /cities 往返）
    // 空串（cityId=）与缺省一视同仁走 fallback；非空则直接用（未知 id 由 service 走空态 fallback）
    let cityId = c.req.query("cityId");
    if (!cityId) {
      const shenzhen = await db
        .select({ id: schema.cities.id })
        .from(schema.cities)
        .where(eq(schema.cities.name, DEFAULT_CITY_NAME))
        .limit(1);
      if (shenzhen.length === 0) {
        // 连默认城市都没有 → 空态（service emptyResult 语义）
        return c.json(APIErrors.badRequest("cityId is required and no default city available"), 400);
      }
      cityId = shenzhen[0].id;
    }

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
