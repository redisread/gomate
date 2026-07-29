/**
 * POST /v1/stories — Create a new story.
 *
 * Auth: session cookie or x-api-key.
 * Idempotency-Key: required (400 if missing). Uses Bob's idempotencyMiddleware.
 * Actor: session.user.id, actorApiKeyId set if via API key (#219).
 */
import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createAuth } from "../../../lib/auth";
import { createDb } from "../../../db";
import * as schema from "../../../db/schema";
import type { Env } from "../../../lib/auth";
import { APIErrors } from "../../../lib/api-errors";
import { generateId } from "../../../lib/id";
import { idempotencyMiddleware } from "../../../lib/idempotency";

const writeStories = new Hono<{ Bindings: Env }>();

const createStorySchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100),
  summary: z.string().min(1, "摘要不能为空").max(150),
  content: z.string().min(1, "内容不能为空").max(10000),
  coverImage: z.string().url().optional(),
  locationId: z.string().min(1, "地点ID不能为空"),
  tags: z.array(z.string()).max(10).optional(),
});

function normalizeStoryTags(tags: string[] | undefined): string[] {
  return (tags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
}

writeStories.post("/", idempotencyMiddleware, async (c) => {
  try {
    // 1. Authenticate
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    if (!session) {
      return c.json(APIErrors.unauthorized("请先登录"), 401);
    }
    const actorId = session.user.id;
    const actorApiKeyId = null; // TODO #219

    // 2. Parse body
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json(APIErrors.validationError("请求体无效"), 400);
    }
    const parsed = createStorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入无效", parsed.error.errors), 400);
    }
    const data = parsed.data;

    const db = createDb(c.env.DB);

    // 3. Verify location exists
    const location = await db.query.locations.findFirst({
      where: eq(schema.locations.id, data.locationId),
    });
    if (!location) {
      return c.json(APIErrors.notFound("地点不存在"), 404);
    }

    // 4. Create story
    const storyId = generateId();
    const now = new Date();
    const normalizedTags = normalizeStoryTags(data.tags);

    await db.insert(schema.stories).values({
      id: storyId,
      authorId: actorId,
      title: data.title.trim(),
      summary: data.summary.trim(),
      content: data.content.trim(),
      coverImage: data.coverImage,
      locationId: data.locationId,
      status: "published",
      viewCount: 0,
      likeCount: 0,
      createdAt: now,
      updatedAt: now,
      actorApiKeyId: actorApiKeyId ?? null,
    });

    // 5. Create tags (find-or-create)
    for (const tagName of normalizedTags) {
      let tag = await db.query.tags.findFirst({ where: eq(schema.tags.name, tagName) });
      if (!tag) {
        const tagId = generateId();
        await db.insert(schema.tags).values({
          id: tagId,
          name: tagName,
          type: "activity",
          createdAt: now,
        });
        tag = await db.query.tags.findFirst({ where: eq(schema.tags.id, tagId) });
      }
      if (tag) {
        await db.insert(schema.entityToTags).values({
          id: generateId(),
          entityId: storyId,
          entityType: "activity",
          tagId: tag.id,
          createdAt: now,
        });
      }
    }

    return c.json({
      success: true,
      story: {
        id: storyId,
        authorId: actorId,
        title: data.title.trim(),
        summary: data.summary.trim(),
        locationId: data.locationId,
        status: "published",
        createdAt: now.toISOString(),
      },
    }, 201);
  } catch (error) {
    console.error("[v1/stories POST] error:", error);
    return c.json(APIErrors.internalError("创建故事失败"), 500);
  }
});

export { writeStories };
