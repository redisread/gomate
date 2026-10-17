import { and, eq, or, sql } from "drizzle-orm";
import {
  createApiApp,
  createRoute,
  jsonResponse,
  errorResponses,
} from "../../lib/openapi";
import { localCircleSchema } from "../../../contracts/local-circle";
import { z } from "zod";

import { createDb, type Db } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";
import { getActiveSession } from "../../lib/active-session";
import { logger } from "../../lib/logger";
import {
  getLocalCircleHome,
  LocalCircleRegionError,
  type LocalCircleLanguage,
} from "../../services/local-circle";

const SHENZHEN_REGION_ID = "region-cn-shenzhen";
const languageSchema = z.enum(["zh-CN", "en", "ja"]);
const regionIdSchema = z.string().trim().min(1).max(128);
const homeQuerySchema = z
  .object({
    language: languageSchema.optional(),
    regionId: regionIdSchema.optional(),
  })
  .passthrough();
const home = createApiApp();

type ResolvedRegion = {
  id: string;
};

function safeErrorMetadata(error: unknown) {
  return {
    errorType: error instanceof Error ? error.name : "UnknownError",
  };
}

function resolveLanguage(
  requested: string | undefined,
  acceptLanguage: string | undefined,
): LocalCircleLanguage | null {
  if (requested !== undefined) {
    return requested as LocalCircleLanguage;
  }
  const primary = acceptLanguage?.split(",", 1)[0]?.trim().toLowerCase();
  if (primary?.startsWith("en")) return "en";
  if (primary?.startsWith("ja")) return "ja";
  return "zh-CN";
}

async function findOpenCityById(db: Db, id: string) {
  const [region] = await db
    .select({ id: schema.region.id })
    .from(schema.region)
    .where(
      and(
        eq(schema.region.id, id),
        eq(schema.region.level, "city"),
        eq(schema.region.serviceEnabled, true),
      ),
    )
    .limit(1);
  return region ?? null;
}

async function resolveRegion(
  db: Db,
  requestedRegionId: string | undefined,
  cfIpCity: string | undefined,
): Promise<ResolvedRegion | null> {
  if (requestedRegionId !== undefined) {
    return findOpenCityById(db, requestedRegionId);
  }

  const cityName = cfIpCity?.trim();
  if (cityName && cityName.length <= 120) {
    const [matched] = await db
      .select({ id: schema.region.id })
      .from(schema.region)
      .where(
        and(
          eq(schema.region.level, "city"),
          eq(schema.region.serviceEnabled, true),
          or(
            eq(schema.region.name, cityName),
            sql`lower(${schema.region.nameEn}) = lower(${cityName})`,
          ),
        ),
      )
      .limit(1);
    if (matched) return matched;
  }

  return findOpenCityById(db, SHENZHEN_REGION_ID);
}

home.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getLocalCircleHome",
    tags: ["Local circle"],
    "x-audience": "public",
    request: { query: homeQuerySchema },
    responses: {
      200: jsonResponse(
        localCircleSchema.extend({ success: z.literal(true) }),
        "Local circle",
      ),
      ...errorResponses(400, 500, 503),
    },
  }),
  async (c) => {
    const query = c.req.valid("query");
    const regionQuery = query;
    const requestedLanguage = query.language;
    const language = resolveLanguage(
      requestedLanguage,
      c.req.header("accept-language"),
    );
    if (!language) {
      return c.json(
        APIErrors.validationError("language must be zh-CN, en or ja"),
        400,
      );
    }

    try {
      const db = createDb(c.env.DB);
      const requestedRegionId = regionQuery.regionId;
      const region = await resolveRegion(
        db,
        requestedRegionId,
        c.req.header("CF-IPCity"),
      );
      if (!region) {
        if (requestedRegionId !== undefined) {
          return c.json(
            APIErrors.badRequest(
              "regionId must reference an enabled city Region",
            ),
            400,
          );
        }
        return c.json(
          APIErrors.serviceUnavailable("Default Region is not configured"),
          503,
        );
      }

      let currentUserId: string | null = null;
      try {
        const session = await getActiveSession(c.env, c.req.raw.headers);
        currentUserId = session?.user.id ?? null;
      } catch (error) {
        logger.warn(
          "local_circle_session_lookup_failed",
          safeErrorMetadata(error),
        );
      }

      const result = await getLocalCircleHome({
        db,
        regionId: region.id,
        language,
        currentUserId,
      });
      return c.json({ success: true as const, ...result }, 200);
    } catch (error) {
      if (error instanceof LocalCircleRegionError) {
        return c.json(
          APIErrors.badRequest(
            "regionId must reference an enabled city Region",
          ),
          400,
        );
      }
      logger.error("local_circle_home_get_failed", safeErrorMetadata(error));
      return c.json(
        APIErrors.internalError("Failed to fetch local circle home"),
        500,
      );
    }
  },
  (result, c) => {
    if (result.success) return;
    if (result.error.issues.some((issue) => issue.path[0] === "language")) {
      return c.json(
        APIErrors.validationError("language must be zh-CN, en or ja"),
        400,
      );
    }
    return c.json(
      APIErrors.badRequest("regionId must reference an enabled city Region"),
      400,
    );
  },
);

export { home as localCircleHomeRoute };
