import { APIErrors } from "../lib/api-errors";
import { Hono } from "hono";
import { eq, desc, count, sql, inArray, and } from "drizzle-orm";
import { createAuth } from "../lib/auth";
import { createDb } from "../db";
import * as schema from "../db/schema";
import type { Env } from "../lib/auth";

const stories = new Hono<{ Bindings: Env }>();

/**
 * GET /stories/stats
 * 获取故事统计数据（本周新增、热门地点）
 */
stories.get("/stats", async (c) => {
  try {
    const db = createDb(c.env.DB);

    // 计算本周开始时间（周一）
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    // 1. 本周新增故事数
    const weeklyNewResult = await db
      .select({ count: count() })
      .from(schema.stories)
      .where(
        sql`${schema.stories.createdAt} >= ${weekStart.getTime()} AND ${schema.stories.status} = 'published'`
      );
    const weeklyNewStories = weeklyNewResult[0]?.count ?? 0;

    // 2. 热门地点（按故事数量排序 TOP 1）
    const popularLocationResult = await db
      .select({
        locationId: schema.stories.locationId,
        storyCount: count(),
      })
      .from(schema.stories)
      .where(
        sql`${schema.stories.locationId} IS NOT NULL AND ${schema.stories.status} = 'published'`
      )
      .groupBy(schema.stories.locationId)
      .orderBy(desc(count()))
      .limit(1);

    let popularLocation = null;
    if (popularLocationResult.length > 0 && popularLocationResult[0].locationId) {
      const location = await db.query.locations.findFirst({
        where: eq(schema.locations.id, popularLocationResult[0].locationId),
      });
      if (location) {
        popularLocation = {
          id: location.id,
          name: location.name,
          slug: location.slug,
          storyCount: popularLocationResult[0].storyCount,
        };
      }
    }

    // 设置缓存头（5分钟）
    c.header("Cache-Control", "public, max-age=300");

    return c.json({
      success: true,
      data: {
        weeklyNewStories,
        popularLocation,
      },
    });
  } catch (error) {
    console.error("Get stories stats error:", error);
    return c.json(APIErrors.internalError("获取统计数据失败"), 500);
  }
});

/**
 * GET /stories
 * 获取故事列表（分页）
 * Query: page, limit, status, tag
 */
stories.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const limit = Math.min(20, parseInt(c.req.query("limit") || "10", 10));
    const status = c.req.query("status") || "published";
    const tag = c.req.query("tag");
    const offset = (page - 1) * limit;

    // 基础过滤条件：状态
    const whereConditions = [eq(schema.stories.status, status)];

    // 如果指定了标签，先查询该标签对应的故事ID列表
    let storyIdsWithTag: string[] = [];
    if (tag && tag.trim()) {
      const tagName = tag.trim();
      // 查询标签ID
      const tagRecord = await db.query.tags.findFirst({
        where: eq(schema.tags.name, tagName),
      });

      if (tagRecord) {
        // 查询关联的故事ID
        const entityTagsResult = await db
          .select({ entityId: schema.entityToTags.entityId })
          .from(schema.entityToTags)
          .where(
            and(
              eq(schema.entityToTags.tagId, tagRecord.id),
              eq(schema.entityToTags.entityType, "story")
            )
          );
        storyIdsWithTag = entityTagsResult.map((r) => r.entityId);
      }

      // 如果有标签但无关联故事，返回空结果
      if (storyIdsWithTag.length === 0) {
        return c.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            hasMore: false,
          },
        });
      }

      // 添加故事ID过滤条件
      whereConditions.push(inArray(schema.stories.id, storyIdsWithTag));
    }

    // 组合过滤条件
    const whereClause = whereConditions.length > 1
      ? and(whereConditions[0], whereConditions[1])
      : whereConditions[0];

    const items = await db
      .select({
        story: schema.stories,
        author: {
          id: schema.users.id,
          name: schema.users.name,
          nickname: schema.users.nickname,
          image: schema.users.image,
        },
      })
      .from(schema.stories)
      .leftJoin(schema.users, eq(schema.stories.authorId, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.stories.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db.$count(schema.stories, whereClause);

    const formatted = items.map(({ story, author }) => ({
      ...story,
      author: author
        ? {
            id: author.id,
            name: author.nickname || author.name,
            image: author.image,
          }
        : null,
    }));

    return c.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total: totalResult,
        hasMore: items.length === limit,
      },
    });
  } catch (error) {
    console.error("Get stories error:", error);
    return c.json(APIErrors.internalError("获取故事列表失败"), 500);
  }
});

/**
 * GET /stories/:id
 * 获取故事详情
 */
stories.get("/:id", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");

    const result = await db
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
      })
      .from(schema.stories)
      .leftJoin(schema.users, eq(schema.stories.authorId, schema.users.id))
      .leftJoin(schema.locations, eq(schema.stories.locationId, schema.locations.id))
      .where(eq(schema.stories.id, id))
      .limit(1);

    if (!result.length) {
      return c.json(APIErrors.notFound("故事不存在"), 404);
    }

    const { story, author, location } = result[0];

    // Increment view count
    const currentViewCount = story.viewCount ?? 0;
    await db
      .update(schema.stories)
      .set({ viewCount: currentViewCount + 1 })
      .where(eq(schema.stories.id, id));

    return c.json({
      success: true,
      data: {
        ...story,
        viewCount: currentViewCount + 1,
        author: author
          ? {
              id: author.id,
              name: author.nickname || author.name,
              image: author.image,
            }
          : null,
        location: location
          ? {
              id: location.id,
              name: location.name,
              slug: location.slug,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get story detail error:", error);
    return c.json(APIErrors.internalError("获取故事详情失败"), 500);
  }
});

/**
 * POST /stories
 * 创建故事
 * 权限：登录用户
 */
stories.post("/", async (c) => {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json(APIErrors.unauthorized("请先登录"), 401);
    }

    const db = createDb(c.env.DB);
    const userId = session.user.id;

    const body = await c.req.json();
    const { title, summary, content, coverImage, locationId } = body;

    if (!title || title.trim().length === 0) {
      return c.json(APIErrors.badRequest("标题不能为空"), 400);
    }

    if (title.length > 100) {
      return c.json(APIErrors.badRequest("标题不能超过100字"), 400);
    }

    if (!summary || summary.trim().length === 0) {
      return c.json(APIErrors.badRequest("摘要不能为空"), 400);
    }

    if (summary.length > 150) {
      return c.json(APIErrors.badRequest("摘要不能超过150字"), 400);
    }

    if (!content || content.trim().length === 0) {
      return c.json(APIErrors.badRequest("内容不能为空"), 400);
    }

    const storyId = crypto.randomUUID();
    const now = new Date();

    await db.insert(schema.stories).values({
      id: storyId,
      authorId: userId,
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      coverImage,
      locationId,
      status: "published",
      viewCount: 0,
      likeCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return c.json({
      success: true,
      message: "发布成功",
      data: { id: storyId },
    });
  } catch (error) {
    console.error("Create story error:", error);
    return c.json(APIErrors.internalError("发布失败"), 500);
  }
});

/**
 * PUT /stories/:id
 * 更新故事
 * 权限：作者或管理员
 */
stories.put("/:id", async (c) => {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json(APIErrors.unauthorized("请先登录"), 401);
    }

    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    const userId = session.user.id;

    const story = await db.query.stories.findFirst({
      where: eq(schema.stories.id, id),
    });

    if (!story) {
      return c.json(APIErrors.notFound("故事不存在"), 404);
    }

    const isAuthor = story.authorId === userId;
    const isAdmin = session.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return c.json(APIErrors.forbidden("无权编辑"), 403);
    }

    const body = await c.req.json();
    const { title, summary, content, coverImage, locationId, status } = body;

    const updateData: Partial<typeof schema.stories.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (summary !== undefined) updateData.summary = summary.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (locationId !== undefined) updateData.locationId = locationId;
    if (status !== undefined) updateData.status = status;

    await db.update(schema.stories).set(updateData).where(eq(schema.stories.id, id));

    return c.json({
      success: true,
      message: "更新成功",
    });
  } catch (error) {
    console.error("Update story error:", error);
    return c.json(APIErrors.internalError("更新失败"), 500);
  }
});

/**
 * DELETE /stories/:id
 * 删除故事（软删除）
 * 权限：作者或管理员
 */
stories.delete("/:id", async (c) => {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json(APIErrors.unauthorized("请先登录"), 401);
    }

    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    const userId = session.user.id;

    const story = await db.query.stories.findFirst({
      where: eq(schema.stories.id, id),
    });

    if (!story) {
      return c.json(APIErrors.notFound("故事不存在"), 404);
    }

    const isAuthor = story.authorId === userId;
    const isAdmin = session.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return c.json(APIErrors.forbidden("无权删除"), 403);
    }

    await db
      .update(schema.stories)
      .set({
        status: "hidden",
        updatedAt: new Date(),
      })
      .where(eq(schema.stories.id, id));

    return c.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("Delete story error:", error);
    return c.json(APIErrors.internalError("删除失败"), 500);
  }
});

/**
 * POST /stories/:id/like
 * 点赞故事
 */
stories.post("/:id/like", async (c) => {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json(APIErrors.unauthorized("请先登录"), 401);
    }

    const db = createDb(c.env.DB);
    const id = c.req.param("id");

    const story = await db.query.stories.findFirst({
      where: eq(schema.stories.id, id),
    });

    if (!story) {
      return c.json(APIErrors.notFound("故事不存在"), 404);
    }

    await db
      .update(schema.stories)
      .set({
        likeCount: (story.likeCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.stories.id, id));

    return c.json({
      success: true,
      message: "点赞成功",
    });
  } catch (error) {
    console.error("Like story error:", error);
    return c.json(APIErrors.internalError("点赞失败"), 500);
  }
});

/**
 * GET /stories/tags
 * 获取故事相关的热门标签（只返回有故事关联的标签）
 */
stories.get("/tags", async (c) => {
  try {
    const db = createDb(c.env.DB);

    // 查询有故事关联的标签
    const storyTags = await db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        type: schema.tags.type,
        count: sql<number>`count(${schema.entityToTags.entityId})`.as("count"),
      })
      .from(schema.tags)
      .innerJoin(
        schema.entityToTags,
        eq(schema.tags.id, schema.entityToTags.tagId)
      )
      .where(eq(schema.entityToTags.entityType, "story"))
      .groupBy(schema.tags.id, schema.tags.name, schema.tags.type)
      .orderBy(sql`count(${schema.entityToTags.entityId})`)
      .limit(15);

    // 格式化返回，添加 count
    const formattedTags = storyTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      type: tag.type,
      count: tag.count,
    }));

    c.header("Cache-Control", "public, max-age=60");
    return c.json({
      success: true,
      tags: formattedTags,
    });
  } catch (error) {
    console.error("Get story tags error:", error);
    return c.json(APIErrors.internalError("获取标签失败"), 500);
  }
});

export default stories;
