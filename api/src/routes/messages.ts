import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db";
import { createAuth, type Env } from "../lib/auth";
import {
  conversations,
  messages,
  teams,
  teamMembers,
  users,
} from "../db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono<{ Bindings: Env }>();

// ============ Validation Schemas ============

const createConversationSchema = z.object({
  teamId: z.string(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
});

// ============ Helper Functions ============

/**
 * 检查用户是否可以创建对话（是队伍成员且不是队长）
 */
async function canCreateConversation(
  db: ReturnType<typeof createDb>,
  teamId: string,
  userId: string
): Promise<{ can: boolean; leaderId?: string; error?: string }> {
  // 获取队伍信息
  const [team] = await db
    .select({ id: teams.id, leaderId: teams.leaderId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return { can: false, error: "Team not found" };
  }

  // 不能私信自己（自己是队长）
  if (team.leaderId === userId) {
    return { can: false, error: "Cannot message yourself" };
  }

  // 检查是否是队伍成员（申请中或已通过）
  const [membership] = await db
    .select({ status: teamMembers.status })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        or(
          eq(teamMembers.status, "pending"),
          eq(teamMembers.status, "approved")
        )
      )
    )
    .limit(1);

  if (!membership) {
    return { can: false, error: "Not a team member" };
  }

  return { can: true, leaderId: team.leaderId };
}

/**
 * 检查用户是否有权限访问对话
 */
async function canAccessConversation(
  db: ReturnType<typeof createDb>,
  conversationId: string,
  userId: string
): Promise<boolean> {
  const [conv] = await db
    .select({ userId: conversations.userId, leaderId: conversations.leaderId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv) return false;

  return conv.userId === userId || conv.leaderId === userId;
}

// ============ API Routes ============

/**
 * GET /messages - 获取会话列表
 */
app.get("/", async (c) => {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

  const user = session.user;
  const db = createDb(c.env.DB);
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);

  try {
    // 获取对话列表
    const list = await db
      .select({
        id: conversations.id,
        teamId: conversations.teamId,
        lastMessageContent: conversations.lastMessageContent,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        userId: conversations.userId,
        leaderId: conversations.leaderId,
      })
      .from(conversations)
      .where(
        or(
          eq(conversations.userId, user.id),
          eq(conversations.leaderId, user.id)
        )
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit);

    // 获取对方用户信息并计算未读数
    const result = await Promise.all(
      list.map(async (conv) => {
        // 获取对方用户ID
        const otherUserId = conv.userId === user.id ? conv.leaderId : conv.userId;

        // 获取对方用户信息
        const [otherUser] = await db
          .select({
            id: users.id,
            name: users.name,
            nickname: users.nickname,
            image: users.image,
          })
          .from(users)
          .where(eq(users.id, otherUserId))
          .limit(1);

        // 获取未读消息数
        const [unreadResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              eq(messages.isRead, false),
              sql`${messages.senderId} <> ${user.id}`
            )
          );

        return {
          ...conv,
          otherUser: otherUser || null,
          unreadCount: unreadResult?.count || 0,
        };
      })
    );

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error("Failed to get conversations:", error);
    return c.json({ success: false, error: "Failed to get conversations" }, 500);
  }
});

/**
 * POST /messages - 创建对话
 */
app.post("/", async (c) => {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

  const user = session.user;
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  try {
    const { teamId } = createConversationSchema.parse(body);

    // 检查权限
    const { can, leaderId, error } = await canCreateConversation(
      db,
      teamId,
      user.id
    );
    if (!can) {
      return c.json({ error }, 403);
    }

    // 检查是否已存在对话
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.teamId, teamId),
          eq(conversations.userId, user.id),
          eq(conversations.leaderId, leaderId!)
        )
      )
      .limit(1);

    if (existing) {
      return c.json(
        { success: true, data: { id: existing.id, isNew: false } }
      );
    }

    // 创建新对话
    const id = nanoid();
    await db.insert(conversations).values({
      id,
      teamId,
      userId: user.id,
      leaderId: leaderId!,
      initiatorId: user.id,
    });

    return c.json(
      { success: true, data: { id, isNew: true } },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Failed to create conversation:", error);
    return c.json({ success: false, error: "Failed to create conversation" }, 500);
  }
});

/**
 * GET /messages/unread-count - 获取未读消息数
 * 注意：必须在 /:id 路由之前注册
 */
app.get("/unread-count", async (c) => {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

  const user = session.user;
  const db = createDb(c.env.DB);

  try {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .innerJoin(
        conversations,
        eq(conversations.id, messages.conversationId)
      )
      .where(
        and(
          eq(messages.isRead, false),
          sql`${messages.senderId} != ${user.id}`,
          or(
            eq(conversations.userId, user.id),
            eq(conversations.leaderId, user.id)
          )
        )
      );

    return c.json({
      success: true,
      data: { count: result?.count || 0 },
    });
  } catch (error) {
    console.error("Failed to get unread count:", error);
    return c.json({ success: false, error: "Failed to get unread count" }, 500);
  }
});

/**
 * GET /messages/:id - 获取消息列表
 */
app.get("/:id", async (c) => {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

  const user = session.user;
  const conversationId = c.req.param("id");
  const cursor = c.req.query("cursor");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);
  const db = createDb(c.env.DB);

  try {
    // 权限检查
    const hasAccess = await canAccessConversation(db, conversationId, user.id);
    if (!hasAccess) {
      return c.json({ success: false, error: "Access denied" }, 403);
    }

    // 构建查询
    let whereConditions = and(
      eq(messages.conversationId, conversationId)
    );

    if (cursor) {
      const cursorDate = new Date(parseInt(cursor));
      whereConditions = and(
        whereConditions,
        sql`${messages.createdAt} < ${cursorDate}`
      );
    }

    const list = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        content: messages.content,
        isRead: messages.isRead,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(whereConditions)
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // 获取发送者信息
    const messagesWithSender = await Promise.all(
      list.map(async (msg) => {
        const [sender] = await db
          .select({
            id: users.id,
            name: users.name,
            nickname: users.nickname,
            image: users.image,
          })
          .from(users)
          .where(eq(users.id, msg.senderId))
          .limit(1);
        return { ...msg, sender };
      })
    );

    // 异步标记对方消息为已读
    c.executionCtx?.waitUntil(
      (async () => {
        try {
          await db
            .update(messages)
            .set({
              isRead: true,
              readAt: new Date(),
            })
            .where(
              and(
                eq(messages.conversationId, conversationId),
                eq(messages.isRead, false),
                sql`${messages.senderId} != ${user.id}`
              )
            );
        } catch (err) {
          console.error("Failed to mark messages as read:", err);
        }
      })()
    );

    return c.json({
      success: true,
      data: messagesWithSender.reverse(),
      nextCursor:
        list.length === limit && list.length > 0
          ? String(list[list.length - 1]?.createdAt?.getTime() || Date.now())
          : null,
    });
  } catch (error) {
    console.error("Failed to get messages:", error);
    return c.json({ success: false, error: "Failed to get messages" }, 500);
  }
});

/**
 * POST /messages/:id - 发送消息
 */
app.post("/:id", async (c) => {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

  const user = session.user;
  const conversationId = c.req.param("id");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  try {
    const { content } = sendMessageSchema.parse(body);

    // 权限检查
    const hasAccess = await canAccessConversation(db, conversationId, user.id);
    if (!hasAccess) {
      return c.json({ success: false, error: "Access denied" }, 403);
    }

    // 创建消息
    const messageId = nanoid();
    const now = new Date();

    await db.insert(messages).values({
      id: messageId,
      conversationId,
      senderId: user.id,
      content,
      isRead: false,
      createdAt: now,
    });

    // 更新对话最后消息
    await db
      .update(conversations)
      .set({
        lastMessageAt: now,
        lastMessageContent: content.substring(0, 100),
        updatedAt: now,
      })
      .where(eq(conversations.id, conversationId));

    return c.json({ success: true, data: { id: messageId } }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Failed to send message:", error);
    return c.json({ success: false, error: "Failed to send message" }, 500);
  }
});

export default app;
