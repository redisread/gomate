import type { MiddlewareHandler } from "hono";
import type { ApiEnv } from "../../lib/openapi";
import { utcDateTimeSchema } from "@/contracts/input-formats";
import { SelfUserResponseSchema } from "@/contracts/public-responses";
import { and, eq, exists, sql } from "drizzle-orm";
import type { SQLiteUpdateSetSource } from "drizzle-orm/sqlite-core";
import { logger } from "../../lib/logger";
import { userExtraPatchExpression } from "../../lib/user-extra";
import { toSelfUser } from "./utils";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import { APIErrors } from "../../lib/api-errors";
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

const profile = createApiApp();
const privateAccountHeaders: MiddlewareHandler<ApiEnv> = async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("Pragma", "no-cache");
  await next();
};
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

profile.openapi(
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

profile.openapi(
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

export default profile;
