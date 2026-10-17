import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  like,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  createApiApp,
  createRoute,
  z,
  jsonResponse,
  errorResponses,
  validationHook,
  adminMiddleware,
} from "../../lib/openapi";
import {
  LocationSchema,
  LocationStatsResponseSchema,
  TagSchema,
} from "@/contracts";
import { ACTIVITY_TYPES, type LocationStatsResponse } from "@/contracts";

import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";
import { setPublicCacheHeaders } from "../../lib/http-cache";
import { logger } from "../../lib/logger";
import {
  decodeContentCursor,
  encodeContentCursor,
} from "../../lib/content-cursor";
import {
  loadLocationTags,
  projectLocation,
  projectRegion,
  safeErrorMetadata,
} from "./utils";

const queries = createApiApp();
const locationResultSchema = z.object({
  success: z.literal(true),
  location: LocationSchema,
});
const locationTagsResultSchema = z.object({
  success: z.literal(true),
  tags: z.array(TagSchema),
});
const locationPageSchema = z.object({
  success: z.literal(true),
  locations: z.array(LocationSchema),
  nextCursor: z.string().nullable(),
});
const idParams = z.object({ id: z.string() });
const rejectLegacyPagination: import("hono").MiddlewareHandler = async (
  c,
  next,
) => {
  if (
    c.req.query("page") !== undefined ||
    c.req.query("pageSize") !== undefined
  ) {
    return c.json(
      APIErrors.badRequest("page pagination is not supported; use cursor"),
      400,
    );
  }
  await next();
};
const adminSecurity: Record<string, string[]>[] = [
  { cookieAuth: [] },
  { secureCookieAuth: [] },
];

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

const adminLocationListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.string().optional(),
    search: z.string().trim().max(100).optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
  })
  .strict();

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

queries.openapi(
  createRoute({
    method: "get",
    path: "/admin",
    operationId: "listAdminLocations",
    summary: "List all locations for administrators",
    tags: ["Locations"],
    "x-audience": "admin",
    request: { query: adminLocationListQuerySchema },
    middleware: [adminMiddleware()],
    security: adminSecurity,
    responses: {
      200: jsonResponse(locationPageSchema, "Success"),
      ...errorResponses(400, 401, 403, 500),
    },
  }),
  async (c) => {
    const parsed = c.req.valid("query");

    const conditions: SQL[] = [];
    if (parsed.search) {
      conditions.push(like(schema.locations.name, `%${parsed.search}%`));
    }
    if (parsed.status) {
      conditions.push(eq(schema.locations.status, parsed.status));
    }
    if (parsed.cursor) {
      const cursor = decodeContentCursor(parsed.cursor);
      if (!cursor)
        return c.json(APIErrors.badRequest("Invalid location cursor"), 400);
      const createdAt = new Date(cursor.t);
      conditions.push(
        or(
          lt(schema.locations.createdAt, createdAt),
          and(
            eq(schema.locations.createdAt, createdAt),
            lt(schema.locations.id, cursor.id),
          ),
        )!,
      );
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
      return c.json(
        {
          success: true as const,
          locations: page.map(({ location, region }) =>
            projectLocation(location, region, tags.get(location.id) ?? []),
          ),
          nextCursor:
            hasMore && oldest
              ? encodeContentCursor({
                  t: oldest.createdAt.getTime(),
                  id: oldest.id,
                })
              : null,
        },
        200,
      );
    } catch (error) {
      logger.error("admin_locations_list_failed", safeErrorMetadata(error));
      return c.json(
        APIErrors.internalError("Failed to list admin locations"),
        500,
      );
    }
  },
  validationHook("Invalid admin location filters", "issues"),
);

queries.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "listLocations",
    summary: "List published locations",
    tags: ["Locations"],
    "x-audience": "public",
    request: { query: locationListQuerySchema },
    middleware: [rejectLegacyPagination],
    responses: {
      200: jsonResponse(
        locationPageSchema.extend({ total: z.number() }),
        "Success",
      ),
      ...errorResponses(400, 500),
    },
  }),
  async (c) => {
    const parsed = c.req.valid("query");

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
        .innerJoin(
          schema.region,
          eq(schema.region.id, schema.locations.regionId),
        )
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
      return c.json(
        {
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
        },
        200,
      );
    } catch (error) {
      logger.error("locations_list_failed", safeErrorMetadata(error));
      return c.json(APIErrors.internalError("Failed to list locations"), 500);
    }
  },
  validationHook("Invalid location filters", "flatten"),
);

queries.openapi(
  createRoute({
    method: "get",
    path: "/stats",
    operationId: "getLocationStats",
    summary: "Map location statistics",
    tags: ["Locations"],
    "x-audience": "public",
    responses: {
      200: jsonResponse(LocationStatsResponseSchema, "Success"),
      ...errorResponses(500),
    },
  }),
  async (c) => {
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
        .innerJoin(
          schema.region,
          eq(schema.region.id, schema.locations.regionId),
        )
        .where(
          and(
            eq(schema.locations.status, "published"),
            eq(schema.region.level, "city"),
            eq(schema.region.serviceEnabled, true),
            isNotNull(schema.locations.latitude),
            isNotNull(schema.locations.longitude),
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
      return c.json(
        {
          success: true as const,
          total: rows.length,
          regions: [...regionCounts.values()],
          points: rows.map(({ region, ...point }) => ({
            ...point,
            region: projectRegion(region),
          })),
        } satisfies LocationStatsResponse,
        200,
      );
    } catch (error) {
      logger.error("location_stats_get_failed", safeErrorMetadata(error));
      return c.json(
        APIErrors.internalError("Failed to get location statistics"),
        500,
      );
    }
  },
);

queries.openapi(
  createRoute({
    method: "get",
    path: "/{id}/tags",
    operationId: "getLocationTags",
    summary: "Get location tags",
    tags: ["Locations"],
    "x-audience": "public",
    request: { params: idParams },
    responses: {
      200: jsonResponse(locationTagsResultSchema, "Success"),
      ...errorResponses(400, 404, 500),
    },
  }),
  async (c) => {
    try {
      const db = createDb(c.env.DB);
      const locationId = c.req.valid("param").id;
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
        .innerJoin(
          schema.region,
          eq(schema.region.id, schema.locations.regionId),
        )
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
      return c.json(
        {
          success: true as const,
          tags: rows.flatMap(({ tag }) => (tag ? [tag] : [])),
        },
        200,
      );
    } catch (error) {
      logger.error("location_tags_get_failed", safeErrorMetadata(error));
      return c.json(
        APIErrors.internalError("Failed to get location tags"),
        500,
      );
    }
  },
);

queries.openapi(
  createRoute({
    method: "get",
    path: "/{id}/admin",
    operationId: "getAdminLocation",
    summary: "Get any location as administrator",
    tags: ["Locations"],
    "x-audience": "admin",
    request: { params: idParams },
    middleware: [adminMiddleware()],
    security: adminSecurity,
    responses: {
      200: jsonResponse(locationResultSchema, "Success"),
      ...errorResponses(400, 401, 403, 404, 500),
    },
  }),
  async (c) => {
    try {
      const db = createDb(c.env.DB);
      const id = c.req.valid("param").id;
      const [row] = await db
        .select({
          location: schema.locations,
          region: schema.region,
        })
        .from(schema.locations)
        .innerJoin(
          schema.region,
          eq(schema.region.id, schema.locations.regionId),
        )
        .where(eq(schema.locations.id, id))
        .limit(1);

      if (!row) return c.json(APIErrors.notFound("Location not found"), 404);
      const tags = await loadLocationTags(db, [row.location.id]);
      return c.json(
        {
          success: true as const,
          location: projectLocation(
            row.location,
            row.region,
            tags.get(row.location.id) ?? [],
          ),
        },
        200,
      );
    } catch (error) {
      logger.error("location_admin_get_failed", safeErrorMetadata(error));
      return c.json(APIErrors.internalError("Failed to get location"), 500);
    }
  },
);

queries.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    operationId: "getLocation",
    summary: "Get a published location",
    tags: ["Locations"],
    "x-audience": "public",
    request: { params: idParams },
    responses: {
      200: jsonResponse(locationResultSchema, "Success"),
      ...errorResponses(400, 404, 500),
    },
  }),
  async (c) => {
    try {
      const db = createDb(c.env.DB);
      const id = c.req.valid("param").id;
      const [row] = await db
        .select({
          location: schema.locations,
          region: schema.region,
        })
        .from(schema.locations)
        .innerJoin(
          schema.region,
          eq(schema.region.id, schema.locations.regionId),
        )
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
      return c.json(
        {
          success: true as const,
          location: projectLocation(
            row.location,
            row.region,
            tags.get(row.location.id) ?? [],
          ),
        },
        200,
      );
    } catch (error) {
      logger.error("location_get_failed", safeErrorMetadata(error));
      return c.json(APIErrors.internalError("Failed to get location"), 500);
    }
  },
);

export default queries;
