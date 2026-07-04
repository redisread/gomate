import { APIErrors } from "../lib/api-errors";
import { Hono } from "hono";
import { eq, desc, count, sql, inArray, and } from "drizzle-orm";
import { createAuth } from "../lib/auth";
import { createDb } from "../db";
import * as schema from "../db/schema";
import type { Env } from "../lib/auth";
import { createStorySchema, updateStorySchema } from "../lib/validation";
import { generateId } from "../lib/id";

const stories = new Hono<{ Bindings: Env }>();

function normalizeStoryTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))].slice(0, 10);
}

/**
 * GET /stories/stats
 * 获取故事统计数据（本周新增、热门地点）
 */
stories.get("/stats", async (c) => {
  try {
    const db = createDb(c.env.DB);

    // 使用缓存
    const { getCachedOrFetch, setPublicCacheHeaders } = await import("../lib/cache");
    setPublicCacheHeaders(c);

    const data = await getCachedOrFetch("stories:stats", async () => {
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

      return {
        weeklyNewStories,
        popularLocation,
      };
    });

    return c.json({
      success: true,
      data,
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

    // 获取当前登录用户（可选），用于 isLiked 判断
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);

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
        c.header("Cache-Control", "no-store");
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

    // 查询当前用户已点赞的故事ID列表
    let likedStoryIds = new Set<string>();
    if (session) {
      const userLikes = await db
        .select({ storyId: schema.userStoryLikes.storyId })
        .from(schema.userStoryLikes)
        .where(eq(schema.userStoryLikes.userId, session.user.id));
      likedStoryIds = new Set(userLikes.map((l) => l.storyId));
    }

    const formatted = items.map(({ story, author }) => ({
      ...story,
      isLiked: likedStoryIds.has(story.id),
      author: author
        ? {
            id: author.id,
            name: author.nickname || author.name,
            image: author.image,
          }
        : null,
    }));

    c.header("Cache-Control", "no-store");
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
 * GET /stories/tags
 * 获取故事相关的热门标签（只返回有故事关联的标签）
 */
stories.get("/tags", async (c) => {
  try {
    const db = createDb(c.env.DB);

    // 使用缓存
    const { getCachedOrFetch, setPublicCacheHeaders } = await import("../lib/cache");
    setPublicCacheHeaders(c);

    const formattedTags = await getCachedOrFetch("stories:tags", async () => {
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
        .innerJoin(
          schema.stories,
          eq(schema.entityToTags.entityId, schema.stories.id)
        )
        .where(
          and(
            eq(schema.entityToTags.entityType, "story"),
            eq(schema.stories.status, "published")
          )
        )
        .groupBy(schema.tags.id, schema.tags.name, schema.tags.type)
        .orderBy(desc(count()))
        .limit(15);

      return storyTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        type: tag.type,
        count: tag.count,
      }));
    });

    return c.json({
      success: true,
      tags: formattedTags,
    });
  } catch (error) {
    console.error("Get story tags error:", error);
    return c.json(APIErrors.internalError("获取标签失败"), 500);
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
      .where(
        and(
          eq(schema.stories.id, id),
          eq(schema.stories.status, "published")
        )
      )
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

    // 检查当前用户是否已点赞（仅登录用户）
    let isLiked = false;
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    if (session) {
      const likeRecord = await db.query.userStoryLikes.findFirst({
        where: and(
          eq(schema.userStoryLikes.userId, session.user.id),
          eq(schema.userStoryLikes.storyId, id)
        ),
        columns: { userId: true },
      });
      isLiked = !!likeRecord;
    }

    return c.json({
      success: true,
      data: {
        ...story,
        viewCount: currentViewCount + 1,
        isLiked,
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

    // Validate input with Zod
    const parsed = createStorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入验证失败", parsed.error.errors), 400);
    }

    const data = parsed.data;
    const normalizedTags = normalizeStoryTags(data.tags);
    const storyId = generateId();
    const now = new Date();

    await db.insert(schema.stories).values({
      id: storyId,
      authorId: userId,
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
    });

    for (const tagName of normalizedTags) {
      let tag = await db.query.tags.findFirst({
        where: eq(schema.tags.name, tagName),
      });

      if (!tag) {
        const tagId = generateId();
        await db.insert(schema.tags).values({
          id: tagId,
          name: tagName,
          type: "activity",
          createdAt: now,
        });
        tag = await db.query.tags.findFirst({
          where: eq(schema.tags.id, tagId),
        });
      }

      if (tag) {
        await db.insert(schema.entityToTags).values({
          id: generateId(),
          entityId: storyId,
          entityType: "story",
          tagId: tag.id,
          createdAt: now,
        });
      }
    }

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

    // Validate input with Zod
    const parsed = updateStorySchema.safeParse({ ...body, id });
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入验证失败", parsed.error.errors), 400);
    }

    const data = parsed.data;
    const updateData: Partial<typeof schema.stories.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.summary !== undefined) updateData.summary = data.summary.trim();
    if (data.content !== undefined) updateData.content = data.content.trim();
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.status !== undefined) updateData.status = data.status;

    await db.update(schema.stories).set(updateData).where(eq(schema.stories.id, id));

    // 如果传了 tags，在事务内更新标签关联
    if (data.tags !== undefined) {
      const newTags = data.tags;
      await db.transaction(async (tx) => {
        // 先删除旧关联
        await tx
          .delete(schema.entityToTags)
          .where(
            and(
              eq(schema.entityToTags.entityId, id),
              eq(schema.entityToTags.entityType, "story")
            )
          );

        // 插入新关联（空数组则清除所有）
        if (newTags.length > 0) {
          const tagEntries: (typeof schema.entityToTags.$inferInsert)[] = [];
          for (const tagName of newTags) {
            let tag = await tx.query.tags.findFirst({
              where: eq(schema.tags.name, tagName),
            });
            if (!tag) {
              const tagId = generateId();
              await tx.insert(schema.tags).values({
                id: tagId,
                name: tagName,
                type: "activity",
                createdAt: new Date(),
              });
              tag = { id: tagId, name: tagName, type: "activity", createdAt: new Date() };
            }
            tagEntries.push({
              id: generateId(),
              entityId: id,
              entityType: "story",
              tagId: tag.id,
            });
          }
          if (tagEntries.length > 0) {
            await tx.insert(schema.entityToTags).values(tagEntries);
          }
        }
      });
    }

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

    await db
      .delete(schema.entityToTags)
      .where(
        and(
          eq(schema.entityToTags.entityId, id),
          eq(schema.entityToTags.entityType, "story")
        )
      );

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
 * 点赞/取消点赞故事（toggle）
 * 已点赞 → 取消点赞（likeCount -1）
 * 未点赞 → 点赞（likeCount +1）
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
    const userId = session.user.id;

    const story = await db.query.stories.findFirst({
      where: eq(schema.stories.id, id),
      columns: { id: true },
    });

    if (!story) {
      return c.json(APIErrors.notFound("故事不存在"), 404);
    }

    // 检查是否已点赞
    const existingLike = await db.query.userStoryLikes.findFirst({
      where: and(
        eq(schema.userStoryLikes.userId, userId),
        eq(schema.userStoryLikes.storyId, id)
      ),
      columns: { userId: true },
    });

    let liked: boolean;
    if (existingLike) {
      // 已点赞 → 取消点赞
      await db.delete(schema.userStoryLikes).where(
        and(
          eq(schema.userStoryLikes.userId, userId),
          eq(schema.userStoryLikes.storyId, id)
        )
      );
      // 原子递减：SQL 层面条件判断，避免负数
      await db.update(schema.stories)
        .set({
          likeCount: sql`MAX(0, ${schema.stories.likeCount} - 1)`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.stories.id, id),
          sql`${schema.stories.likeCount} > 0`
        ));
      liked = false;
    } else {
      // 未点赞 → 点赞：先插入（PRIMARY KEY 约束 + onConflictDoNothing 防重复）
      await db.insert(schema.userStoryLikes).values({
        userId,
        storyId: id,
      }).onConflictDoNothing();
      // 原子递增
      await db.update(schema.stories)
        .set({
          likeCount: sql`${schema.stories.likeCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.stories.id, id));
      liked = true;
    }

    // 返回最新 likeCount，以便前端修正乐观计算的偏差
    const updated = await db.query.stories.findFirst({
      where: eq(schema.stories.id, id),
      columns: { likeCount: true },
    });

    return c.json({
      success: true,
      liked,
      likeCount: updated?.likeCount ?? 0,
      message: liked ? "点赞成功" : "取消点赞成功",
    });
  } catch (error) {
    console.error("Like story error:", error);
    return c.json(APIErrors.internalError("点赞失败"), 500);
  }
});

/**
 * GET /stories/:id/share-stats
 * 获取单个故事的分享统计（总数 + 渠道分布）
 */
stories.get("/:id/share-stats", async (c) => {
  try {
    const storyId = c.req.param("id");
    const db = createDb(c.env.DB);

    // 验证故事存在
    const story = await db.query.stories.findFirst({
      where: eq(schema.stories.id, storyId),
      columns: { id: true },
    });

    if (!story) {
      return c.json(APIErrors.notFound("故事不存在"), 404);
    }

    // 总数 + 渠道分布
    const result = await db
      .select({
        channel: schema.shareEvents.shareChannel,
        count: sql<number>`count(*)`,
      })
      .from(schema.shareEvents)
      .where(
        and(
          eq(schema.shareEvents.entityType, "story"),
          eq(schema.shareEvents.entityId, storyId)
        )
      )
      .groupBy(schema.shareEvents.shareChannel);

    const byChannel: Record<string, number> = {};
    let total = 0;
    for (const row of result) {
      byChannel[row.channel] = row.count;
      total += row.count;
    }

    return c.json({ success: true, total, byChannel });
  } catch (error) {
    console.error("Get share stats error:", error);
    return c.json(APIErrors.internalError("获取分享统计失败"), 500);
  }
});

export default stories;
