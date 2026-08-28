import type { AdminUserSummary } from "@/contracts";
import type { AdminErrorReason } from "@/contracts/admin-i18n";
import { and, desc, eq, like, lt, or, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db";
import * as schema from "../db/schema";
import {
  adminAccessErrorResponse,
  requireAdmin,
} from "../lib/admin-access";
import { APIErrors } from "../lib/api-errors";
import type { Env } from "../lib/auth";
import {
  decodeContentCursor,
  encodeContentCursor,
} from "../lib/content-cursor";
import { validateRequest } from "../lib/validation";

const adminUsersRoute = new Hono<{ Bindings: Env }>();

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(500).optional(),
}).strict();

const roleSchema = z.object({
  role: z.enum(["user", "admin"]),
}).strict();

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

function accessDenied(
  c: Parameters<typeof adminAccessErrorResponse>[0],
  error: unknown,
) {
  const denied = adminAccessErrorResponse(c, error);
  if (denied) return denied;
  throw error;
}

adminUsersRoute.get("/", async (c) => {
  try {
    await requireAdmin(c);
  } catch (error) {
    return accessDenied(c, error);
  }
  const query = await validateRequest(
    c,
    "query",
    listSchema,
    "Invalid user filters",
    "issues",
  );
  if (query instanceof Response) return query;
  const cursor = query.cursor ? decodeContentCursor(query.cursor) : null;
  if (query.cursor && !cursor) {
    return c.json(APIErrors.badRequest("Invalid user cursor"), 400);
  }

  const conditions: SQL[] = [];
  if (query.q) {
    const pattern = `%${query.q}%`;
    conditions.push(or(
      like(schema.users.name, pattern),
      like(schema.users.email, pattern),
    )!);
  }
  if (cursor) {
    const createdAt = new Date(cursor.t);
    conditions.push(or(
      lt(schema.users.createdAt, createdAt),
      and(eq(schema.users.createdAt, createdAt), lt(schema.users.id, cursor.id)),
    )!);
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
  return c.json({
    success: true as const,
    users: page.map(toAdminUser),
    nextCursor: hasMore && last
      ? encodeContentCursor({ t: last.createdAt.getTime(), id: last.id })
      : null,
  });
});

adminUsersRoute.patch("/:id/role", async (c) => {
  let admin;
  try {
    admin = await requireAdmin(c);
  } catch (error) {
    return accessDenied(c, error);
  }
  const input = await validateRequest(
    c,
    "json",
    roleSchema,
    "Invalid user role",
    "issues",
  );
  if (input instanceof Response) return input;
  const targetId = c.req.param("id");
  if (targetId === admin.id) {
    return c.json(
      APIErrors.conflict("Administrators cannot change their own role", {
        reason: "admin_self_role_change" satisfies AdminErrorReason,
      }),
      409,
    );
  }

  const now = Date.now();
  const statement = input.role === "admin"
    ? c.env.DB.prepare(`
        UPDATE users
        SET role = 'admin', updated_at = ?
        WHERE id = ? AND id <> ? AND status <> 'deleted'
      `).bind(now, targetId, admin.id)
    : c.env.DB.prepare(`
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
      `).bind(now, targetId, admin.id);
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
      return c.json({ success: true as const, id: targetId, role: target.role });
    }
    return c.json(
      APIErrors.conflict("The last active administrator cannot be revoked", {
        reason: "admin_last_active_revoke" satisfies AdminErrorReason,
      }),
      409,
    );
  }

  return c.json({ success: true as const, id: targetId, role: input.role });
});

export { adminUsersRoute };
