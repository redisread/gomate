import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
} from "drizzle-orm";
import type { Story as StoryDto } from "@/contracts";
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
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";
import {
  deleteR2ObjectsWithRetry,
  getR2PublicBaseUrl,
} from "../lib/r2-media";
import {
  createStoryTagUpdateBatch,
  createStoryTagWriteStatements,
} from "../lib/story-tag-write";

const stories = new Hono<{ Bindings: Env }>();

type StoriesContext = Context<{ Bindings: Env }>;

const MAX_IMAGES = 9;
const MAX_TAGS = 10;
const ALLOWED_IMAGE_HOSTS = new Set([
  "gomate.cos.jiahongw.com",
  "cdn.discordapp.com",
]);
const ALLOWED_IMAGE_SUFFIXES = [
  ".githubusercontent.com",
  ".googleusercontent.com",
];

function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (ALLOWED_IMAGE_HOSTS.has(url.hostname) ||
        ALLOWED_IMAGE_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix)))
    );
  } catch {
    return false;
  }
}

const imageSchema = z
  .string()
  .url("图片必须是有效 URL")
  .refine(isAllowedImageUrl, "图片必须使用受信任域名的 HTTPS URL");

const imagesSchema = z
  .array(imageSchema)
  .max(MAX_IMAGES, `最多 ${MAX_IMAGES} 张图片`)
  .transform((images) => [...new Set(images)]);

const imageKeysSchema = z
  .array(z.string().trim().min(1).max(512))
  .max(MAX_IMAGES, `最多 ${MAX_IMAGES} 张图片`)
  .transform((keys) => [...new Set(keys)]);

const tagsSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(MAX_TAGS, `最多 ${MAX_TAGS} 个标签`)
  .transform((tags) => [...new Set(tags)]);

const createStoryInput = z
  .object({
    teamId: z.string().trim().min(1).max(200).optional(),
    locationId: z.string().trim().min(1).max(200).optional(),
    title: z.string().trim().min(1).max(120).optional(),
    summary: z.string().trim().min(1).max(300).nullable().optional(),
    content: z.string().trim().min(1).max(20_000),
    imageKeys: imageKeysSchema.optional(),
    status: z.enum(["draft", "published"]).default("published"),
    tags: tagsSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.teamId && !value.title) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "普通故事必须提供标题",
      });
    }
  });

const updateStoryInput = z
  .object({
    locationId: z.string().trim().min(1).max(200).nullable().optional(),
    title: z.string().trim().min(1).max(120).nullable().optional(),
    summary: z.string().trim().min(1).max(300).nullable().optional(),
    content: z.string().trim().min(1).max(20_000).optional(),
    images: imagesSchema.optional(),
    status: z.enum(["draft", "published", "hidden"]).optional(),
    tags: tagsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "至少提供一个要更新的字段",
  });

const listStoriesQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(20).default(10),
    cursor: z.string().max(512).optional(),
    tag: z.string().trim().min(1).max(50).optional(),
    locationId: z.string().trim().min(1).max(200).optional(),
    teamId: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["published", "draft"]).default("published"),
  })
  .strict();

const idQuery = z.string().trim().min(1).max(200);

function changes(result: D1Result<unknown> | undefined): number {
  return Number(result?.meta?.changes ?? 0);
}

function publicStoryLocationCondition() {
  return or(
    isNull(schema.stories.locationId),
    and(
      eq(schema.locations.status, "published"),
      eq(schema.region.level, "city"),
      eq(schema.region.serviceEnabled, true),
    ),
  )!;
}

async function findPublicLocation(
  db: ReturnType<typeof createDb>,
  locationId: string,
) {
  const [location] = await db
    .select({ id: schema.locations.id })
    .from(schema.locations)
    .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
    .where(
      and(
        eq(schema.locations.id, locationId),
        eq(schema.locations.status, "published"),
        eq(schema.region.level, "city"),
        eq(schema.region.serviceEnabled, true),
      ),
    )
    .limit(1);
  return location ?? null;
}

class StoryMediaError extends Error {
  constructor(
    readonly clientMessage: string,
    readonly status: 400 | 500,
  ) {
    super(clientMessage);
    this.name = "StoryMediaError";
  }
}

function isOwnedTempStoryKey(key: string, userId: string): boolean {
  const prefix = `temp/stories/${userId}/`;
  if (!key.startsWith(prefix)) return false;
  const filename = key.slice(prefix.length);
  return /^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|gif|webp)$/u.test(filename);
}

function getOwnedFinalStoryKey(
  env: Env,
  storyId: string,
  imageUrl: string,
): string | null {
  const publicBaseUrl = getR2PublicBaseUrl(env);
  if (!publicBaseUrl) return null;

  const prefix = `${publicBaseUrl}/stories/${storyId}/`;
  if (!imageUrl.startsWith(prefix)) return null;
  const filename = imageUrl.slice(prefix.length);
  if (!/^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|gif|webp)$/u.test(filename)) {
    return null;
  }
  return `stories/${storyId}/${filename}`;
}

function scheduleR2Delete(c: StoriesContext, keys: string[]) {
  const uniqueKeys = [...new Set(keys)];
  if (!c.env.R2 || uniqueKeys.length === 0) return;
  c.executionCtx.waitUntil(
    deleteR2ObjectsWithRetry(c.env.R2, uniqueKeys).catch((error: unknown) => {
      logger.error("story_media_compensation_failed", {
        errorType: error instanceof Error ? error.name : "UnknownR2Error",
      });
    }),
  );
}

async function copyTempStoryImages(
  c: StoriesContext,
  storyId: string,
  tempKeys: string[],
  finalKeys: string[],
): Promise<string[]> {
  if (tempKeys.length === 0) return [];
  const publicBaseUrl = getR2PublicBaseUrl(c.env);
  if (!c.env.R2 || !publicBaseUrl) {
    throw new StoryMediaError("图片存储未配置", 500);
  }

  try {
    for (const tempKey of tempKeys) {
      const object = await c.env.R2.get(tempKey);
      if (!object) throw new StoryMediaError("临时图片不存在或已过期", 400);

      const filename = tempKey.slice(tempKey.lastIndexOf("/") + 1);
      const finalKey = `stories/${storyId}/${filename}`;
      finalKeys.push(finalKey);
      await c.env.R2.put(finalKey, object.body, {
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata,
      });
    }
  } catch (error) {
    if (error instanceof StoryMediaError) throw error;
    throw new StoryMediaError("图片归档失败", 500);
  }

  return finalKeys.map((key) => `${publicBaseUrl}/${key}`);
}

type StoryDatabaseOperation =
  | "create"
  | "delete"
  | "get"
  | "getStats"
  | "getTags"
  | "list"
  | "toggleLike"
  | "update";

function logDatabaseFailure(
  operation: StoryDatabaseOperation,
  error: unknown,
) {
  const metadata = {
    errorType: error instanceof Error ? error.name : "UnknownDatabaseError",
  };

  switch (operation) {
    case "create":
      logger.error("story_create_failed", metadata);
      break;
    case "delete":
      logger.error("story_delete_failed", metadata);
      break;
    case "get":
      logger.error("story_get_failed", metadata);
      break;
    case "getStats":
      logger.error("story_stats_get_failed", metadata);
      break;
    case "getTags":
      logger.error("story_tags_get_failed", metadata);
      break;
    case "list":
      logger.error("stories_list_failed", metadata);
      break;
    case "toggleLike":
      logger.error("story_like_toggle_failed", metadata);
      break;
    case "update":
      logger.error("story_update_failed", metadata);
      break;
  }
}

function databaseErrorResponse(
  c: StoriesContext,
  operation: StoryDatabaseOperation,
  error: unknown,
) {
  logDatabaseFailure(operation, error);
  const mapped = mapDatabaseError(error);
  return c.json(mapped.body, mapped.status);
}

async function getSession(c: StoriesContext) {
  return getActiveSession(c.env, c.req.raw.headers);
}

async function getOptionalSession(c: StoriesContext) {
  return getSession(c).catch(() => null);
}

function isAdminSession(
  session: Awaited<ReturnType<typeof getSession>>,
): boolean {
  return (session?.user as { role?: unknown } | undefined)?.role === "admin";
}

function canManageStory(
  session: Awaited<ReturnType<typeof getSession>>,
  story: schema.Story,
): boolean {
  return Boolean(
    session && (session.user.id === story.authorId || isAdminSession(session)),
  );
}

async function readJson(c: StoriesContext): Promise<unknown> {
  return c.req.json().catch(() => null);
}

async function loadTagsByStoryIds(
  db: ReturnType<typeof createDb>,
  storyIds: string[],
) {
  const tagsByStory = new Map<string, schema.Tag[]>();
  if (storyIds.length === 0) return tagsByStory;

  const rows = await db
    .select({ storyId: schema.storyTags.storyId, tag: schema.tags })
    .from(schema.storyTags)
    .innerJoin(schema.tags, eq(schema.storyTags.tagId, schema.tags.id))
    .where(inArray(schema.storyTags.storyId, storyIds))
    .orderBy(schema.tags.name);

  for (const { storyId, tag } of rows) {
    const existing = tagsByStory.get(storyId) ?? [];
    existing.push(tag);
    tagsByStory.set(storyId, existing);
  }
  return tagsByStory;
}

async function loadLikedStoryIds(
  db: ReturnType<typeof createDb>,
  userId: string | undefined,
  storyIds: string[],
) {
  if (!userId || storyIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ storyId: schema.storyLikes.storyId })
    .from(schema.storyLikes)
    .where(
      and(
        eq(schema.storyLikes.userId, userId),
        inArray(schema.storyLikes.storyId, storyIds),
      ),
    );
  return new Set(rows.map(({ storyId }) => storyId));
}

interface StoryRelations {
  author: {
    id: string;
    name: string;
    nickname: string | null;
    image: string | null;
  } | null;
  location: { id: string; name: string; slug: string } | null;
  team: { id: string; title: string } | null;
}

function toStoryResponse(
  story: schema.Story,
  relations: StoryRelations,
  tags: schema.Tag[],
  isLiked: boolean,
): StoryDto {
  return {
    id: story.id,
    authorId: story.authorId,
    teamId: story.teamId,
    locationId: story.locationId,
    title: story.title,
    summary: story.summary,
    content: story.content,
    images: story.images,
    status: story.status,
    viewCount: story.viewCount,
    likeCount: story.likeCount,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
    displayTitle:
      story.title ?? relations.team?.title ?? story.content.slice(0, 60),
    author: relations.author
      ? {
          id: relations.author.id,
          name: relations.author.nickname ?? relations.author.name,
          image: relations.author.image,
        }
      : null,
    location: relations.location,
    team: relations.team,
    tags: tags.map(({ id, name, slug }) => ({ id, name, slug })),
    isLiked,
  };
}

stories.get("/stats", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

    const [{ total: weeklyNewStories }] = await db
      .select({ total: count() })
      .from(schema.stories)
      .leftJoin(schema.locations, eq(schema.locations.id, schema.stories.locationId))
      .leftJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .where(
        and(
          eq(schema.stories.status, "published"),
          publicStoryLocationCondition(),
          gte(schema.stories.createdAt, weekStart),
        ),
      );

    const popular = await db
      .select({
        locationId: schema.stories.locationId,
        locationName: schema.locations.name,
        locationSlug: schema.locations.slug,
        storyCount: count(),
      })
      .from(schema.stories)
      .leftJoin(schema.locations, eq(schema.locations.id, schema.stories.locationId))
      .leftJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .where(
        and(
          eq(schema.stories.status, "published"),
          publicStoryLocationCondition(),
          isNotNull(schema.stories.locationId),
        ),
      )
      .groupBy(
        schema.stories.locationId,
        schema.locations.name,
        schema.locations.slug,
      )
      .orderBy(desc(count()))
      .limit(1);

    const popularLocation = popular[0]?.locationId
      ? {
          id: popular[0].locationId,
          name: popular[0].locationName,
          slug: popular[0].locationSlug,
        }
      : null;

    return c.json({
      success: true,
      data: {
        weeklyNewStories,
        popularLocation: popularLocation
          ? { ...popularLocation, storyCount: popular[0].storyCount }
          : null,
      },
    });
  } catch (error) {
    return databaseErrorResponse(c, "getStats", error);
  }
});

stories.get("/tags", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const items = await db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        slug: schema.tags.slug,
        count: count(),
      })
      .from(schema.tags)
      .innerJoin(schema.storyTags, eq(schema.tags.id, schema.storyTags.tagId))
      .innerJoin(
        schema.stories,
        eq(schema.storyTags.storyId, schema.stories.id),
      )
      .leftJoin(schema.locations, eq(schema.locations.id, schema.stories.locationId))
      .leftJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .where(
        and(
          eq(schema.stories.status, "published"),
          publicStoryLocationCondition(),
        ),
      )
      .groupBy(schema.tags.id, schema.tags.name, schema.tags.slug)
      .orderBy(desc(count()), schema.tags.name)
      .limit(15);

    return c.json({ success: true, data: { items } });
  } catch (error) {
    return databaseErrorResponse(c, "getTags", error);
  }
});

stories.get("/", async (c) => {
  const parsed = listStoriesQuery.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json(
      APIErrors.validationError("查询参数无效", parsed.error.flatten()),
      400,
    );
  }

  const cursor = parsed.data.cursor
    ? decodeContentCursor(parsed.data.cursor)
    : null;
  if (parsed.data.cursor && !cursor) {
    return c.json(APIErrors.validationError("游标无效"), 400);
  }

  const session = await getOptionalSession(c);
  if (parsed.data.status === "draft" && !session) {
    return c.json(APIErrors.unauthorized("请先登录"), 401);
  }

  try {
    const db = createDb(c.env.DB);
    const conditions = [
      eq(schema.stories.status, parsed.data.status),
      publicStoryLocationCondition(),
    ];
    if (parsed.data.status === "draft" && session) {
      conditions.push(eq(schema.stories.authorId, session.user.id));
    }
    if (parsed.data.locationId) {
      conditions.push(eq(schema.stories.locationId, parsed.data.locationId));
    }
    if (parsed.data.teamId) {
      conditions.push(eq(schema.stories.teamId, parsed.data.teamId));
    }
    if (cursor) {
      const cursorDate = new Date(cursor.t);
      conditions.push(
        or(
          lt(schema.stories.createdAt, cursorDate),
          and(
            eq(schema.stories.createdAt, cursorDate),
            lt(schema.stories.id, cursor.id),
          ),
        )!,
      );
    }
    if (parsed.data.tag) {
      const matchingStoryIds = db
        .select({ storyId: schema.storyTags.storyId })
        .from(schema.storyTags)
        .innerJoin(schema.tags, eq(schema.storyTags.tagId, schema.tags.id))
        .where(eq(schema.tags.name, parsed.data.tag));
      conditions.push(inArray(schema.stories.id, matchingStoryIds));
    }

    const rows = await db
      .select({
        story: schema.stories,
        author: {
          id: schema.users.id,
          name: schema.users.name,
          nickname: schema.users.nickname,
          image: schema.users.image,
        },
        location: {
          id: schema.locations.id,
          name: schema.locations.name,
          slug: schema.locations.slug,
        },
        team: { id: schema.teams.id, title: schema.teams.title },
      })
      .from(schema.stories)
      .innerJoin(schema.users, eq(schema.stories.authorId, schema.users.id))
      .leftJoin(
        schema.locations,
        eq(schema.stories.locationId, schema.locations.id),
      )
      .leftJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .leftJoin(schema.teams, eq(schema.stories.teamId, schema.teams.id))
      .where(and(...conditions))
      .orderBy(desc(schema.stories.createdAt), desc(schema.stories.id))
      .limit(parsed.data.limit + 1);

    const hasMore = rows.length > parsed.data.limit;
    const pageRows = rows.slice(0, parsed.data.limit);
    const storyIds = pageRows.map(({ story }) => story.id);
    const [tagsByStory, likedStoryIds] = await Promise.all([
      loadTagsByStoryIds(db, storyIds),
      loadLikedStoryIds(db, session?.user.id, storyIds),
    ]);
    const items = pageRows.map(({ story, author, location, team }) =>
      toStoryResponse(
        story,
        { author, location, team },
        tagsByStory.get(story.id) ?? [],
        likedStoryIds.has(story.id),
      ),
    );
    const last = hasMore ? pageRows.at(-1)?.story : undefined;

    c.header("Cache-Control", "no-store");
    return c.json({
      success: true,
      data: {
        items,
        nextCursor: last
          ? encodeContentCursor({ t: last.createdAt.getTime(), id: last.id })
          : null,
      },
    });
  } catch (error) {
    return databaseErrorResponse(c, "list", error);
  }
});

stories.get("/:id", async (c) => {
  const id = idQuery.safeParse(c.req.param("id"));
  if (!id.success)
    return c.json(APIErrors.validationError("故事 ID 无效"), 400);

  try {
    const db = createDb(c.env.DB);
    const session = await getOptionalSession(c);
    const row = await db
      .select({
        story: schema.stories,
        author: {
          id: schema.users.id,
          name: schema.users.name,
          nickname: schema.users.nickname,
          image: schema.users.image,
        },
        location: {
          id: schema.locations.id,
          name: schema.locations.name,
          slug: schema.locations.slug,
        },
        team: { id: schema.teams.id, title: schema.teams.title },
      })
      .from(schema.stories)
      .innerJoin(schema.users, eq(schema.stories.authorId, schema.users.id))
      .leftJoin(
        schema.locations,
        eq(schema.stories.locationId, schema.locations.id),
      )
      .leftJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .leftJoin(schema.teams, eq(schema.stories.teamId, schema.teams.id))
      .where(
        and(
          eq(schema.stories.id, id.data),
          publicStoryLocationCondition(),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (
      !row ||
      row.story.status === "hidden" ||
      (row.story.status === "draft" && !canManageStory(session, row.story))
    ) {
      return c.json(APIErrors.notFound("故事不存在"), 404);
    }

    const story = row.story;

    const [tagsByStory, likedStoryIds] = await Promise.all([
      loadTagsByStoryIds(db, [story.id]),
      loadLikedStoryIds(db, session?.user.id, [story.id]),
    ]);
    c.header("Cache-Control", "no-store");
    return c.json({
      success: true,
      data: toStoryResponse(
        story,
        { author: row.author, location: row.location, team: row.team },
        tagsByStory.get(story.id) ?? [],
        likedStoryIds.has(story.id),
      ),
    });
  } catch (error) {
    return databaseErrorResponse(c, "get", error);
  }
});

stories.post("/", async (c) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

  const parsed = createStoryInput.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json(
      APIErrors.validationError("输入验证失败", parsed.error.flatten()),
      400,
    );
  }

  const tempKeys = parsed.data.imageKeys ?? [];
  if (tempKeys.some((key) => !isOwnedTempStoryKey(key, session.user.id))) {
    return c.json(APIErrors.forbidden("只能使用当前用户上传的临时图片"), 403);
  }

  const storyId = generateId();
  const finalKeys: string[] = [];
  let copyStarted = false;

  try {
    const db = createDb(c.env.DB);
    const input = parsed.data;
    let recapTeam: schema.Team | undefined;
    let locationId = input.locationId ?? null;

    if (input.teamId) {
      recapTeam = await db.query.teams.findFirst({
        where: eq(schema.teams.id, input.teamId),
      });
      if (!recapTeam) return c.json(APIErrors.notFound("队伍不存在"), 404);

      const authorized =
        recapTeam.leaderId === session.user.id ||
        Boolean(
          await db.query.teamMembers.findFirst({
            where: and(
              eq(schema.teamMembers.teamId, recapTeam.id),
              eq(schema.teamMembers.userId, session.user.id),
              isNull(schema.teamMembers.leftAt),
            ),
            columns: { userId: true },
          }),
        );
      if (!authorized) {
        return c.json(
          APIErrors.forbidden("只有队长或活动成员可以发布回顾"),
          403,
        );
      }
      if (!recapTeam.formedAt) {
        return c.json(APIErrors.conflict("队伍尚未成行"), 409);
      }
      if (recapTeam.cancelledAt) {
        return c.json(APIErrors.conflict("已取消的队伍不能发布回顾"), 409);
      }
      if (recapTeam.endAt.getTime() > Date.now()) {
        return c.json(APIErrors.conflict("活动结束后才能发布回顾"), 409);
      }
      if (input.locationId && input.locationId !== recapTeam.locationId) {
        return c.json(APIErrors.conflict("回顾地点必须与队伍地点一致"), 409);
      }
      locationId = recapTeam.locationId;
    }
    if (locationId && !(await findPublicLocation(db, locationId))) {
      return c.json(APIErrors.notFound("地点不存在"), 404);
    }

    const now = Date.now();
    const tags = input.tags ?? [];
    copyStarted = tempKeys.length > 0;
    let images: string[];
    try {
      images = await copyTempStoryImages(c, storyId, tempKeys, finalKeys);
    } catch (error) {
      if (copyStarted) scheduleR2Delete(c, [...finalKeys, ...tempKeys]);
      if (error instanceof StoryMediaError) {
        if (error.status === 400) {
          return c.json(APIErrors.badRequest(error.clientMessage), 400);
        }
        logger.error("story_media_archive_failed", {
          errorType: error.name,
        });
        return c.json(APIErrors.internalError(error.clientMessage), 500);
      }
      return c.json(APIErrors.internalError("图片归档失败"), 500);
    }

    const insertStory = recapTeam
      ? c.env.DB.prepare(
          `
          INSERT INTO stories (
            id, author_id, team_id, location_id, title, summary, content,
            images, status, view_count, like_count, created_at, updated_at
          )
          SELECT ?, ?, t.id, t.location_id, ?, ?, ?, ?, ?, 0, 0, ?, ?
          FROM teams AS t
          INNER JOIN locations AS location ON location.id = t.location_id
          INNER JOIN region ON region.id = location.region_id
          WHERE t.id = ?
            AND t.formed_at IS NOT NULL
            AND t.cancelled_at IS NULL
            AND t.end_at <= ?
            AND t.location_id = ?
            AND location.status = 'published'
            AND region.level = 'city'
            AND region.service_enabled = 1
            AND (
              t.leader_id = ?
              OR EXISTS (
                SELECT 1 FROM team_members AS active
                WHERE active.team_id = t.id
                  AND active.user_id = ?
                  AND active.left_at IS NULL
              )
            )
        `,
        ).bind(
          storyId,
          session.user.id,
          input.title ?? null,
          input.summary ?? null,
          input.content,
          JSON.stringify(images),
          input.status,
          now,
          now,
          recapTeam.id,
          now,
          locationId,
          session.user.id,
          session.user.id,
        )
      : locationId
        ? c.env.DB.prepare(
            `
            INSERT INTO stories (
              id, author_id, team_id, location_id, title, summary, content,
              images, status, view_count, like_count, created_at, updated_at
            )
            SELECT ?, ?, NULL, location.id, ?, ?, ?, ?, ?, 0, 0, ?, ?
            FROM locations AS location
            INNER JOIN region ON region.id = location.region_id
            WHERE location.id = ?
              AND location.status = 'published'
              AND region.level = 'city'
              AND region.service_enabled = 1
          `,
          ).bind(
            storyId,
            session.user.id,
            input.title,
            input.summary ?? null,
            input.content,
            JSON.stringify(images),
            input.status,
            now,
            now,
            locationId,
          )
        : c.env.DB.prepare(
          `
          INSERT INTO stories (
            id, author_id, team_id, location_id, title, summary, content,
            images, status, view_count, like_count, created_at, updated_at
          ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        `,
        ).bind(
          storyId,
          session.user.id,
          input.title,
          input.summary ?? null,
          input.content,
          JSON.stringify(images),
          input.status,
          now,
          now,
        );

    const results = await c.env.DB.batch([
      insertStory,
      ...createStoryTagWriteStatements(c.env.DB, { storyId, tags, now }),
    ]);
    if (changes(results[0]) !== 1) {
      if (copyStarted) scheduleR2Delete(c, [...finalKeys, ...tempKeys]);
      return c.json(
        APIErrors.conflict("故事关联状态已变化，未创建故事"),
        409,
      );
    }

    if (tempKeys.length > 0) scheduleR2Delete(c, tempKeys);
    return c.json({ success: true, data: { id: storyId } }, 201);
  } catch (error) {
    if (copyStarted) scheduleR2Delete(c, [...finalKeys, ...tempKeys]);
    return databaseErrorResponse(c, "create", error);
  }
});

stories.put("/:id", async (c) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

  const id = idQuery.safeParse(c.req.param("id"));
  const parsed = updateStoryInput.safeParse(await readJson(c));
  if (!id.success || !parsed.success) {
    return c.json(
      APIErrors.validationError(
        "输入验证失败",
        parsed.success ? undefined : parsed.error.flatten(),
      ),
      400,
    );
  }

  try {
    const db = createDb(c.env.DB);
    const story = await db.query.stories.findFirst({
      where: eq(schema.stories.id, id.data),
    });
    if (!story) return c.json(APIErrors.notFound("故事不存在"), 404);
    if (!canManageStory(session, story)) {
      return c.json(APIErrors.forbidden("无权修改该故事"), 403);
    }

    const input = parsed.data;
    if (
      input.images &&
      input.images.some((image) => !story.images.includes(image))
    ) {
      return c.json(
        APIErrors.validationError("编辑时只能保留或删除故事已有图片"),
        400,
      );
    }
    if (!story.teamId && input.title === null) {
      return c.json(APIErrors.validationError("普通故事标题不能为空"), 400);
    }
    if (story.teamId && input.locationId !== undefined) {
      const team = await db.query.teams.findFirst({
        where: eq(schema.teams.id, story.teamId),
        columns: { locationId: true },
      });
      if (!team || input.locationId !== team.locationId) {
        return c.json(APIErrors.conflict("回顾地点必须与队伍地点一致"), 409);
      }
    }
    if (!story.teamId && input.locationId) {
      const location = await findPublicLocation(db, input.locationId);
      if (!location) return c.json(APIErrors.notFound("地点不存在"), 404);
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    const addField = (column: string, value: unknown) => {
      fields.push(`${column} = ?`);
      values.push(value);
    };
    if (input.locationId !== undefined)
      addField("location_id", input.locationId);
    if (input.title !== undefined) addField("title", input.title);
    if (input.summary !== undefined) addField("summary", input.summary);
    if (input.content !== undefined) addField("content", input.content);
    if (input.images !== undefined)
      addField("images", JSON.stringify(input.images));
    if (input.status !== undefined) addField("status", input.status);
    const now = Date.now();
    addField("updated_at", now);
    values.push(story.id);

    let locationVisibility = "";
    if (input.locationId === undefined) {
      locationVisibility = `
        AND (
          location_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM locations AS location
            INNER JOIN region ON region.id = location.region_id
            WHERE location.id = stories.location_id
              AND location.status = 'published'
              AND region.level = 'city'
              AND region.service_enabled = 1
          )
        )
      `;
    } else if (input.locationId !== null) {
      locationVisibility = `
        AND EXISTS (
          SELECT 1
          FROM locations AS location
          INNER JOIN region ON region.id = location.region_id
          WHERE location.id = ?
            AND location.status = 'published'
            AND region.level = 'city'
            AND region.service_enabled = 1
        )
      `;
      values.push(input.locationId);
    }

    const update = c.env.DB.prepare(
      `UPDATE stories SET ${fields.join(", ")} WHERE id = ? ${locationVisibility}`,
    ).bind(...values);
    const statements = input.tags === undefined
      ? [update]
      : createStoryTagUpdateBatch(c.env.DB, update, {
          storyId: story.id,
          tags: input.tags,
          now,
        });

    const results = await c.env.DB.batch(statements);
    if (changes(results[0]) !== 1) {
      return c.json(APIErrors.conflict("故事状态已变化"), 409);
    }
    if (input.images) {
      const retained = new Set(input.images);
      const removedKeys = story.images
        .filter((image) => !retained.has(image))
        .map((image) => getOwnedFinalStoryKey(c.env, story.id, image))
        .filter((key): key is string => key !== null);
      scheduleR2Delete(c, removedKeys);
    }
    return c.json({ success: true, data: { id: story.id } });
  } catch (error) {
    return databaseErrorResponse(c, "update", error);
  }
});

stories.delete("/:id", async (c) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

  const id = idQuery.safeParse(c.req.param("id"));
  if (!id.success)
    return c.json(APIErrors.validationError("故事 ID 无效"), 400);

  try {
    const db = createDb(c.env.DB);
    const story = await db.query.stories.findFirst({
      where: eq(schema.stories.id, id.data),
    });
    if (!story) return c.json(APIErrors.notFound("故事不存在"), 404);
    if (!canManageStory(session, story)) {
      return c.json(APIErrors.forbidden("无权删除该故事"), 403);
    }

    const result = await c.env.DB.prepare(
      `
      UPDATE stories SET status = 'hidden', updated_at = ? WHERE id = ?
    `,
    )
      .bind(Date.now(), story.id)
      .run();
    if (changes(result) !== 1) {
      return c.json(APIErrors.conflict("故事状态已变化"), 409);
    }

    return c.json({
      success: true,
      data: { id: story.id, status: "hidden" as const },
    });
  } catch (error) {
    return databaseErrorResponse(c, "delete", error);
  }
});

stories.post("/:id/like", async (c) => {
  const session = await getSession(c).catch(() => null);
  if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

  const id = idQuery.safeParse(c.req.param("id"));
  if (!id.success)
    return c.json(APIErrors.validationError("故事 ID 无效"), 400);

  try {
    const db = createDb(c.env.DB);
    const [story] = await db
      .select({ id: schema.stories.id })
      .from(schema.stories)
      .leftJoin(schema.locations, eq(schema.locations.id, schema.stories.locationId))
      .leftJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .where(
        and(
          eq(schema.stories.id, id.data),
          eq(schema.stories.status, "published"),
          publicStoryLocationCondition(),
        ),
      )
      .limit(1);
    if (!story) return c.json(APIErrors.notFound("故事不存在"), 404);

    const existing = await db.query.storyLikes.findFirst({
      where: and(
        eq(schema.storyLikes.userId, session.user.id),
        eq(schema.storyLikes.storyId, story.id),
      ),
      columns: { storyId: true },
    });
    const liked = !existing;
    const statement = existing
      ? c.env.DB.prepare(
          "DELETE FROM story_likes WHERE user_id = ? AND story_id = ?",
        ).bind(session.user.id, story.id)
      : c.env.DB.prepare(
          `
          INSERT INTO story_likes (user_id, story_id, created_at)
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
        ).bind(session.user.id, Date.now(), story.id);
    const result = await statement.run();
    if (changes(result) !== 1) {
      return c.json(APIErrors.conflict("点赞状态已变化，请重试"), 409);
    }

    const updated = await db.query.stories.findFirst({
      where: eq(schema.stories.id, story.id),
      columns: { likeCount: true },
    });
    return c.json({
      success: true,
      data: { liked, likeCount: updated?.likeCount ?? 0 },
    });
  } catch (error) {
    return databaseErrorResponse(c, "toggleLike", error);
  }
});

export default stories;
