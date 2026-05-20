import { Hono } from "hono";
import { eq, desc, and } from "drizzle-orm";
import { createAuth } from "../lib/auth";
import { createDb } from "../db";
import * as schema from "../db/schema";
import type { Env } from "../lib/auth";

const activityPosts = new Hono<{ Bindings: Env }>();

/**
 * GET /teams/:id/activity-posts
 * 获取队伍的活动后分享列表
 */
activityPosts.get("/teams/:id/activity-posts", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const teamId = c.req.param("id");
    const limit = Math.min(50, parseInt(c.req.query("limit") || "10", 10));

    // Check if team exists
    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
    });

    if (!team) {
      return c.json({ success: false, message: "队伍不存在" }, 404);
    }

    // Get visible activity posts for this team
    const posts = await db
      .select({
        post: schema.activityPosts,
        author: {
          id: schema.users.id,
          name: schema.users.name,
          nickname: schema.users.nickname,
          avatar: schema.users.image,
        },
      })
      .from(schema.activityPosts)
      .leftJoin(schema.users, eq(schema.activityPosts.authorId, schema.users.id))
      .where(
        and(
          eq(schema.activityPosts.teamId, teamId),
          eq(schema.activityPosts.status, "visible")
        )
      )
      .orderBy(desc(schema.activityPosts.createdAt))
      .limit(limit);

    const formattedPosts = posts.map(({ post, author }) => ({
      ...post,
      images: JSON.parse(post.images || "[]"),
      author: author
        ? {
            id: author.id,
            name: author.nickname || author.name,
            avatar: author.avatar,
          }
        : null,
    }));

    return c.json({
      success: true,
      data: formattedPosts,
    });
  } catch (error) {
    console.error("Get activity posts error:", error);
    return c.json({ success: false, message: "获取分享列表失败" }, 500);
  }
});

/**
 * POST /teams/:id/activity-posts
 * 创建活动后分享
 * 权限：登录用户 + 队伍成员 + 队伍已完成
 */
activityPosts.post("/teams/:id/activity-posts", async (c) => {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json({ success: false, message: "请先登录" }, 401);
    }

    const db = createDb(c.env.DB);
    const teamId = c.req.param("id");
    const userId = session.user.id;

    // Check if team exists
    const team = await db.query.teams.findFirst({
      where: eq(schema.teams.id, teamId),
    });

    if (!team) {
      return c.json({ success: false, message: "队伍不存在" }, 404);
    }

    // Check if team is completed
    if (team.status !== "completed") {
      return c.json(
        { success: false, message: "只有已完成的队伍才能发布分享" },
        403
      );
    }

    // Check if user is a member of the team
    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.userId, userId),
        eq(schema.teamMembers.status, "approved")
      ),
    });

    if (!membership) {
      return c.json(
        { success: false, message: "只有队伍成员才能发布分享" },
        403
      );
    }

    const body = await c.req.json();
    const { content, images = [] } = body;

    if (!content || content.trim().length === 0) {
      return c.json({ success: false, message: "内容不能为空" }, 400);
    }

    if (content.length > 200) {
      return c.json({ success: false, message: "内容不能超过200字" }, 400);
    }

    if (images.length > 3) {
      return c.json({ success: false, message: "图片不能超过3张" }, 400);
    }

    const postId = crypto.randomUUID();
    const now = new Date();

    await db.insert(schema.activityPosts).values({
      id: postId,
      teamId,
      locationId: team.locationId,
      authorId: userId,
      content: content.trim(),
      images: JSON.stringify(images),
      status: "visible",
      createdAt: now,
      updatedAt: now,
    });

    return c.json({
      success: true,
      message: "发布成功",
      data: { id: postId },
    });
  } catch (error) {
    console.error("Create activity post error:", error);
    return c.json({ success: false, message: "发布失败" }, 500);
  }
});

/**
 * DELETE /activity-posts/:id
 * 删除活动后分享
 * 权限：作者或管理员
 */
activityPosts.delete("/activity-posts/:id", async (c) => {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json({ success: false, message: "请先登录" }, 401);
    }

    const db = createDb(c.env.DB);
    const postId = c.req.param("id");
    const userId = session.user.id;

    // Get post with author info
    const post = await db.query.activityPosts.findFirst({
      where: eq(schema.activityPosts.id, postId),
    });

    if (!post) {
      return c.json({ success: false, message: "分享不存在" }, 404);
    }

    // Check permission: author or admin
    const isAuthor = post.authorId === userId;
    const isAdmin = session.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return c.json({ success: false, message: "无权删除" }, 403);
    }

    // Soft delete by updating status
    await db
      .update(schema.activityPosts)
      .set({
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(schema.activityPosts.id, postId));

    return c.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("Delete activity post error:", error);
    return c.json({ success: false, message: "删除失败" }, 500);
  }
});

/**
 * GET /locations/:id/activity-posts
 * 获取地点的活动后分享列表
 */
activityPosts.get("/locations/:id/activity-posts", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const locationId = c.req.param("id");
    const limit = Math.min(50, parseInt(c.req.query("limit") || "6", 10));

    // Check if location exists
    const location = await db.query.locations.findFirst({
      where: eq(schema.locations.id, locationId),
    });

    if (!location) {
      return c.json({ success: false, message: "地点不存在" }, 404);
    }

    // Get visible activity posts for this location
    const posts = await db
      .select({
        post: schema.activityPosts,
        author: {
          id: schema.users.id,
          name: schema.users.name,
          nickname: schema.users.nickname,
          avatar: schema.users.image,
        },
        team: {
          id: schema.teams.id,
          title: schema.teams.title,
        },
      })
      .from(schema.activityPosts)
      .leftJoin(schema.users, eq(schema.activityPosts.authorId, schema.users.id))
      .leftJoin(schema.teams, eq(schema.activityPosts.teamId, schema.teams.id))
      .where(
        and(
          eq(schema.activityPosts.locationId, locationId),
          eq(schema.activityPosts.status, "visible")
        )
      )
      .orderBy(desc(schema.activityPosts.createdAt))
      .limit(limit);

    const formattedPosts = posts.map(({ post, author, team }) => ({
      ...post,
      images: JSON.parse(post.images || "[]"),
      author: author
        ? {
            id: author.id,
            name: author.nickname || author.name,
            avatar: author.avatar,
          }
        : null,
      team: team
        ? {
            id: team.id,
            title: team.title,
          }
        : null,
    }));

    return c.json({
      success: true,
      data: formattedPosts,
    });
  } catch (error) {
    console.error("Get location activity posts error:", error);
    return c.json({ success: false, message: "获取分享列表失败" }, 500);
  }
});

export default activityPosts;
