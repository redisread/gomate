/**
 * P1-1 T1 (task #187) — GET /teams/recommend-onboarding
 *
 * spec: notes/gomate-p1-1-onboarding-spec.md v1.2 §9.3 / §11 T1
 *
 * 登录态（hasAnyMembership 依赖 session）。返回：
 *   { hasAnyMembership, candidates: [...], fallbackNoType, cityId }
 *
 * Query:
 *   - type: hiking|explore|leisure|travel（可选）— 偏好过滤，死胡同自动去过滤标 fallbackNoType
 *
 * cityId 来源：users.city（#181 存 cityId）；缺省服务端 fallback 深圳（service 内处理）
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { createAuth, type Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";
import { getRecommendOnboarding } from "../../services/recommend-onboarding";

const recommendOnboarding = new Hono<{ Bindings: Env }>();

recommendOnboarding.get("/recommend-onboarding", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const db = createDb(c.env.DB);
    const type = c.req.query("type") || null;

    // users.city 存 cityId（#181 D3）；可能为 null → service fallback 深圳
    const userRow = await db
      .select({ city: schema.users.city })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);

    const result = await getRecommendOnboarding({
      db,
      userId: session.user.id,
      userCityId: userRow[0]?.city ?? null,
      type,
    });

    return c.json(result);
  } catch (error) {
    logger.error("Recommend onboarding error:", error);
    return c.json(APIErrors.internalError("获取推荐队伍失败"), 500);
  }
});

export default recommendOnboarding;
