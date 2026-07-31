import { Hono } from "hono";
import { eq, ne, and, desc, sql } from "drizzle-orm";
import { createAuth } from "../../lib/auth";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { apiRateLimitMiddleware } from "../../lib/rate-limit";

const stories = new Hono<{ Bindings: Env }>();

/**
 * GET /v1/stories
 * 公开读端点：已发布故事列表。
 */
stories.get("/", apiRateLimitMiddleware("read", 600), async (c) => {
  try {
    const db = createDb(c.env.DB);

    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(20, Math.max(1, parseInt(c.req.query("pageSize") || "10", 10)));
    const locationId = c.req.query("locationId") || "";
    const offset = (page - 1) * pageSize;

    const conditions = [eq(schema.stories.status, "published")];
    if (locationId) {
      conditions.push(eq(schema.stories.locationId, locationId));
    }
    const whereClause = and(...conditions);

    // Count total
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)` })
      .from(schema.stories)
      .where(whereClause);
    const total = cnt;
    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    // Fetch stories with author + location
    const rows = await db
      .select({
        story: schema.stories,
        authorId: schema.users.id,
        authorName: schema.users.name,
        authorNickname: schema.users.nickname,
        authorImage: schema.users.image,
        locationId: schema.locations.id,
        locationName: schema.locations.name,
        locationSlug: schema.locations.slug,
      })
      .from(schema.stories)
      .leftJoin(schema.users, eq(schema.stories.authorId, schema.users.id))
      .leftJoin(schema.locations, eq(schema.stories.locationId, schema.locations.id))
      .where(whereClause)
      .orderBy(desc(schema.stories.createdAt))
      .limit(pageSize)
      .offset(offset);

    const result = rows.map((row) => ({
      id: row.story.id,
      title: row.story.title,
      coverImage: row.story.coverImage,
      summary: row.story.summary,
      content: row.story.content,
      viewCount: row.story.viewCount ?? 0,
      likeCount: row.story.likeCount ?? 0,
      status: row.story.status,
      createdAt: row.story.createdAt,
      author: row.authorId ? {
        id: row.authorId,
        name: row.authorNickname || row.authorName,
        image: row.authorImage,
      } : null,
      location: row.locationId ? {
        id: row.locationId,
        name: row.locationName,
        slug: row.locationSlug,
      } : null,
    }));

    return c.json({
      success: true,
      stories: result,
      pagination: { page, pageSize, total, totalPages, hasMore },
    });
  } catch (error) {
    console.error("[v1/stories] list error:", error);
    return c.json(APIErrors.internalError("获取故事列表失败"), 500);
  }
});

/**
 * GET /v1/stories/:id
 * 公开读端点：已发布故事详情，draft/hidden 不可见。
 */
stories.get("/:id", apiRateLimitMiddleware("read", 600), async (c) => {
  try {
    const db = createDb(c.env.DB);
    const auth = createAuth(c.env);
    const id: string = c.req.param("id") ?? "";

    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);

    const result = await db
      .select({
        story: schema.stories,
        authorId: schema.users.id,
        authorName: schema.users.name,
        authorNickname: schema.users.nickname,
        authorImage: schema.users.image,
        locationId: schema.locations.id,
        locationName: schema.locations.name,
        locationSlug: schema.locations.slug,
      })
      .from(schema.stories)
      .leftJoin(schema.users, eq(schema.stories.authorId, schema.users.id))
      .leftJoin(schema.locations, eq(schema.stories.locationId, schema.locations.id))
      .where(and(eq(schema.stories.id, id), ne(schema.stories.status, "hidden")))
      .limit(1);

    if (!result.length) {
      return c.json(APIErrors.notFound("故事不存在"), 404);
    }

    const { story, authorId, authorName, authorNickname, authorImage, locationId, locationName, locationSlug } = result[0];

    // draft 只对作者本人或 admin 可见
    if (story.status !== "published") {
      const canView = session && (session.user.id === story.authorId || session.user.role === "admin");
      if (!canView) return c.json(APIErrors.notFound("故事不存在"), 404);
    }

    // Increment view count for published stories
    if (story.status === "published") {
      await db
        .update(schema.stories)
        .set({ viewCount: (story.viewCount ?? 0) + 1 })
        .where(eq(schema.stories.id, id));
    }

    // Fetch tags
    const tagRows = await db
      .select({ id: schema.tags.id, name: schema.tags.name })
      .from(schema.entityToTags)
      .innerJoin(schema.tags, eq(schema.entityToTags.tagId, schema.tags.id))
      .where(
        and(
          eq(schema.entityToTags.entityId, id),
          eq(schema.entityToTags.entityType, "story")
        )
      );

    // Check isLiked
    let isLiked = false;
    if (session) {
      const like = await db.query.userStoryLikes.findFirst({
        where: and(
          eq(schema.userStoryLikes.userId, session.user.id),
          eq(schema.userStoryLikes.storyId, id)
        ),
        columns: { userId: true },
      });
      isLiked = !!like;
    }

    return c.json({
      success: true,
      story: {
        ...story,
        viewCount: story.status === "published" ? (story.viewCount ?? 0) + 1 : story.viewCount ?? 0,
        isLiked,
        tags: tagRows,
        author: authorId ? {
          id: authorId,
          name: authorNickname || authorName,
          image: authorImage,
        } : null,
        location: locationId ? {
          id: locationId,
          name: locationName,
          slug: locationSlug,
        } : null,
      },
    });
  } catch (error) {
    console.error("[v1/stories/:id] error:", error);
    return c.json(APIErrors.internalError("获取故事详情失败"), 500);
  }
});

export { stories as storiesRoute };
