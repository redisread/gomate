import type { ActivityTypeInfo } from "@/contracts";
import { asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db";
import * as schema from "../db/schema";
import {
  adminAccessErrorResponse,
  requireAdmin,
} from "../lib/admin-access";
import { APIErrors } from "../lib/api-errors";
import type { Env } from "../lib/auth";
import { setPublicCacheHeaders } from "../lib/http-cache";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";
import { validateRequest } from "../lib/validation";

const activityTypesRoute = new Hono<{ Bindings: Env }>();

const listSchema = z.object({
  includeInactive: z.enum(["true", "false"]).optional(),
}).strict();

const activityName = z.string().trim().min(1).max(80);
const activitySlug = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

const createSchema = z.object({
  name: activityName,
  slug: activitySlug.optional(),
  sortOrder: z.number().int().min(-10_000).max(10_000).default(0),
}).strict();

const updateSchema = z.object({
  name: activityName.optional(),
  sortOrder: z.number().int().min(-10_000).max(10_000).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

function slugify(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);
}

function toDto(row: {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}): ActivityTypeInfo {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

activityTypesRoute.get("/", async (c) => {
  const query = await validateRequest(
    c,
    "query",
    listSchema,
    "Invalid activity type filters",
    "issues",
  );
  if (query instanceof Response) return query;
  const includeInactive = query.includeInactive === "true";
  if (includeInactive) {
    try {
      await requireAdmin(c);
    } catch (error) {
      const denied = adminAccessErrorResponse(c, error);
      if (denied) return denied;
      throw error;
    }
  }

  const db = createDb(c.env.DB);
  try {
    if (includeInactive) {
      const rows = await db
        .select({
          id: schema.activityTypes.id,
          name: schema.activityTypes.name,
          slug: schema.activityTypes.slug,
          isActive: schema.activityTypes.isActive,
          sortOrder: schema.activityTypes.sortOrder,
          teamCount: sql<number>`(
            select count(*) from teams
            where teams.activity_type = ${schema.activityTypes.id}
          )`,
          locationCount: sql<number>`(
            select count(*) from locations
            where exists (
              select 1 from json_each(locations.supported_activity_types)
              where json_each.value = ${schema.activityTypes.id}
            )
          )`,
        })
        .from(schema.activityTypes)
        .orderBy(
          asc(schema.activityTypes.sortOrder),
          asc(schema.activityTypes.name),
          asc(schema.activityTypes.id),
        );
      return c.json({
        success: true as const,
        activityTypes: rows.map((row) => ({
          ...toDto(row),
          references: {
            teams: Number(row.teamCount),
            locations: Number(row.locationCount),
          },
        })),
      });
    }

    const rows = await db
      .select({
        id: schema.activityTypes.id,
        name: schema.activityTypes.name,
        slug: schema.activityTypes.slug,
        isActive: schema.activityTypes.isActive,
        sortOrder: schema.activityTypes.sortOrder,
      })
      .from(schema.activityTypes)
      .where(eq(schema.activityTypes.isActive, true))
      .orderBy(
        asc(schema.activityTypes.sortOrder),
        asc(schema.activityTypes.name),
        asc(schema.activityTypes.id),
      );
    setPublicCacheHeaders(c);
    return c.json({
      success: true as const,
      activityTypes: rows.map(toDto),
    });
  } catch (error) {
    logger.error("activity_types_list_failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return c.json(APIErrors.internalError("Failed to load activity types"), 500);
  }
});

activityTypesRoute.post("/", async (c) => {
  try {
    await requireAdmin(c);
  } catch (error) {
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    throw error;
  }
  const input = await validateRequest(
    c,
    "json",
    createSchema,
    "Invalid activity type",
    "issues",
  );
  if (input instanceof Response) return input;
  const slug = input.slug ?? slugify(input.name);
  if (!slug) {
    return c.json(APIErrors.validationError("Activity type slug is empty"), 400);
  }

  const db = createDb(c.env.DB);
  const id = generateId();
  try {
    const [created] = await db
      .insert(schema.activityTypes)
      .values({ id, name: input.name, slug, sortOrder: input.sortOrder })
      .returning();
    return c.json(
      { success: true as const, activityType: toDto(created) },
      201,
    );
  } catch {
    return c.json(APIErrors.conflict("Activity type slug already exists"), 409);
  }
});

activityTypesRoute.patch("/:id", async (c) => {
  try {
    await requireAdmin(c);
  } catch (error) {
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    throw error;
  }
  const input = await validateRequest(
    c,
    "json",
    updateSchema,
    "Invalid activity type",
    "issues",
  );
  if (input instanceof Response) return input;

  const db = createDb(c.env.DB);
  try {
    const [updated] = await db
      .update(schema.activityTypes)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.activityTypes.id, c.req.param("id")))
      .returning();
    if (!updated) {
      return c.json(APIErrors.notFound("Activity type not found"), 404);
    }
    return c.json({ success: true as const, activityType: toDto(updated) });
  } catch {
    return c.json(APIErrors.conflict("Activity type update conflicts"), 409);
  }
});

export { activityTypesRoute };
