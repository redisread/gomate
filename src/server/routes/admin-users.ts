import { cookieSecurity } from "../lib/openapi";
import { AdminUserSummarySchema, type AdminUserSummary } from "@/contracts";
import type { AdminErrorReason } from "@/contracts/admin-i18n";
import { and, desc, eq, like, lt, or, type SQL } from "drizzle-orm";

import { createDb } from "../db";
import * as schema from "../db/schema";

import { APIErrors } from "../lib/api-errors";
import {
  decodeContentCursor,
  encodeContentCursor,
} from "../lib/content-cursor";
import {
  createApiApp,
  createRoute,
  z,
  jsonResponse,
  errorResponses,
  validationHook,
  adminMiddleware,
  legacyJsonBody,
} from "../lib/openapi";

const adminUsersRoute = createApiApp();

const listSchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100)
      .optional()
      .describe("按姓名或邮箱搜索，最多 100 字符；使用数据库 LIKE 匹配。"),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .describe("每页条数，默认 20，范围 1–50。"),
    cursor: z
      .string()
      .max(500)
      .optional()
      .describe("分页游标：原样传回上一页的 nextCursor；更换筛选条件时省略。"),
  })
  .strict();

const roleSchema = z
  .object({
    role: z
      .enum(["user", "admin"])
      .describe("目标角色：user 普通用户或 admin 管理员。"),
  })
  .strict();

function toAdminUser(row: typeof schema.users.$inferSelect): AdminUserSummary {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    email: row.email,
    image: row.image,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

const adminUsersList = createRoute({
  description:
    "仅当前有效管理员可用。q 搜索姓名或邮箱，limit 默认 20、范围 1–50，按创建时间和 ID 倒序分页。响应包含用户角色、状态及 nextCursor；不支持按角色或状态筛选。",
  method: "get",
  path: "/",
  operationId: "listAdminUsers",
  summary: "分页查询用户",
  tags: ["用户管理"],
  "x-audience": "admin",
  security: cookieSecurity,
  middleware: [adminMiddleware()],
  request: { query: listSchema },
  responses: {
    200: jsonResponse(
      z.object({
        success: z.literal(true),
        users: z.array(AdminUserSummarySchema),
        nextCursor: z.string().nullable(),
      }),
      "用户列表及下一页游标。",
    ),
    ...errorResponses(400, 401, 403, 500),
  },
});
adminUsersRoute.openapi(
  adminUsersList,
  async (c) => {
    const query = c.req.valid("query");
    const cursor = query.cursor ? decodeContentCursor(query.cursor) : null;
    if (query.cursor && !cursor) {
      return c.json(APIErrors.badRequest("Invalid user cursor"), 400);
    }

    const conditions: SQL[] = [];
    if (query.q) {
      const pattern = `%${query.q}%`;
      conditions.push(
        or(
          like(schema.users.name, pattern),
          like(schema.users.email, pattern),
        )!,
      );
    }
    if (cursor) {
      const createdAt = new Date(cursor.t);
      conditions.push(
        or(
          lt(schema.users.createdAt, createdAt),
          and(
            eq(schema.users.createdAt, createdAt),
            lt(schema.users.id, cursor.id),
          ),
        )!,
      );
    }

    const db = createDb(c.env.DB);
    const rows = await db
      .select()
      .from(schema.users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.users.createdAt), desc(schema.users.id))
      .limit(query.limit + 1);
    const hasMore = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return c.json(
      {
        success: true as const,
        users: page.map(toAdminUser),
        nextCursor:
          hasMore && last
            ? encodeContentCursor({ t: last.createdAt.getTime(), id: last.id })
            : null,
      },
      200,
    );
  },
  validationHook("Invalid user filters", "issues"),
);

const adminUserRole = createRoute({
  description:
    "仅当前有效管理员可用。body.role 为 user 或 admin；不能修改自己的角色，也不能撤销最后一个有效管理员。最终更新会重新检查这些约束，冲突返回 409，error.details.reason 提供稳定原因分类。",
  method: "patch",
  path: "/{id}/role",
  operationId: "setAdminUserRole",
  summary: "修改用户角色",
  tags: ["用户管理"],
  "x-audience": "admin",
  security: cookieSecurity,
  middleware: [adminMiddleware(), legacyJsonBody("Invalid user role")],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      required: true,
      content: { "application/json": { schema: roleSchema } },
    },
  },
  responses: {
    200: jsonResponse(
      z.object({
        success: z.literal(true),
        id: z.string(),
        role: z.enum(["user", "admin"]),
      }),
      "更新后的用户 ID 与角色。",
    ),
    ...errorResponses(400, 401, 403, 404, 409, 500, 503),
  },
});
adminUsersRoute.openapi(
  adminUserRole,
  async (c) => {
    const admin = c.get("admin");
    const input = c.req.valid("json");
    const targetId = c.req.valid("param").id;
    if (targetId === admin.id) {
      return c.json(
        APIErrors.conflict("Administrators cannot change their own role", {
          reason: "admin_self_role_change" satisfies AdminErrorReason,
        }),
        409,
      );
    }

    const now = Date.now();
    const statement =
      input.role === "admin"
        ? c.env.DB.prepare(
            `
        UPDATE users
        SET role = 'admin', updated_at = ?
        WHERE id = ? AND id <> ? AND status <> 'deleted'
      `,
          ).bind(now, targetId, admin.id)
        : c.env.DB.prepare(
            `
        UPDATE users
        SET role = 'user', updated_at = ?
        WHERE id = ?
          AND id <> ?
          AND role = 'admin'
          AND EXISTS (
            SELECT 1 FROM users AS remaining_admin
            WHERE remaining_admin.role = 'admin'
              AND remaining_admin.id <> users.id
              AND remaining_admin.status = 'active'
              AND remaining_admin.deleted_at IS NULL
          )
      `,
          ).bind(now, targetId, admin.id);
    const result = await statement.run();
    if (Number(result.meta.changes ?? 0) !== 1) {
      const db = createDb(c.env.DB);
      const [target] = await db
        .select({ id: schema.users.id, role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.id, targetId))
        .limit(1);
      if (!target) return c.json(APIErrors.notFound("User not found"), 404);
      if (target.role === input.role) {
        return c.json(
          {
            success: true as const,
            id: targetId,
            role: target.role,
          },
          200,
        );
      }
      return c.json(
        APIErrors.conflict("The last active administrator cannot be revoked", {
          reason: "admin_last_active_revoke" satisfies AdminErrorReason,
        }),
        409,
      );
    }

    return c.json(
      { success: true as const, id: targetId, role: input.role },
      200,
    );
  },
  validationHook("Invalid user role", "issues"),
);

export { adminUsersRoute };
