import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db";
import { region } from "../db/schema";
import { APIErrors } from "../lib/api-errors";
import type { Env } from "../lib/auth";
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
    .default("true"),
  parentId: z.string().trim().min(1).max(128).optional(),
});

const regionsRoute = new Hono<{ Bindings: Env }>();

regionsRoute.get("/", async (c) => {
  const parsed = querySchema.safeParse({
    countryCode: c.req.query("countryCode"),
    level: c.req.query("level"),
    serviceEnabled: c.req.query("serviceEnabled"),
    parentId: c.req.query("parentId"),
  });
  if (!parsed.success) {
    return c.json(APIErrors.validationError("Invalid region filters", parsed.error.flatten()), 400);
  }

  try {
    const db = createDb(c.env.DB);
    const filters = [
      eq(region.countryCode, parsed.data.countryCode),
      eq(region.level, parsed.data.level),
      eq(region.serviceEnabled, parsed.data.serviceEnabled),
    ];
    if (parsed.data.parentId) {
      filters.push(eq(region.parentId, parsed.data.parentId));
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

    return c.json({ success: true as const, regions });
  } catch (error) {
    logger.error("regions_list_failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return c.json(APIErrors.internalError("Failed to list regions"), 500);
  }
});

export { regionsRoute };
