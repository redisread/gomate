import {
  and,
  asc,
  desc,
  eq,
  inArray,
  like,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { ACTIVITY_TYPES } from "@/contracts";

import { createDb } from "../../db";
import * as schema from "../../db/schema";
import {
  adminAccessErrorResponse,
  requireAdmin,
} from "../../lib/admin-access";
import { APIErrors } from "../../lib/api-errors";
import type { Env } from "../../lib/auth";
import { setPublicCacheHeaders } from "../../lib/http-cache";
import { logger } from "../../lib/logger";
import {
  decodeContentCursor,
  encodeContentCursor,
} from "../../lib/content-cursor";
import { validateRequest } from "../../lib/validation";
import {
  loadLocationTags,
  projectLocation,
  projectRegion,
  safeErrorMetadata,
} from "./utils";

const queries = new Hono<{ Bindings: Env }>();

const locationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(12),
  cursor: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  regionId: z.string().trim().min(1).max(128).optional(),
  activityType: z.enum(ACTIVITY_TYPES).optional(),
  tagIds: z
    .string()
    .trim()
    .max(2_000)
    .optional()
    .transform((value) =>
      value
        ? [
            ...new Set(
              value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            ),
          ]
        : [],
    )
    .refine((values) => values.length <= 20, "At most 20 tag IDs are allowed"),
});

const adminLocationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
}).strict();

type Db = ReturnType<typeof createDb>;

export function buildLocationPageQuery(
  db: Db,
  where: SQL | undefined,
  limit: number,
) {
  return db
    .select({
      location: schema.locations,
      region: schema.region,
    })
    .from(schema.locations)
    .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
    .where(where)
    .orderBy(desc(schema.locations.createdAt), desc(schema.locations.id))
    .limit(limit);
}

queries.get("/admin", async (c) => {
  try {
    await requireAdmin(c);
  } catch (error) {
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    throw error;
  }
  const parsed = await validateRequest(
    c,
    "query",
    adminLocationListQuerySchema,
    "Invalid admin location filters",
    "issues",
  );
  if (parsed instanceof Response) return parsed;

  const conditions: SQL[] = [];
  if (parsed.search) {
    conditions.push(like(schema.locations.name, `%${parsed.search}%`));
  }
  if (parsed.status) {
    conditions.push(eq(schema.locations.status, parsed.status));
  }
  if (parsed.cursor) {
    const cursor = decodeContentCursor(parsed.cursor);
    if (!cursor) return c.json(APIErrors.badRequest("Invalid location cursor"), 400);
    const createdAt = new Date(cursor.t);
    conditions.push(or(
      lt(schema.locations.createdAt, createdAt),
      and(eq(schema.locations.createdAt, createdAt), lt(schema.locations.id, cursor.id)),
    )!);
  }

  try {
    const db = createDb(c.env.DB);
    const rows = await buildLocationPageQuery(
      db,
      conditions.length > 0 ? and(...conditions) : undefined,
      parsed.limit + 1,
    );
    const hasMore = rows.length > parsed.limit;
    const page = rows.slice(0, parsed.limit);
    const tags = await loadLocationTags(
      db,
      page.map(({ location }) => location.id),
    );
    const oldest = page.at(-1)?.location;
    return c.json({
      success: true as const,
      locations: page.map(({ location, region }) =>
        projectLocation(location, region, tags.get(location.id) ?? []),
      ),
      nextCursor: hasMore && oldest
        ? encodeContentCursor({ t: oldest.createdAt.getTime(), id: oldest.id })
        : null,
    });
  } catch (error) {
    logger.error("admin_locations_list_failed", safeErrorMetadata(error));
    return c.json(APIErrors.internalError("Failed to list admin locations"), 500);
  }
});

queries.get("/", async (c) => {
  if (
    c.req.query("page") !== undefined ||
    c.req.query("pageSize") !== undefined
  ) {
    return c.json(
      APIErrors.badRequest("page pagination is not supported; use cursor"),
      400,
    );
  }
  const parsed = await validateRequest(
    c,
    "query",
    locationListQuerySchema,
    "Invalid location filters",
    "flatten",
  );
  if (parsed instanceof Response) return parsed;

  try {
    const db = createDb(c.env.DB);
    const {
      limit,
      cursor: encodedCursor,
      search,
      regionId,
      activityType,
      tagIds,
    } = parsed;
    const baseConditions: SQL[] = [
      eq(schema.locations.status, "published"),
      eq(schema.region.level, "city"),
      eq(schema.region.serviceEnabled, true),
    ];

    if (search) {
      baseConditions.push(like(schema.locations.name, `%${search}%`));
    }
    if (regionId) {
      baseConditions.push(eq(schema.locations.regionId, regionId));
    }
    if (activityType) {
      baseConditions.push(sql`exists (
        select 1
        from json_each(${schema.locations.supportedActivityTypes})
        where json_each.value = ${activityType}
      )`);
    }

    if (tagIds.length > 0) {
      const matchingLocationIds = db
        .select({ locationId: schema.locationTags.locationId })
        .from(schema.locationTags)
        .where(inArray(schema.locationTags.tagId, tagIds));
      baseConditions.push(inArray(schema.locations.id, matchingLocationIds));
    }

    const baseWhere = and(...baseConditions);
    const [{ total: rawTotal }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.locations)
      .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .where(baseWhere);
    const total = Number(rawTotal);

    const pageConditions = [...baseConditions];
    if (encodedCursor !== undefined) {
      const cursor = decodeContentCursor(encodedCursor);
      if (!cursor) {
        return c.json(APIErrors.badRequest("Invalid location cursor"), 400);
      }
      const cursorDate = new Date(cursor.t);
      pageConditions.push(
        or(
          lt(schema.locations.createdAt, cursorDate),
          and(
            eq(schema.locations.createdAt, cursorDate),
            lt(schema.locations.id, cursor.id),
          ),
        )!,
      );
    }

    const fetchedRows = await buildLocationPageQuery(
      db,
      and(...pageConditions),
      limit + 1,
    );
    const hasMore = fetchedRows.length > limit;
    const rows = fetchedRows.slice(0, limit);

    const tagsByLocation = await loadLocationTags(
      db,
      rows.map((row) => row.location.id),
    );
    const locations = rows.map((row) =>
      projectLocation(
        row.location,
        row.region,
        tagsByLocation.get(row.location.id) ?? [],
      ),
    );
    const oldest = rows.at(-1)?.location;

    setPublicCacheHeaders(c);
    return c.json({
      success: true as const,
      locations,
      total,
      nextCursor:
        hasMore && oldest
          ? encodeContentCursor({
              t: oldest.createdAt.getTime(),
              id: oldest.id,
            })
          : null,
    });
  } catch (error) {
    logger.error("locations_list_failed", safeErrorMetadata(error));
    return c.json(APIErrors.internalError("Failed to list locations"), 500);
  }
});

queries.get("/stats", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const rows = await db
      .select({
        id: schema.locations.id,
        name: schema.locations.name,
        slug: schema.locations.slug,
        regionId: schema.locations.regionId,
        region: schema.region,
        latitude: schema.locations.latitude,
        longitude: schema.locations.longitude,
        coverImageUrl: schema.locations.coverImageUrl,
        supportedActivityTypes: schema.locations.supportedActivityTypes,
      })
      .from(schema.locations)
      .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .where(
        and(
          eq(schema.locations.status, "published"),
          eq(schema.region.level, "city"),
          eq(schema.region.serviceEnabled, true),
        ),
      )
      .orderBy(asc(schema.region.sortOrder), asc(schema.locations.id));

    const regionCounts = new Map<
      string,
      { region: ReturnType<typeof projectRegion>; count: number }
    >();
    for (const row of rows) {
      const current = regionCounts.get(row.regionId);
      if (current) current.count += 1;
      else {
        regionCounts.set(row.regionId, {
          region: projectRegion(row.region),
          count: 1,
        });
      }
    }

    setPublicCacheHeaders(c);
    return c.json({
      success: true as const,
      total: rows.length,
      regions: [...regionCounts.values()],
      points: rows.map(({ region, ...point }) => ({
        ...point,
        region: projectRegion(region),
      })),
    });
  } catch (error) {
    logger.error("location_stats_get_failed", safeErrorMetadata(error));
    return c.json(
      APIErrors.internalError("Failed to get location statistics"),
      500,
    );
  }
});

queries.get("/:id/tags", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const locationId = c.req.param("id");
    const rows = await db
      .select({
        locationId: schema.locations.id,
        tag: {
          id: schema.tags.id,
          name: schema.tags.name,
          slug: schema.tags.slug,
        },
      })
      .from(schema.locations)
      .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .leftJoin(
        schema.locationTags,
        eq(schema.locationTags.locationId, schema.locations.id),
      )
      .leftJoin(schema.tags, eq(schema.tags.id, schema.locationTags.tagId))
      .where(
        and(
          eq(schema.locations.id, locationId),
          eq(schema.locations.status, "published"),
          eq(schema.region.level, "city"),
          eq(schema.region.serviceEnabled, true),
        ),
      )
      .orderBy(asc(schema.tags.name), asc(schema.tags.id));
    if (rows.length === 0) {
      return c.json(APIErrors.notFound("Location not found"), 404);
    }
    return c.json({
      success: true as const,
      tags: rows.flatMap(({ tag }) => (tag ? [tag] : [])),
    });
  } catch (error) {
    logger.error("location_tags_get_failed", safeErrorMetadata(error));
    return c.json(APIErrors.internalError("Failed to get location tags"), 500);
  }
});

queries.get("/:id/admin", async (c) => {
  try {
    await requireAdmin(c);
    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    const [row] = await db
      .select({
        location: schema.locations,
        region: schema.region,
      })
      .from(schema.locations)
      .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .where(eq(schema.locations.id, id))
      .limit(1);

    if (!row) return c.json(APIErrors.notFound("Location not found"), 404);
    const tags = await loadLocationTags(db, [row.location.id]);
    return c.json({
      success: true as const,
      location: projectLocation(
        row.location,
        row.region,
        tags.get(row.location.id) ?? [],
      ),
    });
  } catch (error) {
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    logger.error("location_admin_get_failed", safeErrorMetadata(error));
    return c.json(APIErrors.internalError("Failed to get location"), 500);
  }
});

queries.get("/:id", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    const [row] = await db
      .select({
        location: schema.locations,
        region: schema.region,
      })
      .from(schema.locations)
      .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .where(
        and(
          eq(schema.locations.id, id),
          eq(schema.locations.status, "published"),
          eq(schema.region.level, "city"),
          eq(schema.region.serviceEnabled, true),
        ),
      )
      .limit(1);

    if (!row) return c.json(APIErrors.notFound("Location not found"), 404);
    const tags = await loadLocationTags(db, [row.location.id]);
    return c.json({
      success: true as const,
      location: projectLocation(
        row.location,
        row.region,
        tags.get(row.location.id) ?? [],
      ),
    });
  } catch (error) {
    logger.error("location_get_failed", safeErrorMetadata(error));
    return c.json(APIErrors.internalError("Failed to get location"), 500);
  }
});

export default queries;
