import { Hono } from "hono";
import { z } from "zod";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { createDb } from "../db";
import {
  conversations,
  messages,
  teamMembers,
  teams,
  users,
} from "../db/schema";
import { APIErrors } from "../lib/api-errors";
import type { Env } from "../lib/auth";
import { getActiveSession } from "../lib/active-session";
import { mapDatabaseError } from "../lib/database-errors";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";
import {
  decodeMessageCursor,
  encodeMessageCursor,
} from "../lib/message-cursor";

const messagesRoute = new Hono<{ Bindings: Env }>();

const createConversationSchema = z.object({
  teamId: z.string().trim().min(1).max(64),
  memberUserId: z.string().trim().min(1).max(64).optional(),
}).strict();

const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(1000),
}).strict();

type Db = ReturnType<typeof createDb>;

const conversationActivityAt = sql<number>`coalesce(
  ${conversations.lastMessageAt},
  ${conversations.createdAt}
)`;

const activeConversationMemberExists = sql`exists (
  select 1
  from ${teamMembers} as active_conversation_member
  where active_conversation_member.team_id = ${conversations.teamId}
    and active_conversation_member.user_id = ${conversations.memberUserId}
    and active_conversation_member.left_at is null
)`;

export function buildConversationInboxQuery(
  db: Db,
  where: SQL | undefined,
  limit: number,
) {
  return db
    .select({
      id: conversations.id,
      teamId: conversations.teamId,
      memberUserId: conversations.memberUserId,
      initiatedByUserId: conversations.initiatedByUserId,
      lastMessagePreview: conversations.lastMessagePreview,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      leaderId: teams.leaderId,
      teamTitle: teams.title,
    })
    .from(conversations)
    .innerJoin(teams, eq(teams.id, conversations.teamId))
    .where(and(where, activeConversationMemberExists))
    .orderBy(desc(conversationActivityAt), desc(conversations.id))
    .limit(limit);
}

export function buildMessageHistoryQuery(
  db: Db,
  where: SQL | undefined,
  userId: string,
  limit: number,
) {
  return db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .innerJoin(teams, eq(teams.id, conversations.teamId))
    .where(and(
      where,
      activeConversationMemberExists,
      or(
        eq(conversations.memberUserId, userId),
        eq(teams.leaderId, userId),
      ),
    ))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(limit);
}

async function sessionUserId(c: {
  env: Env;
  req: { raw: Request };
}): Promise<string | null> {
  const session = await getActiveSession(c.env, c.req.raw.headers);
  return session?.user.id ?? null;
}

async function activeMember(
  db: Db,
  teamId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        isNull(teamMembers.leftAt),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function resolveConversationMember(
  db: Db,
  teamId: string,
  requesterId: string,
  requestedMemberUserId?: string,
): Promise<
  | { ok: true; memberUserId: string }
  | { ok: false; status: 400 | 403 | 404; body: ReturnType<typeof APIErrors.badRequest> }
> {
  const [team] = await db
    .select({ leaderId: teams.leaderId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) {
    return { ok: false, status: 404, body: APIErrors.notFound("Team not found") };
  }

  if (team.leaderId === requesterId) {
    if (!requestedMemberUserId) {
      return {
        ok: false,
        status: 400,
        body: APIErrors.badRequest("memberUserId is required for a team leader"),
      };
    }
    if (!(await activeMember(db, teamId, requestedMemberUserId))) {
      return {
        ok: false,
        status: 403,
        body: APIErrors.forbidden("Target is not an active team member"),
      };
    }
    return { ok: true, memberUserId: requestedMemberUserId };
  }

  if (requestedMemberUserId && requestedMemberUserId !== requesterId) {
    return {
      ok: false,
      status: 403,
      body: APIErrors.forbidden("Members cannot choose another conversation member"),
    };
  }
  if (!(await activeMember(db, teamId, requesterId))) {
    return {
      ok: false,
      status: 403,
      body: APIErrors.forbidden("Only an active team member can start this conversation"),
    };
  }
  return { ok: true, memberUserId: requesterId };
}

async function getConversationAccess(
  db: Db,
  conversationId: string,
  userId: string,
) {
  const [row] = await db
    .select({
      id: conversations.id,
      teamId: conversations.teamId,
      memberUserId: conversations.memberUserId,
      initiatedByUserId: conversations.initiatedByUserId,
      leaderId: teams.leaderId,
      teamTitle: teams.title,
    })
    .from(conversations)
    .innerJoin(teams, eq(teams.id, conversations.teamId))
    .innerJoin(
      teamMembers,
      and(
        eq(teamMembers.teamId, conversations.teamId),
        eq(teamMembers.userId, conversations.memberUserId),
        isNull(teamMembers.leftAt),
      ),
    )
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!row || (row.memberUserId !== userId && row.leaderId !== userId)) {
    return null;
  }
  return row;
}

function publicUser(user: {
  id: string;
  name: string;
  nickname: string | null;
  image: string | null;
}) {
  return user;
}

function isoTimestamp(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function parseLimit(
  raw: string | undefined,
  fallback: number,
  maximum: number,
): number | null {
  if (raw === undefined) return fallback;
  if (!/^[1-9]\d*$/u.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value <= maximum ? value : null;
}

function changedRows(result: unknown): number {
  const value = result as {
    changes?: number;
    meta?: { changes?: number };
  };
  return Number(value.meta?.changes ?? value.changes ?? 0);
}

function currentConversationAccessCondition(
  conversationId: string,
  userId: string,
) {
  return sql`EXISTS (
    SELECT 1
    FROM conversations AS authorized_conversation
    INNER JOIN teams AS authorized_team
      ON authorized_team.id = authorized_conversation.team_id
    INNER JOIN team_members AS authorized_member
      ON authorized_member.team_id = authorized_conversation.team_id
      AND authorized_member.user_id = authorized_conversation.member_user_id
      AND authorized_member.left_at IS NULL
    WHERE authorized_conversation.id = ${conversationId}
      AND (
        authorized_conversation.member_user_id = ${userId}
        OR authorized_team.leader_id = ${userId}
      )
  )`;
}

messagesRoute.get("/", async (c) => {
  const userId = await sessionUserId(c);
  if (!userId) return c.json(APIErrors.unauthorized(), 401);
  const db = createDb(c.env.DB);
  if (c.req.query("page") !== undefined || c.req.query("pageSize") !== undefined) {
    return c.json(APIErrors.badRequest("page pagination is not supported; use cursor"), 400);
  }
  const limit = parseLimit(c.req.query("limit"), 20, 50);
  if (limit === null) {
    return c.json(APIErrors.badRequest("limit must be an integer between 1 and 50"), 400);
  }
  const conditions = [
    or(
      eq(conversations.memberUserId, userId),
      eq(teams.leaderId, userId),
    )!,
  ];
  const encodedCursor = c.req.query("cursor");
  if (encodedCursor !== undefined) {
    try {
      const cursor = decodeMessageCursor(encodedCursor);
      conditions.push(
        or(
          lt(conversationActivityAt, cursor.t),
          and(
            eq(conversationActivityAt, cursor.t),
            lt(conversations.id, cursor.id),
          ),
        )!,
      );
    } catch {
      return c.json(APIErrors.badRequest("Invalid conversation cursor"), 400);
    }
  }

  try {
    const fetchedRows = await buildConversationInboxQuery(
      db,
      and(...conditions),
      limit + 1,
    );
    const hasMore = fetchedRows.length > limit;
    const rows = fetchedRows.slice(0, limit);

    const otherUserIds = [
      ...new Set(
        rows.map((row) =>
          row.memberUserId === userId ? row.leaderId : row.memberUserId,
        ),
      ),
    ];
    const otherUsers = otherUserIds.length
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
    const userById = new Map(otherUsers.map((user) => [user.id, publicUser(user)]));

    const ids = rows.map((row) => row.id);
    const unreadRows = ids.length
      ? await db
          .select({
            conversationId: messages.conversationId,
            count: sql<number>`count(*)`,
          })
          .from(messages)
          .where(
            and(
              inArray(messages.conversationId, ids),
              isNull(messages.readAt),
              ne(messages.senderId, userId),
            ),
          )
          .groupBy(messages.conversationId)
      : [];
    const unreadByConversation = new Map(
      unreadRows.map((row) => [row.conversationId, Number(row.count)]),
    );

    const oldest = rows.at(-1);
    const oldestActivityAt = oldest?.lastMessageAt ?? oldest?.createdAt;

    return c.json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        teamId: row.teamId,
        memberUserId: row.memberUserId,
        initiatedByUserId: row.initiatedByUserId,
        lastMessagePreview: row.lastMessagePreview,
        lastMessageAt: isoTimestamp(row.lastMessageAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        team: { id: row.teamId, title: row.teamTitle },
        otherUser: userById.get(
          row.memberUserId === userId ? row.leaderId : row.memberUserId,
        ) ?? null,
        unreadCount: unreadByConversation.get(row.id) ?? 0,
      })),
      nextCursor:
        hasMore && oldest && oldestActivityAt
          ? encodeMessageCursor({
              t: oldestActivityAt.getTime(),
              id: oldest.id,
            })
          : null,
    });
  } catch (error) {
    logger.error("messages_conversations_list_failed", error);
    return c.json(APIErrors.internalError("Failed to load conversations"), 500);
  }
});

messagesRoute.post("/", async (c) => {
  const userId = await sessionUserId(c);
  if (!userId) return c.json(APIErrors.unauthorized(), 401);
  const parsed = createConversationSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(APIErrors.validationError("Invalid input", parsed.error.issues), 400);
  }
  const db = createDb(c.env.DB);
  const participants = await resolveConversationMember(
    db,
    parsed.data.teamId,
    userId,
    parsed.data.memberUserId,
  );
  if (!participants.ok) return c.json(participants.body, participants.status);

  const where = and(
    eq(conversations.teamId, parsed.data.teamId),
    eq(conversations.memberUserId, participants.memberUserId),
  );
  const id = generateId();
  try {
    const result = await db.run(sql`
      INSERT OR IGNORE INTO conversations (
        id, team_id, member_user_id, initiated_by_user_id
      )
      SELECT
        ${id}, authorized_team.id, authorized_member.user_id, ${userId}
      FROM teams AS authorized_team
      INNER JOIN team_members AS authorized_member
        ON authorized_member.team_id = authorized_team.id
        AND authorized_member.user_id = ${participants.memberUserId}
        AND authorized_member.left_at IS NULL
      WHERE authorized_team.id = ${parsed.data.teamId}
        AND (
          authorized_team.leader_id = ${userId}
          OR authorized_member.user_id = ${userId}
        )
    `);
    const [created] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .innerJoin(teams, eq(teams.id, conversations.teamId))
      .innerJoin(
        teamMembers,
        and(
          eq(teamMembers.teamId, conversations.teamId),
          eq(teamMembers.userId, conversations.memberUserId),
          isNull(teamMembers.leftAt),
        ),
      )
      .where(and(
        where,
        or(
          eq(conversations.memberUserId, userId),
          eq(teams.leaderId, userId),
        ),
      ))
      .limit(1);
    if (!created) {
      return c.json(APIErrors.forbidden("Conversation participants are no longer active"), 403);
    }
    const isNew = changedRows(result) === 1 && created.id === id;
    return c.json(
      { success: true, data: { id: created.id, isNew } },
      isNew ? 201 : 200,
    );
  } catch (error) {
    logger.error("messages_conversation_create_failed", error);
    const mapped = mapDatabaseError(error);
    return c.json(mapped.body, mapped.status);
  }
});

messagesRoute.get("/unread-count", async (c) => {
  const userId = await sessionUserId(c);
  if (!userId) return c.json(APIErrors.unauthorized(), 401);
  const db = createDb(c.env.DB);
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .innerJoin(teams, eq(teams.id, conversations.teamId))
      .innerJoin(
        teamMembers,
        and(
          eq(teamMembers.teamId, conversations.teamId),
          eq(teamMembers.userId, conversations.memberUserId),
          isNull(teamMembers.leftAt),
        ),
      )
      .where(
        and(
          isNull(messages.readAt),
          ne(messages.senderId, userId),
          or(
            eq(conversations.memberUserId, userId),
            eq(teams.leaderId, userId),
          ),
        ),
      );
    return c.json({ success: true, data: { count: Number(row?.count ?? 0) } });
  } catch (error) {
    logger.error("messages_unread_count_failed", error);
    return c.json(APIErrors.internalError("Failed to load unread count"), 500);
  }
});

messagesRoute.get("/:conversationId", async (c) => {
  const userId = await sessionUserId(c);
  if (!userId) return c.json(APIErrors.unauthorized(), 401);
  const db = createDb(c.env.DB);
  const conversationId = c.req.param("conversationId");
  if (c.req.query("since") !== undefined) {
    return c.json(APIErrors.badRequest("since is not supported; use cursor"), 400);
  }
  const access = await getConversationAccess(db, conversationId, userId);
  if (!access) return c.json(APIErrors.forbidden("Access denied"), 403);

  const limit = parseLimit(c.req.query("limit"), 20, 50);
  if (limit === null) {
    return c.json(APIErrors.badRequest("limit must be an integer between 1 and 50"), 400);
  }
  const conditions = [eq(messages.conversationId, conversationId)];
  const encodedCursor = c.req.query("cursor");
  if (encodedCursor) {
    try {
      const cursor = decodeMessageCursor(encodedCursor);
      const cursorDate = new Date(cursor.t);
      conditions.push(
        or(
          lt(messages.createdAt, cursorDate),
          and(eq(messages.createdAt, cursorDate), lt(messages.id, cursor.id)),
        )!,
      );
    } catch {
      return c.json(APIErrors.badRequest("Invalid message cursor"), 400);
    }
  }

  try {
    const rows = await buildMessageHistoryQuery(
      db,
      and(...conditions),
      userId,
      limit + 1,
    );
    if (rows.length === 0 && !(await getConversationAccess(db, conversationId, userId))) {
      return c.json(APIErrors.forbidden("Access changed before messages were loaded"), 403);
    }
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const senderIds = [...new Set(page.map((message) => message.senderId))];
    const senders = senderIds.length
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
    const senderById = new Map(senders.map((sender) => [sender.id, publicUser(sender)]));
    const otherUserId =
      access.memberUserId === userId ? access.leaderId : access.memberUserId;
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
    const oldest = page.at(-1);

    return c.json({
      success: true,
      data: page
        .map((message) => ({
          ...message,
          readAt: isoTimestamp(message.readAt),
          createdAt: message.createdAt.toISOString(),
          sender: senderById.get(message.senderId) ?? null,
        }))
        .reverse(),
      nextCursor:
        hasMore && oldest
          ? encodeMessageCursor({ t: oldest.createdAt.getTime(), id: oldest.id })
          : null,
      conversation: {
        id: access.id,
        teamId: access.teamId,
        memberUserId: access.memberUserId,
        initiatedByUserId: access.initiatedByUserId,
        team: { id: access.teamId, title: access.teamTitle },
        otherUser: otherUser ? publicUser(otherUser) : null,
      },
    });
  } catch (error) {
    logger.error("messages_history_get_failed", error);
    return c.json(APIErrors.internalError("Failed to load messages"), 500);
  }
});

messagesRoute.post("/:conversationId", async (c) => {
  const userId = await sessionUserId(c);
  if (!userId) return c.json(APIErrors.unauthorized(), 401);
  const parsed = sendMessageSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(APIErrors.validationError("Invalid input", parsed.error.issues), 400);
  }
  const db = createDb(c.env.DB);
  const conversationId = c.req.param("conversationId");
  if (!(await getConversationAccess(db, conversationId, userId))) {
    return c.json(APIErrors.forbidden("Access denied"), 403);
  }

  const id = generateId();
  try {
    const result = await db.run(sql`
      INSERT INTO messages (id, conversation_id, sender_id, content)
      SELECT ${id}, authorized_conversation.id, ${userId}, ${parsed.data.content}
      FROM conversations AS authorized_conversation
      INNER JOIN teams AS authorized_team
        ON authorized_team.id = authorized_conversation.team_id
      INNER JOIN team_members AS authorized_member
        ON authorized_member.team_id = authorized_conversation.team_id
        AND authorized_member.user_id = authorized_conversation.member_user_id
        AND authorized_member.left_at IS NULL
      WHERE authorized_conversation.id = ${conversationId}
        AND (
          authorized_conversation.member_user_id = ${userId}
          OR authorized_team.leader_id = ${userId}
        )
    `);
    if (changedRows(result) !== 1) {
      return c.json(APIErrors.forbidden("Access changed before the message was sent"), 403);
    }
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    return c.json(
      {
        success: true,
        data: {
          ...message,
          readAt: isoTimestamp(message.readAt),
          createdAt: message.createdAt.toISOString(),
        },
      },
      201,
    );
  } catch (error) {
    logger.error("messages_send_failed", error);
    const mapped = mapDatabaseError(error);
    return c.json(mapped.body, mapped.status);
  }
});

messagesRoute.patch("/:conversationId/read", async (c) => {
  const userId = await sessionUserId(c);
  if (!userId) return c.json(APIErrors.unauthorized(), 401);
  const db = createDb(c.env.DB);
  const conversationId = c.req.param("conversationId");
  if (!(await getConversationAccess(db, conversationId, userId))) {
    return c.json(APIErrors.forbidden("Access denied"), 403);
  }
  try {
    const result = await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          isNull(messages.readAt),
          ne(messages.senderId, userId),
          currentConversationAccessCondition(conversationId, userId),
        ),
      );
    if (changedRows(result) === 0 && !(await getConversationAccess(db, conversationId, userId))) {
      return c.json(APIErrors.forbidden("Access changed before messages were marked read"), 403);
    }
    return c.json({ success: true });
  } catch (error) {
    logger.error("messages_mark_read_failed", error);
    const mapped = mapDatabaseError(error);
    return c.json(mapped.body, mapped.status);
  }
});

export default messagesRoute;
