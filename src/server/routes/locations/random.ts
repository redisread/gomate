import {
  RandomLocationQuerySchema,
  RandomLocationResponseSchema,
} from "@/contracts/random-location";
import {
  createApiApp,
  createRoute,
  jsonResponse,
  errorResponses,
  validationHook,
} from "../../lib/openapi";
import { createMiddleware } from "hono/factory";
import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";
import { safeErrorMetadata } from "./utils";
import { buildRandomLocationSql } from "./random-query";

const random = createApiApp();
random.openapi(
  createRoute({
    method: "get",
    path: "/random",
    operationId: "getRandomLocation",
    summary: "随机发现全国公开地点",
    tags: ["地点"],
    "x-audience": "public",
    description:
      "从已发布且所属城市启用的地点中等概率抽取。recent 为最多 10 个不重复 ID，按最早到最近排列；全部命中时放回最早结果。无地点返回 null，响应禁止缓存。",
    middleware: [
      createMiddleware(async (c, next) => {
        c.header("Cache-Control", "no-store");
        await next();
      }),
    ],
    request: { query: RandomLocationQuerySchema },
    responses: {
      200: jsonResponse(RandomLocationResponseSchema, "随机地点与公开地点总数"),
      ...errorResponses(400, 500),
    },
  }),
  async (c) => {
    try {
      const { recent } = c.req.valid("query");
      const row = await c.env.DB.prepare(buildRandomLocationSql(recent))
        .bind(...recent)
        .first<{
          id: string;
          name: string;
          city: string;
          coverImageUrl: string | null;
          total: number;
        }>();
      if (!row)
        return c.json(
          { success: true as const, location: null, total: 0 },
          200,
        );
      const { total, ...location } = row;
      return c.json({ success: true as const, location, total }, 200);
    } catch (error) {
      logger.error("location_random_failed", safeErrorMetadata(error));
      return c.json(APIErrors.internalError("Failed to choose location"), 500);
    }
  },
  validationHook("Invalid recent locations", "flatten"),
);
export default random;
