import { Hono } from "hono";
import { logger } from "../lib/logger";
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
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { generateId } from "../lib/id";
import { APIErrors, type APIError } from "../lib/api-errors";
import { checkRateLimit } from "../lib/rate-limit";

const app = new Hono<{ Bindings: Env }>();

type UserSummary = {
  id: string;
  name: string;
  nickname: string | null;
  image: string | null;
};

// ============ Validation Schemas ============

const createConversationSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
});

// ============ Helper Functions ============

async function findApprovedMember(
  db: ReturnType<typeof createDb>,
  teamId: string,
  userId: string
) {
  const [membership] = await db
    .select({ status: teamMembers.status })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, "approved")
      )
    )
    .limit(1);

  return membership;
}

/**
 * 解析队伍私信参与者：只允许队长与 approved 成员建立一对一会话。
 */
async function resolveConversationParticipants(
  db: ReturnType<typeof createDb>,
  teamId: string,
  requesterId: string,
  targetUserId?: string
): Promise<
  | { ok: true; userId: string; leaderId: string; initiatorId: string }
  | { ok: false; status: 400 | 403 | 404; error: APIError }
> {
  const [team] = await db
    .select({ id: teams.id, leaderId: teams.leaderId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) return { ok: false, status: 404, error: APIErrors.notFound("Team not found") };

  if (team.leaderId === requesterId) {
    if (!targetUserId) {
      return { ok: false, status: 400, error: APIErrors.badRequest("Target user is required") };
    }
    if (targetUserId === requesterId) {
      return { ok: false, status: 400, error: APIErrors.badRequest("Cannot message yourself") };
    }
    const membership = await findApprovedMember(db, teamId, targetUserId);
    if (!membership) {
      return {
        ok: false,
        status: 403,
        error: APIErrors.forbidden("Target user is not an approved team member"),
      };
    }
    return {
      ok: true,
      userId: targetUserId,
      leaderId: requesterId,
      initiatorId: requesterId,
    };
  }

  if (targetUserId) {
    return {
      ok: false,
      status: 403,
      error: APIErrors.forbidden("Only team leader can choose a target member"),
    };
  }

  const membership = await findApprovedMember(db, teamId, requesterId);
  if (!membership) {
    return { ok: false, status: 403, error: APIErrors.forbidden("Not an approved team member") };
  }

  return {
    ok: true,
    userId: requesterId,
    leaderId: team.leaderId,
    initiatorId: requesterId,
  };
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
    .select({
      teamId: conversations.teamId,
      userId: conversations.userId,
      leaderId: conversations.leaderId,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv) return false;

  const membership = await findApprovedMember(db, conv.teamId, conv.userId);
  if (!membership) return false;

  return conv.userId === userId || conv.leaderId === userId;
}

async function runBackground(c: { executionCtx?: ExecutionContext }, task: () => Promise<void>) {
  let waitUntil: ExecutionContext["waitUntil"] | undefined;
  try {
    waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
  } catch {
    await task();
    return;
  }

  if (waitUntil) {
    const promise = task();
    try {
      waitUntil(promise);
    } catch {
      await promise;
    }
    return;
  }

  await task();
}

// ============ API Routes ============

/**
 * GET /messages - 获取会话列表
 */
app.get("/", async (c) => {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(APIErrors.unauthorized("Unauthorized"), 401);

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
      .innerJoin(
        teamMembers,
        and(
          eq(teamMembers.teamId, conversations.teamId),
          eq(teamMembers.userId, conversations.userId),
          eq(teamMembers.status, "approved")
        )
      )
      .where(
        or(
          eq(conversations.userId, user.id),
          eq(conversations.leaderId, user.id)
        )
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit);

    const otherUserIds = [...new Set(list.map((conv) =>
      conv.userId === user.id ? conv.leaderId : conv.userId
    ))];
    const conversationIds = list.map((conv) => conv.id);

    const otherUsers = otherUserIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            nickname: users.nickname,
            image: users.image,
          })
          .from(users)
          .where(inArray(users.id, otherUserIds))
      : [];
    const usersById = new Map<string, UserSummary>(otherUsers.map((otherUser) => [otherUser.id, otherUser]));

    const unreadRows = conversationIds.length > 0
      ? await db
          .select({
            conversationId: messages.conversationId,
            count: sql<number>`COUNT(*)`,
          })
          .from(messages)
          .where(
            and(
              inArray(messages.conversationId, conversationIds),
              eq(messages.isRead, false),
              sql`${messages.senderId} <> ${user.id}`
            )
          )
          .groupBy(messages.conversationId)
      : [];
    const unreadCountByConversationId = new Map(
      unreadRows.map((row) => [row.conversationId, Number(row.count) || 0])
    );

    const result = list.map((conv) => {
      const otherUserId = conv.userId === user.id ? conv.leaderId : conv.userId;
      return {
        ...conv,
        otherUser: usersById.get(otherUserId) || null,
        unreadCount: unreadCountByConversationId.get(conv.id) || 0,
      };
    });

    return c.json({ success: true, data: result });
  } catch (error) {
    logger.error("Failed to get conversations:", error);
    return c.json(APIErrors.internalError("Failed to get conversations"), 500);
  }
});

/**
 * POST /messages - 创建对话
 */
app.post("/", async (c) => {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(APIErrors.unauthorized("Unauthorized"), 401);

  const user = session.user;
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  try {
    const { teamId, userId: targetUserId } = createConversationSchema.parse(body);

    // 检查权限
    const participants = await resolveConversationParticipants(
      db,
      teamId,
      user.id,
      targetUserId
    );
    if (!participants.ok) {
      return c.json(participants.error, participants.status);
    }

    // 检查是否已存在对话
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.teamId, teamId),
          eq(conversations.userId, participants.userId),
          eq(conversations.leaderId, participants.leaderId)
        )
      )
      .limit(1);

    if (existing) {
      return c.json(
        { success: true, data: { id: existing.id, isNew: false } }
      );
    }

    // 创建新对话
    const id = generateId();
    await db.insert(conversations).values({
      id,
      teamId,
      userId: participants.userId,
      leaderId: participants.leaderId,
      initiatorId: participants.initiatorId,
    });

    return c.json(
      { success: true, data: { id, isNew: true } },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(APIErrors.validationError("Invalid input", error.errors), 400);
    }
    logger.error("Failed to create conversation:", error);
    return c.json(APIErrors.internalError("Failed to create conversation"), 500);
  }
});

/**
 * GET /messages/unread-count - 获取未读消息数
 * 注意：必须在 /:id 路由之前注册
 */
app.get("/unread-count", async (c) => {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(APIErrors.unauthorized("Unauthorized"), 401);

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
      .innerJoin(
        teamMembers,
        and(
          eq(teamMembers.teamId, conversations.teamId),
          eq(teamMembers.userId, conversations.userId),
          eq(teamMembers.status, "approved")
        )
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
    logger.error("Failed to get unread count:", error);
    return c.json(APIErrors.internalError("Failed to get unread count"), 500);
  }
});

/**
 * GET /messages/:id - 获取消息列表
 */
app.get("/:id", async (c) => {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(APIErrors.unauthorized("Unauthorized"), 401);

  const user = session.user;
  const conversationId = c.req.param("id");
  const cursor = c.req.query("cursor");
  const since = c.req.query("since");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);
  const db = createDb(c.env.DB);

  try {
    // 权限检查
    const hasAccess = await canAccessConversation(db, conversationId, user.id);
    if (!hasAccess) {
      return c.json(APIErrors.forbidden("Access denied"), 403);
    }

    const [conversation] = await db
      .select({
        id: conversations.id,
        teamId: conversations.teamId,
        userId: conversations.userId,
        leaderId: conversations.leaderId,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    const otherUserId = conversation
      ? conversation.userId === user.id ? conversation.leaderId : conversation.userId
      : null;
    const [otherUser] = otherUserId
      ? await db
          .select({
            id: users.id,
            name: users.name,
            nickname: users.nickname,
            image: users.image,
          })
          .from(users)
          .where(eq(users.id, otherUserId))
          .limit(1)
      : [];

    // 构建查询
    let whereConditions = and(
      eq(messages.conversationId, conversationId)
    );

    const isIncremental = !!since;

    if (isIncremental) {
      const sinceMs = parseInt(since, 10);
      if (!isNaN(sinceMs)) {
        const sinceDate = new Date(sinceMs);
        whereConditions = and(
          whereConditions,
          sql`${messages.createdAt} > ${sinceDate}`
        );
      }
    } else if (cursor) {
      const cursorMs = parseInt(cursor, 10);
      if (!isNaN(cursorMs)) {
        const cursorDate = new Date(cursorMs);
        whereConditions = and(
          whereConditions,
          sql`${messages.createdAt} < ${cursorDate}`
        );
      }
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
      .orderBy(isIncremental ? messages.createdAt : desc(messages.createdAt))
      .limit(limit);

    const senderIds = [...new Set(list.map((msg) => msg.senderId))];
    const senders = senderIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            nickname: users.nickname,
            image: users.image,
          })
          .from(users)
          .where(inArray(users.id, senderIds))
      : [];
    const sendersById = new Map<string, UserSummary>(senders.map((sender) => [sender.id, sender]));
    const messagesWithSender = list.map((msg) => ({
      ...msg,
      sender: sendersById.get(msg.senderId),
    }));

    // 异步标记对方消息为已读
    await runBackground(c, async () => {
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
        logger.error("Failed to mark messages as read:", err);
      }
    });

    return c.json({
      success: true,
      data: isIncremental ? messagesWithSender : messagesWithSender.reverse(),
      conversation: conversation
        ? {
            id: conversation.id,
            teamId: conversation.teamId,
            otherUser: otherUser || null,
          }
        : null,
      nextCursor:
        !isIncremental && list.length === limit && list.length > 0
          ? String(list[list.length - 1]?.createdAt?.getTime() || Date.now())
          : null,
    });
  } catch (error) {
    logger.error("Failed to get messages:", error);
    return c.json(APIErrors.internalError("Failed to get messages"), 500);
  }
});

/**
 * POST /messages/:id - 发送消息
 */
app.post("/:id", async (c) => {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json(APIErrors.unauthorized("Unauthorized"), 401);

  const user = session.user;
  const conversationId = c.req.param("id");

  // 速率限制：每用户每分钟最多 30 条消息
  const rateLimit = await checkRateLimit(
    c.env.GOMATE_KV,
    `rate:msg:${user.id}`,
    30,
    60
  );
  if (!rateLimit.allowed) {
    return c.json(
      APIErrors.badRequest(`发送过于频繁，请 ${rateLimit.retryAfter} 秒后重试`),
      429
    );
  }

  const body = await c.req.json();
  const db = createDb(c.env.DB);

  try {
    const { content } = sendMessageSchema.parse(body);

    // 权限检查
    const hasAccess = await canAccessConversation(db, conversationId, user.id);
    if (!hasAccess) {
      return c.json(APIErrors.forbidden("Access denied"), 403);
    }

    // 创建消息
    const messageId = generateId();
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
      return c.json(APIErrors.validationError("Invalid input", error.errors), 400);
    }
    logger.error("Failed to send message:", error);
    return c.json(APIErrors.internalError("Failed to send message"), 500);
  }
});

export default app;
