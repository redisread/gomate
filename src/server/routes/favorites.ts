import { TimestampSchema } from "@/contracts";
import {
  FavoriteLocationsResponseSchema,
  FavoriteStoriesResponseSchema,
  SuccessSchema,
} from "@/contracts/public-responses";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import {
  cookieSecurity,
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  legacyJsonBody,
  validationHook,
  z,
  type ApiEnv,
} from "../lib/openapi";

import { createDb } from "../db";
import * as schema from "../db/schema";
import { getActiveSession } from "../lib/active-session";
import { APIErrors } from "../lib/api-errors";
import {
  decodeContentCursor,
  encodeContentCursor,
} from "../lib/content-cursor";
import { mapDatabaseError } from "../lib/database-errors";
import { logger } from "../lib/logger";

const favorites = createApiApp();

type FavoritesContext = Context<ApiEnv>;
const favoriteSession: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);
  c.set("session", session);
  await next();
};

const idSchema = z.string().trim().min(1).max(200);
const listQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().max(512).optional(),
  })
  .strict();
const locationBody = z.object({ locationId: idSchema }).strict();
const storyBody = z.object({ storyId: idSchema }).strict();
const locationDeleteQuery = z.object({ locationId: idSchema }).strict();
const storyDeleteQuery = z.object({ storyId: idSchema }).strict();

function changes(result: D1Result<unknown> | undefined): number {
  return Number(result?.meta?.changes ?? 0);
}

type FavoritesDatabaseOperation =
  | "createLocation"
  | "createStory"
  | "deleteLocation"
  | "deleteStory"
  | "listLocations"
  | "listStories";

async function getSession(c: FavoritesContext) {
  return getActiveSession(c.env, c.req.raw.headers);
}

function databaseErrorResponse(
  c: FavoritesContext,
  operation: FavoritesDatabaseOperation,
  error: unknown,
) {
  const metadata = {
    errorType: error instanceof Error ? error.name : "UnknownDatabaseError",
  };

  switch (operation) {
    case "createLocation":
      logger.error("favorite_location_create_failed", metadata);
      break;
    case "createStory":
      logger.error("favorite_story_create_failed", metadata);
      break;
    case "deleteLocation":
      logger.error("favorite_location_delete_failed", metadata);
      break;
    case "deleteStory":
      logger.error("favorite_story_delete_failed", metadata);
      break;
    case "listLocations":
      logger.error("favorite_locations_list_failed", metadata);
      break;
    case "listStories":
      logger.error("favorite_stories_list_failed", metadata);
      break;
  }
  const mapped = mapDatabaseError(error);
  return c.json(mapped.body, mapped.status);
}

function parseListQuery(
  c: FavoritesContext,
  parsed: z.output<typeof listQuery>,
) {
  const cursor = parsed.cursor ? decodeContentCursor(parsed.cursor) : null;
  if (parsed.cursor && !cursor) {
    return {
      error: c.json(APIErrors.validationError("游标无效"), 400),
    } as const;
  }
  return { data: { ...parsed, cursor } } as const;
}

favorites.openapi(
  createRoute({
    method: "get",
    path: "/locations",
    operationId: "favoritesListlocations",
    tags: ["favorites"],
    summary: "List favorite locations",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [favoriteSession],
    request: { query: listQuery },
    responses: {
      200: jsonResponse(FavoriteLocationsResponseSchema, "Success"),
      ...errorResponses(400, 401, 409, 422),
    },
  }),
  async (c) => {
    const session = c.get("session");

    const parsed = parseListQuery(c, c.req.valid("query"));
    if (parsed.error) return parsed.error;

    try {
      const db = createDb(c.env.DB);
      const conditions = [
        eq(schema.userLocationFavorites.userId, session.user.id),
        eq(schema.locations.status, "published"),
        eq(schema.region.level, "city"),
        eq(schema.region.serviceEnabled, true),
      ];
      if (parsed.data.cursor) {
        const cursorDate = new Date(parsed.data.cursor.t);
        conditions.push(
          or(
            lt(schema.userLocationFavorites.createdAt, cursorDate),
            and(
              eq(schema.userLocationFavorites.createdAt, cursorDate),
              lt(
                schema.userLocationFavorites.locationId,
                parsed.data.cursor.id,
              ),
            ),
          )!,
        );
      }

      const rows = await db
        .select({
          createdAt: schema.userLocationFavorites.createdAt,
          location: schema.locations,
        })
        .from(schema.userLocationFavorites)
        .innerJoin(
          schema.locations,
          eq(schema.userLocationFavorites.locationId, schema.locations.id),
        )
        .innerJoin(
          schema.region,
          eq(schema.region.id, schema.locations.regionId),
        )
        .where(and(...conditions))
        .orderBy(
          desc(schema.userLocationFavorites.createdAt),
          desc(schema.userLocationFavorites.locationId),
        )
        .limit(parsed.data.limit + 1);

      const hasMore = rows.length > parsed.data.limit;
      const items = rows.slice(0, parsed.data.limit);
      const last = hasMore ? items.at(-1) : undefined;
      c.header("Cache-Control", "no-store");
      return c.json(
        {
          success: true as const,
          data: {
            items: items.map((item) => ({
              createdAt: item.createdAt.toISOString(),
              location: {
                ...item.location,
                createdAt: item.location.createdAt.toISOString(),
                updatedAt: item.location.updatedAt.toISOString(),
              },
            })),
            nextCursor: last
              ? encodeContentCursor({
                  t: last.createdAt.getTime(),
                  id: last.location.id,
                })
              : null,
          },
        },
        200,
      );
    } catch (error) {
      return databaseErrorResponse(c, "listLocations", error);
    }
  },
  validationHook("查询参数无效", "flatten"),
);

favorites.openapi(
  createRoute({
    method: "post",
    path: "/locations",
    operationId: "favoritesCreatelocations",
    tags: ["favorites"],
    summary: "Favorite a location",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [favoriteSession, legacyJsonBody("输入验证失败")],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: locationBody } },
      },
    },
    responses: {
      201: jsonResponse(
        SuccessSchema.extend({
          data: z.object({
            locationId: z.string(),
            createdAt: TimestampSchema,
          }),
        }),
        "Created",
      ),
      ...errorResponses(400, 401, 404, 409, 422, 403, 503),
    },
  }),
  async (c) => {
    const session = c.get("session");

    const input = c.req.valid("json");

    try {
      const now = Date.now();
      const result = await c.env.DB.prepare(
        `
      INSERT OR IGNORE INTO user_location_favorites
        (user_id, location_id, created_at)
      SELECT ?, location.id, ?
      FROM locations AS location
      INNER JOIN region ON region.id = location.region_id
      WHERE location.id = ?
        AND location.status = 'published'
        AND region.level = 'city'
        AND region.service_enabled = 1
    `,
      )
        .bind(session.user.id, now, input.locationId)
        .run();
      if (changes(result) !== 1) {
        const db = createDb(c.env.DB);
        const [target] = await db
          .select({ id: schema.locations.id })
          .from(schema.locations)
          .innerJoin(
            schema.region,
            eq(schema.region.id, schema.locations.regionId),
          )
          .where(
            and(
              eq(schema.locations.id, input.locationId),
              eq(schema.locations.status, "published"),
              eq(schema.region.level, "city"),
              eq(schema.region.serviceEnabled, true),
            ),
          )
          .limit(1);
        if (!target) return c.json(APIErrors.notFound("地点不存在"), 404);
        return c.json(APIErrors.conflict("已经收藏该地点"), 409);
      }

      return c.json(
        {
          success: true as const,
          data: {
            locationId: input.locationId,
            createdAt: new Date(now).toISOString(),
          },
        },
        201,
      );
    } catch (error) {
      return databaseErrorResponse(c, "createLocation", error);
    }
  },
  validationHook("输入验证失败", "flatten"),
);

favorites.openapi(
  createRoute({
    method: "delete",
    path: "/locations",
    operationId: "favoritesDeletelocations",
    tags: ["favorites"],
    summary: "Remove location favorite",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [favoriteSession],
    request: { query: locationDeleteQuery },
    responses: {
      200: jsonResponse(
        SuccessSchema.extend({
          data: z.object({ locationId: z.string(), removed: z.boolean() }),
        }),
        "Success",
      ),
      ...errorResponses(400, 401, 409, 422, 403, 503),
    },
  }),
  async (c) => {
    const session = c.get("session");

    const input = c.req.valid("query");

    try {
      const result = await c.env.DB.prepare(
        `
      DELETE FROM user_location_favorites
      WHERE user_id = ? AND location_id = ?
    `,
      )
        .bind(session.user.id, input.locationId)
        .run();
      return c.json(
        {
          success: true as const,
          data: {
            locationId: input.locationId,
            removed: changes(result) === 1,
          },
        },
        200,
      );
    } catch (error) {
      return databaseErrorResponse(c, "deleteLocation", error);
    }
  },
  validationHook("查询参数无效", "flatten"),
);

favorites.openapi(
  createRoute({
    method: "get",
    path: "/stories",
    operationId: "favoritesListstories",
    tags: ["favorites"],
    summary: "List favorite stories",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [favoriteSession],
    request: { query: listQuery },
    responses: {
      200: jsonResponse(FavoriteStoriesResponseSchema, "Success"),
      ...errorResponses(400, 401, 409, 422),
    },
  }),
  async (c) => {
    const session = c.get("session");

    const parsed = parseListQuery(c, c.req.valid("query"));
    if (parsed.error) return parsed.error;

    try {
      const db = createDb(c.env.DB);
      const conditions = [
        eq(schema.userStoryFavorites.userId, session.user.id),
        eq(schema.stories.status, "published"),
        or(
          isNull(schema.stories.locationId),
          and(
            eq(schema.locations.status, "published"),
            eq(schema.region.level, "city"),
            eq(schema.region.serviceEnabled, true),
          ),
        )!,
      ];
      if (parsed.data.cursor) {
        const cursorDate = new Date(parsed.data.cursor.t);
        conditions.push(
          or(
            lt(schema.userStoryFavorites.createdAt, cursorDate),
            and(
              eq(schema.userStoryFavorites.createdAt, cursorDate),
              lt(schema.userStoryFavorites.storyId, parsed.data.cursor.id),
            ),
          )!,
        );
      }

      const rows = await db
        .select({
          createdAt: schema.userStoryFavorites.createdAt,
          story: schema.stories,
        })
        .from(schema.userStoryFavorites)
        .innerJoin(
          schema.stories,
          eq(schema.userStoryFavorites.storyId, schema.stories.id),
        )
        .leftJoin(
          schema.locations,
          eq(schema.locations.id, schema.stories.locationId),
        )
        .leftJoin(
          schema.region,
          eq(schema.region.id, schema.locations.regionId),
        )
        .where(and(...conditions))
        .orderBy(
          desc(schema.userStoryFavorites.createdAt),
          desc(schema.userStoryFavorites.storyId),
        )
        .limit(parsed.data.limit + 1);

      const hasMore = rows.length > parsed.data.limit;
      const items = rows.slice(0, parsed.data.limit);
      const last = hasMore ? items.at(-1) : undefined;
      c.header("Cache-Control", "no-store");
      return c.json(
        {
          success: true as const,
          data: {
            items: items.map((item) => ({
              createdAt: item.createdAt.toISOString(),
              story: {
                ...item.story,
                createdAt: item.story.createdAt.toISOString(),
                updatedAt: item.story.updatedAt.toISOString(),
              },
            })),
            nextCursor: last
              ? encodeContentCursor({
                  t: last.createdAt.getTime(),
                  id: last.story.id,
                })
              : null,
          },
        },
        200,
      );
    } catch (error) {
      return databaseErrorResponse(c, "listStories", error);
    }
  },
  validationHook("查询参数无效", "flatten"),
);

favorites.openapi(
  createRoute({
    method: "post",
    path: "/stories",
    operationId: "favoritesCreatestories",
    tags: ["favorites"],
    summary: "Favorite a story",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [favoriteSession, legacyJsonBody("输入验证失败")],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: storyBody } },
      },
    },
    responses: {
      201: jsonResponse(
        SuccessSchema.extend({
          data: z.object({ storyId: z.string(), createdAt: TimestampSchema }),
        }),
        "Created",
      ),
      ...errorResponses(400, 401, 404, 409, 422, 403, 503),
    },
  }),
  async (c) => {
    const session = c.get("session");

    const input = c.req.valid("json");

    try {
      const now = Date.now();
      const result = await c.env.DB.prepare(
        `
      INSERT OR IGNORE INTO user_story_favorites
        (user_id, story_id, created_at)
      SELECT ?, story.id, ?
      FROM stories AS story
      LEFT JOIN locations AS location ON location.id = story.location_id
      LEFT JOIN region ON region.id = location.region_id
      WHERE story.id = ?
        AND story.status = 'published'
        AND (
          story.location_id IS NULL
          OR (
            location.status = 'published'
            AND region.level = 'city'
            AND region.service_enabled = 1
          )
        )
    `,
      )
        .bind(session.user.id, now, input.storyId)
        .run();
      if (changes(result) !== 1) {
        const db = createDb(c.env.DB);
        const [publicTarget] = await db
          .select({ id: schema.stories.id })
          .from(schema.stories)
          .leftJoin(
            schema.locations,
            eq(schema.locations.id, schema.stories.locationId),
          )
          .leftJoin(
            schema.region,
            eq(schema.region.id, schema.locations.regionId),
          )
          .where(
            and(
              eq(schema.stories.id, input.storyId),
              eq(schema.stories.status, "published"),
              or(
                isNull(schema.stories.locationId),
                and(
                  eq(schema.locations.status, "published"),
                  eq(schema.region.level, "city"),
                  eq(schema.region.serviceEnabled, true),
                ),
              ),
            ),
          )
          .limit(1);
        if (!publicTarget) return c.json(APIErrors.notFound("故事不存在"), 404);
        return c.json(APIErrors.conflict("已经收藏该故事"), 409);
      }

      return c.json(
        {
          success: true as const,
          data: {
            storyId: input.storyId,
            createdAt: new Date(now).toISOString(),
          },
        },
        201,
      );
    } catch (error) {
      return databaseErrorResponse(c, "createStory", error);
    }
  },
  validationHook("输入验证失败", "flatten"),
);

favorites.openapi(
  createRoute({
    method: "delete",
    path: "/stories",
    operationId: "favoritesDeletestories",
    tags: ["favorites"],
    summary: "Remove story favorite",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [favoriteSession],
    request: { query: storyDeleteQuery },
    responses: {
      200: jsonResponse(
        SuccessSchema.extend({
          data: z.object({ storyId: z.string(), removed: z.boolean() }),
        }),
        "Success",
      ),
      ...errorResponses(400, 401, 409, 422, 403, 503),
    },
  }),
  async (c) => {
    const session = c.get("session");

    const input = c.req.valid("query");

    try {
      const result = await c.env.DB.prepare(
        `
      DELETE FROM user_story_favorites
      WHERE user_id = ? AND story_id = ?
    `,
      )
        .bind(session.user.id, input.storyId)
        .run();
      return c.json(
        {
          success: true as const,
          data: {
            storyId: input.storyId,
            removed: changes(result) === 1,
          },
        },
        200,
      );
    } catch (error) {
      return databaseErrorResponse(c, "deleteStory", error);
    }
  },
  validationHook("查询参数无效", "flatten"),
);

export { favorites as favoritesRoute };
