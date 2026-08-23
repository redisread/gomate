import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db";
import * as schema from "../db/schema";
import { APIErrors } from "../lib/api-errors";
import type { Env } from "../lib/auth";
import { getActiveSession } from "../lib/active-session";
import {
  decodeContentCursor,
  encodeContentCursor,
} from "../lib/content-cursor";
import { mapDatabaseError } from "../lib/database-errors";
import { logger } from "../lib/logger";
import { validateRequest } from "../lib/validation";

const favorites = new Hono<{ Bindings: Env }>();

type FavoritesContext = Context<{ Bindings: Env }>;

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

async function parseListQuery(c: FavoritesContext) {
  const parsed = await validateRequest(
    c,
    "query",
    listQuery,
    "查询参数无效",
    "flatten",
  );
  if (parsed instanceof Response) return { error: parsed } as const;

  const cursor = parsed.cursor ? decodeContentCursor(parsed.cursor) : null;
  if (parsed.cursor && !cursor) {
    return {
      error: c.json(APIErrors.validationError("游标无效"), 400),
    } as const;
  }
  return { data: { ...parsed, cursor } } as const;
}

favorites.get("/locations", async (c) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

  const parsed = await parseListQuery(c);
  if ("error" in parsed) return parsed.error;

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
            lt(schema.userLocationFavorites.locationId, parsed.data.cursor.id),
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
      .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
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
    return c.json({
      success: true,
      data: {
        items,
        nextCursor: last
          ? encodeContentCursor({
              t: last.createdAt.getTime(),
              id: last.location.id,
            })
          : null,
      },
    });
  } catch (error) {
    return databaseErrorResponse(c, "listLocations", error);
  }
});

favorites.post("/locations", async (c) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

  const input = await validateRequest(
    c,
    "json",
    locationBody,
    "输入验证失败",
    "flatten",
  );
  if (input instanceof Response) return input;

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
        success: true,
        data: { locationId: input.locationId, createdAt: new Date(now) },
      },
      201,
    );
  } catch (error) {
    return databaseErrorResponse(c, "createLocation", error);
  }
});

favorites.delete("/locations", async (c) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

  const input = await validateRequest(
    c,
    "query",
    locationDeleteQuery,
    "查询参数无效",
    "flatten",
  );
  if (input instanceof Response) return input;

  try {
    const result = await c.env.DB.prepare(
      `
      DELETE FROM user_location_favorites
      WHERE user_id = ? AND location_id = ?
    `,
    )
      .bind(session.user.id, input.locationId)
      .run();
    return c.json({
      success: true,
      data: {
        locationId: input.locationId,
        removed: changes(result) === 1,
      },
    });
  } catch (error) {
    return databaseErrorResponse(c, "deleteLocation", error);
  }
});

favorites.get("/stories", async (c) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

  const parsed = await parseListQuery(c);
  if ("error" in parsed) return parsed.error;

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
      .leftJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
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
    return c.json({
      success: true,
      data: {
        items,
        nextCursor: last
          ? encodeContentCursor({
              t: last.createdAt.getTime(),
              id: last.story.id,
            })
          : null,
      },
    });
  } catch (error) {
    return databaseErrorResponse(c, "listStories", error);
  }
});

favorites.post("/stories", async (c) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

  const input = await validateRequest(
    c,
    "json",
    storyBody,
    "输入验证失败",
    "flatten",
  );
  if (input instanceof Response) return input;

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
        success: true,
        data: { storyId: input.storyId, createdAt: new Date(now) },
      },
      201,
    );
  } catch (error) {
    return databaseErrorResponse(c, "createStory", error);
  }
});

favorites.delete("/stories", async (c) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

  const input = await validateRequest(
    c,
    "query",
    storyDeleteQuery,
    "查询参数无效",
    "flatten",
  );
  if (input instanceof Response) return input;

  try {
    const result = await c.env.DB.prepare(
      `
      DELETE FROM user_story_favorites
      WHERE user_id = ? AND story_id = ?
    `,
    )
      .bind(session.user.id, input.storyId)
      .run();
    return c.json({
      success: true,
      data: {
        storyId: input.storyId,
        removed: changes(result) === 1,
      },
    });
  } catch (error) {
    return databaseErrorResponse(c, "deleteStory", error);
  }
});

export { favorites as favoritesRoute };
