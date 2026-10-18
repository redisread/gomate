import { SuccessSchema } from "@/contracts/public-responses";
import { eq } from "drizzle-orm";
import { eraseAccount } from "../../lib/account-erasure";
import { ownedAvatarKeyFromStoredValue } from "../../lib/avatar-media";
import { deleteR2ObjectsWithRetry } from "../../lib/r2-media";
import { logger } from "../../lib/logger";
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

const account = createApiApp();
const deleteAccountSchema = z
  .object({
    confirmation: z
      .literal("DELETE")
      .describe("必须精确填写 DELETE，以确认匿名化账号并撤销凭证。"),
  })
  .strict();

account.openapi(
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

export default account;
