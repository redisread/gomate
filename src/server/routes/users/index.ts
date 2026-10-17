import { firstQueryStringSchema } from "@/contracts/input-formats";
import type { MiddlewareHandler } from "hono";
import type { ApiEnv } from "../../lib/openapi";
import { utcDateTimeSchema } from "@/contracts/input-formats";
import {
  PublicUserResponseSchema,
  SelfUserResponseSchema,
  SuccessSchema,
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
import { userExtraPatchExpression } from "../../lib/user-extra";
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
  limit: firstQueryStringSchema.describe("每页条数，1–50 的整数，默认 10。"),
  cursor: firstQueryStringSchema.describe(
    "上一页的 nextCursor，原样传回以继续读取。",
  ),
  page: firstQueryStringSchema.describe("不支持此参数，传入时返回 400。"),
  pageSize: firstQueryStringSchema.describe("不支持此参数，传入时返回 400。"),
});

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]);

const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .describe("姓名，去除首尾空白后为 1–100 字符。"),
    nickname: nullableText(100).optional().describe("昵称；null 表示清空。"),
    bio: nullableText(1000)
      .optional()
      .describe("个人简介，最多 1000 字符；null 表示清空。"),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    birthday: utcDateTimeSchema
      .nullable()
      .optional()
      .describe("UTC 时间戳，以 Z 结尾；null 表示清空。"),
    extra: z
      .object({
        level: z
          .enum(["beginner", "intermediate", "advanced", "expert"])
          .optional(),
        wechat: nullableText(100).optional(),
        city: z.string().trim().min(1).max(64).nullable().optional(),
      })
      .strict()
      .optional()
      .describe("按提交的子字段合并，未提交的子字段保留。"),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required",
  );

const deleteAccountSchema = z
  .object({
    confirmation: z
      .literal("DELETE")
      .describe("必须精确填写 DELETE，以确认匿名化账号并撤销凭证。"),
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
  meetingPoint: string | null;
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
    meetingPoint: row.meetingPoint,
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
  meetingPoint: schema.teams.meetingPoint,
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

usersRoute.openapi(
  createRoute({
    description:
      "需要登录。返回当前用户的完整产品资料及当前角色，响应禁止缓存。role 可用于界面展示，但不能代替管理员接口的服务端授权检查。",
    method: "get",
    path: "/me",
    operationId: "usersMe",
    tags: ["用户"],
    summary: "读取当前账号资料",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [privateAccountHeaders, sessionMiddleware()],
    request: {},
    responses: {
      200: jsonResponse(
        SelfUserResponseSchema,
        "请求成功，响应字段见下方结构。",
      ),
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
    description:
      "需要登录，不能指定其他用户 ID。至少提交一个字段，未提交字段保留，可空字段传 null 表示清空。extra 按字段合并；不接受头像字段，头像应通过上传接口修改。成功返回更新后的资料。",
    method: "patch",
    path: "/me",
    operationId: "usersUpdateMe",
    tags: ["用户"],
    summary: "修改当前账号资料",
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
      200: jsonResponse(
        SelfUserResponseSchema,
        "请求成功，响应字段见下方结构。",
      ),
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
    description:
      "需要登录，仅查询当前用户作为队长的队伍。limit 默认 10、范围 1–50，使用 cursor 继续读取；不支持 page/pageSize，nextCursor 为 null 表示结束。",
    method: "get",
    path: "/me/created-teams",
    operationId: "usersCreatedTeams",
    tags: ["用户"],
    summary: "分页读取我创建的队伍",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [sessionMiddleware()],
    request: { query: timelineQuerySchema },
    responses: {
      200: jsonResponse(
        TimelineTeamsResponseSchema,
        "请求成功，响应字段见下方结构。",
      ),
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
    description:
      "需要登录，仅查询当前用户尚未离开的成员关系对应队伍。limit 默认 10、范围 1–50，使用 cursor 分页；不包含已离队的历史成员关系。",
    method: "get",
    path: "/me/joined-teams",
    operationId: "usersJoinedTeams",
    tags: ["用户"],
    summary: "分页读取我加入的队伍",
    "x-audience": "public",
    security: cookieSecurity,
    middleware: [sessionMiddleware()],
    request: { query: timelineQuerySchema },
    responses: {
      200: jsonResponse(
        TimelineTeamsResponseSchema,
        "请求成功，响应字段见下方结构。",
      ),
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
    description:
      '需要登录，JSON body 必须为 {"confirmation":"DELETE"}。先清理自有头像，再匿名化账号并撤销全部登录凭证和会话；历史队伍关联保留。该操作不可通过再次登录撤销。',
    method: "delete",
    path: "/me",
    operationId: "usersDeleteMe",
    tags: ["用户"],
    summary: "删除当前账号",
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
      200: jsonResponse(SuccessSchema, "请求成功，响应字段见下方结构。"),
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
    description:
      "无需登录。按用户 ID 返回公开资料及进行中的队伍，不返回邮箱、私密联系方式或完整账号资料；用户不存在或不可公开访问时返回 404。",
    method: "get",
    path: "/{id}",
    operationId: "usersGet",
    tags: ["用户"],
    summary: "读取用户公开资料",
    "x-audience": "public",
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: jsonResponse(
        PublicUserResponseSchema,
        "请求成功，响应字段见下方结构。",
      ),
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
