import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { createDb } from "../db";
import {
  conversations,
  messages,
  teams,
  teamMembers,
  users,
} from "../db/schema";
import { eq, and, or, desc, asc, sql, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { Env } from "../lib/auth";

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
app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env.DB);
  const cursor = c.req.query("cursor");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);

  try {
    let query = db
      .select({
        id: conversations.id,
        teamId: conversations.teamId,
        lastMessageContent: conversations.lastMessageContent,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        otherUser: {
          id: users.id,
          name: users.name,
          nickname: users.nickname,
          image: users.image,
        },
        unreadCount: sql<number>`(
          SELECT COUNT(*) FROM messages
          WHERE messages.conversation_id = ${conversations.id}
          AND messages.sender_id != ${user.id}
          AND messages.is_read = false
        )`,
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

    // 获取对方用户信息
    const list = await query;

    // 补充对方用户信息
    const result = await Promise.all(
      list.map(async (item) => {
        const [otherUser] = await db
          .select({
            id: users.id,
            name: users.name,
            nickname: users.nickname,
            image: users.image,
          })
          .from(users)
          .where(
            and(
              eq(conversations.id, item.id),
              sql`${users.id} = CASE
                WHEN ${conversations.userId} = ${user.id}
                THEN ${conversations.leaderId}
                ELSE ${conversations.userId}
              END`
            )
          )
          .leftJoin(conversations, eq(conversations.id, item.id))
          .limit(1);

        return {
          ...item,
          otherUser: otherUser || null,
        };
      })
    );

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error("Failed to get conversations:", error);
    return c.json({ error: "Failed to get conversations" }, 500);
  }
});

/**
 * POST /messages - 创建对话
 */
app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
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
      return c.json({ error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Failed to create conversation:", error);
    return c.json({ error: "Failed to create conversation" }, 500);
  }
});

/**
 * GET /messages/:id - 获取消息列表
 */
app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("id");
  const cursor = c.req.query("cursor");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);
  const db = createDb(c.env.DB);

  try {
    // 权限检查
    const hasAccess = await canAccessConversation(db, conversationId, user.id);
    if (!hasAccess) {
      return c.json({ error: "Access denied" }, 403);
    }

    // 构建查询
    let query = db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        content: messages.content,
        isRead: messages.isRead,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          name: users.name,
          nickname: users.nickname,
          image: users.image,
        },
      })
      .from(messages)
      .leftJoin(users, eq(users.id, messages.senderId))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    if (cursor) {
      const cursorDate = new Date(parseInt(cursor));
      query = query.where(lt(messages.createdAt, cursorDate));
    }

    const list = await query;

    // 异步标记对方消息为已读
    c.executionCtx?.waitUntil(
      (async () => {
        try {
          await db
            .update(messages)
            .set({
              isRead: true,
              readAt: Date.now(),
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
      data: list.reverse(), // 按时间正序返回
      nextCursor:
        list.length === limit
          ? list[list.length - 1]?.createdAt?.getTime()
          : null,
    });
  } catch (error) {
    console.error("Failed to get messages:", error);
    return c.json({ error: "Failed to get messages" }, 500);
  }
});

/**
 * POST /messages/:id - 发送消息
 */
app.post("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("id");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  try {
    const { content } = sendMessageSchema.parse(body);

    // 权限检查
    const hasAccess = await canAccessConversation(db, conversationId, user.id);
    if (!hasAccess) {
      return c.json({ error: "Access denied" }, 403);
    }

    // 创建消息
    const messageId = nanoid();
    const now = Date.now();

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
      return c.json({ error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Failed to send message:", error);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

/**
 * GET /messages/unread-count - 获取未读消息数
 */
app.get("/unread-count", requireAuth, async (c) => {
  const user = c.get("user");
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
    return c.json({ error: "Failed to get unread count" }, 500);
  }
});

export default app;
