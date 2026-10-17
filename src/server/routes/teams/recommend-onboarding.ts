import { teamCookieSecurity } from "./contracts";
import { teamSessionMiddleware } from "./session-middleware";
import { OnboardingResponseSchema } from "@/contracts/team-api";
import { queryString } from "./contracts";
import {
  createApiApp,
  createRoute,
  jsonResponse,
  errorResponses,
  z,
} from "../../lib/openapi";
import type { ActivityType } from "@/contracts";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";
import { parseUserExtra } from "../../lib/user-extra";
import { getRecommendOnboarding } from "../../services/recommend-onboarding";
import { isActivityType } from "@/lib/activity-types";

const recommendOnboarding = createApiApp();
recommendOnboarding.openapi(
  createRoute({
    method: "get",
    path: "/recommend-onboarding",
    operationId: "teamsRecommendOnboarding",
    tags: ["Teams"],
    summary: "Recommend teams for onboarding",
    "x-audience": "public",
    security: teamCookieSecurity,
    request: {
      query: z.object({ activityType: queryString, regionId: queryString }),
    },
    middleware: [
      teamSessionMiddleware((error) => {
        logger.error("team_recommend_onboarding_failed", error);
        return APIErrors.internalError("获取推荐队伍失败");
      }),
    ] as const,
    responses: {
      200: jsonResponse(OnboardingResponseSchema, "Success"),
      ...errorResponses(400, 401, 500),
    },
  }),
  async (c) => {
    try {
      const session = c.get("session");

      const requestedActivityType = c.req.query("activityType")?.trim();
      if (requestedActivityType && !isActivityType(requestedActivityType)) {
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

      return c.json(
        {
          ...result,
          candidates: result.candidates.map((candidate) => ({
            ...candidate,
            startAt: candidate.startAt.toISOString(),
          })),
        },
        200,
      );
    } catch (error) {
      logger.error("team_recommend_onboarding_failed", error);
      return c.json(APIErrors.internalError("获取推荐队伍失败"), 500);
    }
  },
);

export default recommendOnboarding;
