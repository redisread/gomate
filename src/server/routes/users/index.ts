import type { MiddlewareHandler } from "hono";
import type { ApiEnv } from "../../lib/openapi";
import { utcDateTimeSchema } from "@/contracts/input-formats";
import {
  PublicUserResponseSchema,
  SelfUserResponseSchema,
  SuccessSchema,
  TimelineRequestsResponseSchema,
  TimelineTeamsResponseSchema,
} from "@/contracts/public-responses";
import {
  and,
  desc,
  eq,
  exists,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { eraseAccount } from "../../lib/account-erasure";
import { APIErrors } from "../../lib/api-errors";
import { ownedAvatarKeyFromStoredValue } from "../../lib/avatar-media";
import {
  decodeContentCursor,
  encodeContentCursor,
  type ContentCursor,
} from "../../lib/content-cursor";
import { logger } from "../../lib/logger";
import {
  cookieSecurity,
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  legacyJsonBody,
  sessionMiddleware,
  validationHook,
  z,
} from "../../lib/openapi";
import { deleteR2ObjectsWithRetry } from "../../lib/r2-media";
import { getTeamLifecycle } from "../../lib/team-lifecycle";
import { activeTeamParticipantCount } from "../../lib/team-participant-count";
import { parseUserExtra, userExtraPatchExpression } from "../../lib/user-extra";
import {
  getUserOngoingTeams,
  getUserStats,
  toPublicUser,
  toSelfUser,
} from "./utils";

const usersRoute = createApiApp();
const privateAccountHeaders: MiddlewareHandler<ApiEnv> = async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("Pragma", "no-cache");
  await next();
};
const timelineQuerySchema = z.object({
  limit: z.string().optional().describe("Integer 1–50; default 10"),
  cursor: z.string().optional().describe("Opaque timeline cursor"),
  page: z.string().optional().describe("Unsupported; returns 400"),
  pageSize: z.string().optional().describe("Unsupported; returns 400"),
});

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]);

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    nickname: nullableText(100).optional(),
    bio: nullableText(1000).optional(),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    birthday: utcDateTimeSchema.nullable().optional(),
    extra: z
      .object({
        level: z
          .enum(["beginner", "intermediate", "advanced", "expert"])
          .optional(),
        wechat: nullableText(100).optional(),
        city: z.string().trim().min(1).max(64).nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required",
  );

const deleteAccountSchema = z
  .object({
    confirmation: z.literal("DELETE"),
  })
  .strict();

function parseCursorPage(c: {
  req: { query: (name: string) => string | undefined };
}):
  | { ok: true; limit: number; cursor: ContentCursor | null }
  | { ok: false; message: string } {
  if (
    c.req.query("page") !== undefined ||
    c.req.query("pageSize") !== undefined
  ) {
    return {
      ok: false,
      message: "page pagination is not supported; use cursor",
    };
  }
  const rawLimit = c.req.query("limit");
  if (rawLimit !== undefined && !/^[1-9]\d*$/u.test(rawLimit)) {
    return { ok: false, message: "limit must be an integer between 1 and 50" };
  }
  const limit = rawLimit === undefined ? 10 : Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    return { ok: false, message: "limit must be an integer between 1 and 50" };
  }
  const encodedCursor = c.req.query("cursor");
  const cursor =
    encodedCursor === undefined ? null : decodeContentCursor(encodedCursor);
  if (encodedCursor !== undefined && !cursor) {
    return { ok: false, message: "Invalid timeline cursor" };
  }
  return { ok: true, limit, cursor };
}

function teamSummary(row: {
  id: string;
  locationId: string;
  leaderId: string;
  activityType: schema.ActivityType;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  maxParticipants: number;
  requirements: string[];
  recruitmentStatus: schema.RecruitmentStatus;
  formedAt: Date | null;
  cancelledAt: Date | null;
  checklist: import("@/contracts").TeamChecklist | null;
  createdAt: Date;
  updatedAt: Date;
  activeParticipantCount: number;
  locationName: string;
  locationCoverImageUrl: string | null;
}) {
  return {
    id: row.id,
    locationId: row.locationId,
    leaderId: row.leaderId,
    activityType: row.activityType,
    title: row.title,
    description: row.description,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    maxParticipants: row.maxParticipants,
    activeParticipantCount: Number(row.activeParticipantCount),
    requirements: row.requirements,
    recruitmentStatus: row.recruitmentStatus,
    formedAt: row.formedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    lifecycle: getTeamLifecycle(row),
    isFull: Number(row.activeParticipantCount) >= row.maxParticipants,
    checklist: row.checklist,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    location: {
      id: row.locationId,
      name: row.locationName,
      coverImageUrl: row.locationCoverImageUrl,
    },
  };
}

const participantCount = activeTeamParticipantCount(schema.teams.id);

const teamSummarySelection = {
  id: schema.teams.id,
  locationId: schema.teams.locationId,
  leaderId: schema.teams.leaderId,
  activityType: schema.teams.activityType,
  title: schema.teams.title,
  description: schema.teams.description,
  startAt: schema.teams.startAt,
  endAt: schema.teams.endAt,
  maxParticipants: schema.teams.maxParticipants,
  requirements: schema.teams.requirements,
  recruitmentStatus: schema.teams.recruitmentStatus,
  formedAt: schema.teams.formedAt,
  cancelledAt: schema.teams.cancelledAt,
  checklist: schema.teams.checklist,
  createdAt: schema.teams.createdAt,
  updatedAt: schema.teams.updatedAt,
  activeParticipantCount: participantCount,
  locationName: schema.locations.name,
  locationCoverImageUrl: schema.locations.coverImageUrl,
};

function descendingTeamCursor(cursor: ContentCursor | null): SQL | undefined {
  if (!cursor) return undefined;
  const cursorDate = new Date(cursor.t);
  return or(
    lt(schema.teams.createdAt, cursorDate),
    and(eq(schema.teams.createdAt, cursorDate), lt(schema.teams.id, cursor.id)),
  );
}

export function buildCreatedTeamsPageQuery(
  db: ReturnType<typeof createDb>,
  userId: string,
  cursor: ContentCursor | null,
  limit: number,
) {
  return db
    .select(teamSummarySelection)
    .from(schema.teams)
    .innerJoin(
      schema.locations,
      eq(schema.locations.id, schema.teams.locationId),
    )
    .where(and(eq(schema.teams.leaderId, userId), descendingTeamCursor(cursor)))
    .orderBy(desc(schema.teams.createdAt), desc(schema.teams.id))
    .limit(limit);
}

export function buildJoinedTeamsPageQuery(
  db: ReturnType<typeof createDb>,
  userId: string,
  cursor: ContentCursor | null,
  limit: number,
) {
  return db
    .select(teamSummarySelection)
    .from(schema.teams)
    .innerJoin(
      schema.locations,
      eq(schema.locations.id, schema.teams.locationId),
    )
    .innerJoin(
      schema.teamMembers,
      and(
        eq(schema.teamMembers.teamId, schema.teams.id),
        eq(schema.teamMembers.userId, userId),
        isNull(schema.teamMembers.leftAt),
      ),
    )
    .where(descendingTeamCursor(cursor))
    .orderBy(desc(schema.teams.createdAt), desc(schema.teams.id))
    .limit(limit);
}

const ownJoinRequestSelection = {
  id: schema.teamJoinRequests.id,
  teamId: schema.teamJoinRequests.teamId,
  userId: schema.teamJoinRequests.userId,
  status: schema.teamJoinRequests.status,
  message: schema.teamJoinRequests.message,
  decidedByUserId: schema.teamJoinRequests.decidedByUserId,
  decidedAt: schema.teamJoinRequests.decidedAt,
  createdAt: schema.teamJoinRequests.createdAt,
  updatedAt: schema.teamJoinRequests.updatedAt,
  teamTitle: schema.teams.title,
};

const pendingJoinRequestSelection = {
  id: schema.teamJoinRequests.id,
  teamId: schema.teamJoinRequests.teamId,
  userId: schema.teamJoinRequests.userId,
  status: schema.teamJoinRequests.status,
  message: schema.teamJoinRequests.message,
  createdAt: schema.teamJoinRequests.createdAt,
  updatedAt: schema.teamJoinRequests.updatedAt,
  teamTitle: schema.teams.title,
  applicantName: schema.users.name,
  applicantNickname: schema.users.nickname,
  applicantImage: schema.users.image,
  applicantBio: schema.users.bio,
  applicantExtra: schema.users.extra,
};

function descendingJoinRequestCursor(
  cursor: ContentCursor | null,
): SQL | undefined {
  if (!cursor) return undefined;
  const cursorDate = new Date(cursor.t);
  return or(
    lt(schema.teamJoinRequests.createdAt, cursorDate),
    and(
      eq(schema.teamJoinRequests.createdAt, cursorDate),
      lt(schema.teamJoinRequests.id, cursor.id),
    ),
  );
}

export function buildOwnJoinRequestsPageQuery(
  db: ReturnType<typeof createDb>,
  userId: string,
  cursor: ContentCursor | null,
  limit: number,
) {
  return db
    .select(ownJoinRequestSelection)
    .from(schema.teamJoinRequests)
    .innerJoin(
      schema.teams,
      eq(schema.teams.id, schema.teamJoinRequests.teamId),
    )
    .where(
      and(
        eq(schema.teamJoinRequests.userId, userId),
        descendingJoinRequestCursor(cursor),
      ),
    )
    .orderBy(
      desc(schema.teamJoinRequests.createdAt),
      desc(schema.teamJoinRequests.id),
    )
    .limit(limit);
}

export function buildPendingJoinRequestsPageQuery(
  db: ReturnType<typeof createDb>,
  leaderId: string,
  cursor: ContentCursor | null,
  limit: number,
) {
  return db
    .select(pendingJoinRequestSelection)
    .from(schema.teamJoinRequests)
    .innerJoin(
      schema.teams,
      eq(schema.teams.id, schema.teamJoinRequests.teamId),
    )
    .innerJoin(
      schema.users,
      eq(schema.users.id, schema.teamJoinRequests.userId),
    )
    .where(
      and(
        eq(schema.teams.leaderId, leaderId),
        eq(schema.teamJoinRequests.status, "pending"),
        descendingJoinRequestCursor(cursor),
      ),
    )
    .orderBy(
      desc(schema.teamJoinRequests.createdAt),
      desc(schema.teamJoinRequests.id),
    )
    .limit(limit);
}

usersRoute.openapi(
  createRoute({
    method: "get",
    path: "/me",
    operationId: "usersMe",
    tags: ["users"],
    summary: "Read current account",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [privateAccountHeaders, sessionMiddleware()],
    request: {},
    responses: {
      200: jsonResponse(SelfUserResponseSchema, "Success"),
      ...errorResponses(401, 404, 500),
    },
  }),
  async (c) => {
    const userId = c.get("session").user.id;
    const db = createDb(c.env.DB);
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!user) return c.json(APIErrors.notFound("User not found"), 404);
    return c.json({ success: true as const, user: toSelfUser(user) }, 200);
  },
);

usersRoute.openapi(
  createRoute({
    method: "patch",
    path: "/me",
    operationId: "usersUpdateMe",
    tags: ["users"],
    summary: "Update account profile",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [sessionMiddleware(), legacyJsonBody("Invalid profile")],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: updateProfileSchema } },
      },
    },
    responses: {
      200: jsonResponse(SelfUserResponseSchema, "Success"),
      ...errorResponses(400, 401, 404, 409, 500, 403, 503),
    },
  }),
  async (c) => {
    const userId = c.get("session").user.id;
    const parsed = c.req.valid("json");
    const db = createDb(c.env.DB);
    const [current] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!current) return c.json(APIErrors.notFound("User not found"), 404);

    if (parsed.extra?.city) {
      const [region] = await db
        .select({ id: schema.region.id })
        .from(schema.region)
        .where(
          and(
            eq(schema.region.id, parsed.extra.city),
            eq(schema.region.level, "city"),
            eq(schema.region.serviceEnabled, true),
          ),
        )
        .limit(1);
      if (!region) {
        return c.json(
          APIErrors.validationError(
            "City must be a service-enabled city region",
          ),
          400,
        );
      }
    }

    const update: SQLiteUpdateSetSource<typeof schema.users> = {
      updatedAt: new Date(),
    };
    for (const key of ["name", "nickname", "bio", "gender"] as const) {
      if (parsed[key] !== undefined) update[key] = parsed[key] as never;
    }
    if (parsed.birthday !== undefined) {
      update.birthday = parsed.birthday ? new Date(parsed.birthday) : null;
    }
    if (parsed.extra) {
      update.extra = userExtraPatchExpression(schema.users.extra, parsed.extra);
    }

    try {
      let updateCondition = eq(schema.users.id, userId);
      const requestedCity = parsed.extra?.city;
      if (requestedCity !== undefined && requestedCity !== null) {
        const openCity = db
          .select({ value: sql<number>`1` })
          .from(schema.region)
          .where(
            and(
              eq(schema.region.id, requestedCity),
              eq(schema.region.level, "city"),
              eq(schema.region.serviceEnabled, true),
            ),
          );
        updateCondition = and(updateCondition, exists(openCity))!;
      }
      const [updated] = await db
        .update(schema.users)
        .set(update)
        .where(updateCondition)
        .returning();
      if (!updated) {
        return c.json(
          APIErrors.conflict("Profile city changed concurrently"),
          409,
        );
      }
      return c.json({ success: true as const, user: toSelfUser(updated) }, 200);
    } catch (error) {
      logger.error("user_profile_update_failed", error);
      return c.json(APIErrors.internalError("Failed to update profile"), 500);
    }
  },
  validationHook("Invalid profile", "issues"),
);

usersRoute.openapi(
  createRoute({
    method: "get",
    path: "/me/created-teams",
    operationId: "usersCreatedTeams",
    tags: ["users"],
    summary: "List teams I created",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [sessionMiddleware()],
    request: { query: timelineQuerySchema },
    responses: {
      200: jsonResponse(TimelineTeamsResponseSchema, "Success"),
      ...errorResponses(400, 401, 500),
    },
  }),
  async (c) => {
    const userId = c.get("session").user.id;
    const page = parseCursorPage(c);
    if (!page.ok) return c.json(APIErrors.badRequest(page.message), 400);
    const db = createDb(c.env.DB);
    const rows = await buildCreatedTeamsPageQuery(
      db,
      userId,
      page.cursor,
      page.limit + 1,
    );
    const hasMore = rows.length > page.limit;
    const teams = rows.slice(0, page.limit);
    const last = teams.at(-1);
    return c.json(
      {
        success: true as const,
        teams: teams.map(teamSummary),
        nextCursor:
          hasMore && last
            ? encodeContentCursor({ t: last.createdAt.getTime(), id: last.id })
            : null,
      },
      200,
    );
  },
  validationHook("Invalid input", "issues"),
);

usersRoute.openapi(
  createRoute({
    method: "get",
    path: "/me/joined-teams",
    operationId: "usersJoinedTeams",
    tags: ["users"],
    summary: "List teams I joined",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [sessionMiddleware()],
    request: { query: timelineQuerySchema },
    responses: {
      200: jsonResponse(TimelineTeamsResponseSchema, "Success"),
      ...errorResponses(400, 401, 500),
    },
  }),
  async (c) => {
    const userId = c.get("session").user.id;
    const page = parseCursorPage(c);
    if (!page.ok) return c.json(APIErrors.badRequest(page.message), 400);
    const db = createDb(c.env.DB);
    const rows = await buildJoinedTeamsPageQuery(
      db,
      userId,
      page.cursor,
      page.limit + 1,
    );
    const hasMore = rows.length > page.limit;
    const teams = rows.slice(0, page.limit);
    const last = teams.at(-1);
    return c.json(
      {
        success: true as const,
        teams: teams.map(teamSummary),
        nextCursor:
          hasMore && last
            ? encodeContentCursor({ t: last.createdAt.getTime(), id: last.id })
            : null,
      },
      200,
    );
  },
  validationHook("Invalid input", "issues"),
);

usersRoute.openapi(
  createRoute({
    method: "get",
    path: "/me/join-requests",
    operationId: "usersJoinRequests",
    tags: ["users"],
    summary: "List my join requests",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [sessionMiddleware()],
    request: { query: timelineQuerySchema },
    responses: {
      200: jsonResponse(TimelineRequestsResponseSchema, "Success"),
      ...errorResponses(400, 401, 500),
    },
  }),
  async (c) => {
    const userId = c.get("session").user.id;
    const page = parseCursorPage(c);
    if (!page.ok) return c.json(APIErrors.badRequest(page.message), 400);
    const db = createDb(c.env.DB);
    const rows = await buildOwnJoinRequestsPageQuery(
      db,
      userId,
      page.cursor,
      page.limit + 1,
    );
    const hasMore = rows.length > page.limit;
    const requests = rows.slice(0, page.limit);
    const last = requests.at(-1);
    return c.json(
      {
        success: true as const,
        requests: requests.map((request) => ({
          ...request,
          decidedAt: request.decidedAt?.toISOString() ?? null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
          team: { id: request.teamId, title: request.teamTitle },
        })),
        nextCursor:
          hasMore && last
            ? encodeContentCursor({ t: last.createdAt.getTime(), id: last.id })
            : null,
      },
      200,
    );
  },
  validationHook("Invalid input", "issues"),
);

usersRoute.openapi(
  createRoute({
    method: "get",
    path: "/me/pending-join-requests",
    operationId: "usersPendingJoinRequests",
    tags: ["users"],
    summary: "List requests awaiting my decision",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [sessionMiddleware()],
    request: { query: timelineQuerySchema },
    responses: {
      200: jsonResponse(TimelineRequestsResponseSchema, "Success"),
      ...errorResponses(400, 401, 500),
    },
  }),
  async (c) => {
    const userId = c.get("session").user.id;
    const page = parseCursorPage(c);
    if (!page.ok) return c.json(APIErrors.badRequest(page.message), 400);
    const db = createDb(c.env.DB);
    const rows = await buildPendingJoinRequestsPageQuery(
      db,
      userId,
      page.cursor,
      page.limit + 1,
    );
    const hasMore = rows.length > page.limit;
    const requests = rows.slice(0, page.limit);
    const last = requests.at(-1);
    return c.json(
      {
        success: true as const,
        requests: requests.map((request) => ({
          id: request.id,
          teamId: request.teamId,
          userId: request.userId,
          status: request.status,
          message: request.message,
          decidedByUserId: null,
          decidedAt: null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
          team: { id: request.teamId, title: request.teamTitle },
          user: {
            id: request.userId,
            name: request.applicantName,
            nickname: request.applicantNickname,
            image: request.applicantImage,
            bio: request.applicantBio,
            extra: parseUserExtra(request.applicantExtra),
          },
        })),
        nextCursor:
          hasMore && last
            ? encodeContentCursor({ t: last.createdAt.getTime(), id: last.id })
            : null,
      },
      200,
    );
  },
  validationHook("Invalid input", "issues"),
);

usersRoute.openapi(
  createRoute({
    method: "delete",
    path: "/me",
    operationId: "usersDeleteMe",
    tags: ["users"],
    summary: "Delete current account",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [
      sessionMiddleware("请先登录"),
      legacyJsonBody("请输入 DELETE 确认删除账户"),
    ],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: deleteAccountSchema } },
      },
    },
    responses: {
      200: jsonResponse(SuccessSchema, "Success"),
      ...errorResponses(400, 401, 500, 403, 503),
    },
  }),
  async (c) => {
    const userId = c.get("session").user.id;

    const db = createDb(c.env.DB);
    const [user] = await db
      .select({
        email: schema.users.email,
        image: schema.users.image,
        status: schema.users.status,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!user) return c.json(APIErrors.unauthorized("用户不存在"), 401);
    const deletedEmail = `deleted-${userId}@deleted.invalid`;
    if (user.status === "deleted" && user.email === deletedEmail) {
      return c.json({ success: true as const }, 200);
    }

    const avatarKey = user.image
      ? ownedAvatarKeyFromStoredValue(
          c.env,
          new URL(c.req.raw.url),
          user.image,
          userId,
        )
      : null;
    if (avatarKey) {
      if (!c.env.R2) {
        return c.json(APIErrors.serviceUnavailable("头像存储暂不可用"), 503);
      }
      try {
        await deleteR2ObjectsWithRetry(c.env.R2, [avatarKey]);
      } catch (error) {
        logger.error("account_avatar_cleanup_failed", {
          errorType: error instanceof Error ? error.name : "UnknownR2Error",
        });
        return c.json(APIErrors.internalError("账户媒体清理失败"), 500);
      }
    }

    try {
      await eraseAccount(c.env.DB, {
        userId,
        currentEmail: user.email,
        now: Date.now(),
      });
      return c.json({ success: true as const }, 200);
    } catch (error) {
      const current = await c.env.DB.prepare(
        "SELECT status, email FROM users WHERE id = ?",
      )
        .bind(userId)
        .first<{ status: string; email: string }>()
        .catch(() => null);
      if (current?.status === "deleted" && current.email === deletedEmail) {
        return c.json({ success: true as const }, 200);
      }
      logger.error("account_erasure_failed", {
        errorType: error instanceof Error ? error.name : "UnknownDatabaseError",
      });
      return c.json(APIErrors.internalError("账户删除失败"), 500);
    }
  },
  validationHook("请输入 DELETE 确认删除账户", "none"),
);

usersRoute.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    operationId: "usersGet",
    tags: ["users"],
    summary: "Read public user profile",
    "x-audience": "public",
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: jsonResponse(PublicUserResponseSchema, "Success"),
      ...errorResponses(400, 404, 500),
    },
  }),
  async (c) => {
    const id = c.req.valid("param").id;
    const db = createDb(c.env.DB);
    const [user] = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, id),
          eq(schema.users.status, "active"),
          eq(schema.users.emailVerified, true),
          isNull(schema.users.deletedAt),
        ),
      )
      .limit(1);
    if (!user) {
      return c.json(APIErrors.notFound("User not found"), 404);
    }
    const [stats, ongoingTeams] = await Promise.all([
      getUserStats(db, id),
      getUserOngoingTeams(db, id),
    ]);
    return c.json(
      {
        success: true as const,
        user: { ...toPublicUser(user), stats },
        ongoingTeams,
      },
      200,
    );
  },
  validationHook("Invalid input", "issues"),
);

export default usersRoute;
export { usersRoute };
