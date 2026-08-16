import type { ActivityType } from "@gomate/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";
import type { Env } from "../../lib/auth";
import { getActiveSession } from "../../lib/active-session";
import { logger } from "../../lib/logger";
import { parseUserExtra } from "../../lib/user-extra";
import { getRecommendOnboarding } from "../../services/recommend-onboarding";

const recommendOnboarding = new Hono<{ Bindings: Env }>();
const ACTIVITY_TYPES = new Set<ActivityType>([
  "hiking",
  "explore",
  "leisure",
  "travel",
]);

recommendOnboarding.get("/recommend-onboarding", async (c) => {
  try {
    const session = await getActiveSession(c.env, c.req.raw.headers);
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const requestedActivityType = c.req.query("activityType")?.trim();
    if (requestedActivityType && !ACTIVITY_TYPES.has(requestedActivityType as ActivityType)) {
      return c.json(APIErrors.validationError("activityType 无效"), 400);
    }

    const db = createDb(c.env.DB);
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.user.id),
    });
    if (!user) return c.json(APIErrors.unauthorized("用户不存在"), 401);

    const userRegionId = parseUserExtra(user.extra).city;
    const result = await getRecommendOnboarding({
      db,
      userId: session.user.id,
      regionId: c.req.query("regionId")?.trim() || userRegionId,
      activityType: requestedActivityType as ActivityType | undefined,
    });

    return c.json(result);
  } catch (error) {
    logger.error("team_recommend_onboarding_failed", error);
    return c.json(APIErrors.internalError("获取推荐队伍失败"), 500);
  }
});

export default recommendOnboarding;
