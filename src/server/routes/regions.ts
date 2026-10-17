import { RegionSchema } from "@/contracts";
import { and, asc, eq } from "drizzle-orm";
import {
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  validationHook,
  z,
} from "../lib/openapi";

import { createDb } from "../db";
import { region } from "../db/schema";
import { APIErrors } from "../lib/api-errors";
import { logger } from "../lib/logger";

const querySchema = z.object({
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase())
    .default("CN"),
  level: z.enum(["province", "city", "district", "other"]).default("city"),
  serviceEnabled: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .prefault("true"),
  parentId: z.string().trim().min(1).max(128).optional(),
});

const regionsRoute = createApiApp();

regionsRoute.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "regionsList",
    tags: ["regions"],
    summary: "List service regions",
    "x-audience": "public",
    request: { query: querySchema },
    responses: {
      200: jsonResponse(
        z.object({ success: z.literal(true), regions: z.array(RegionSchema) }),
        "Success",
      ),
      ...errorResponses(400, 500),
    },
  }),
  async (c) => {
    const parsed = c.req.valid("query");
    try {
      const db = createDb(c.env.DB);
      const filters = [
        eq(region.countryCode, parsed.countryCode),
        eq(region.level, parsed.level),
        eq(region.serviceEnabled, parsed.serviceEnabled),
      ];
      if (parsed.parentId) {
        filters.push(eq(region.parentId, parsed.parentId));
      }

      const regions = await db
        .select({
          id: region.id,
          countryCode: region.countryCode,
          parentId: region.parentId,
          name: region.name,
          nameEn: region.nameEn,
          slug: region.slug,
          code: region.code,
          level: region.level,
          timezone: region.timezone,
          centerLatitude: region.centerLatitude,
          centerLongitude: region.centerLongitude,
          serviceEnabled: region.serviceEnabled,
          isHot: region.isHot,
          sortOrder: region.sortOrder,
        })
        .from(region)
        .where(and(...filters))
        .orderBy(asc(region.sortOrder), asc(region.id));

      return c.json({ success: true as const, regions }, 200);
    } catch (error) {
      logger.error("regions_list_failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return c.json(APIErrors.internalError("Failed to list regions"), 500);
    }
  },
  validationHook("Invalid region filters", "flatten"),
);

export { regionsRoute };
