import { eq } from "drizzle-orm";
import type { Context } from "hono";

import { createDb } from "../db";
import * as schema from "../db/schema";
import { APIErrors } from "./api-errors";
import { getActiveSession } from "./active-session";
import type { Env } from "./auth";

export interface AdminIdentity {
  id: string;
  displayName: string;
  image: string | null;
}

export type AdminAccessResult =
  | { kind: "authorized"; admin: AdminIdentity }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" };

export class AdminAccessError extends Error {
  constructor(readonly kind: "unauthenticated" | "forbidden") {
    super(kind);
    this.name = "AdminAccessError";
  }
}

export async function resolveAdminAccess(
  env: Env,
  headers: Headers,
): Promise<AdminAccessResult> {
  const session = await getActiveSession(env, headers);
  if (!session) return { kind: "unauthenticated" };

  const db = createDb(env.DB);
  const [user] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      nickname: schema.users.nickname,
      image: schema.users.image,
      role: schema.users.role,
      status: schema.users.status,
      deletedAt: schema.users.deletedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);

  if (!user || user.status !== "active" || user.deletedAt !== null) {
    return { kind: "unauthenticated" };
  }
  if (user.role !== "admin") return { kind: "forbidden" };

  return {
    kind: "authorized",
    admin: {
      id: user.id,
      displayName: user.nickname ?? user.name,
      image: user.image,
    },
  };
}

export async function requireAdmin(c: {
  env: Env;
  req: { raw: Request };
}): Promise<AdminIdentity> {
  const result = await resolveAdminAccess(c.env, c.req.raw.headers);
  if (result.kind !== "authorized") throw new AdminAccessError(result.kind);
  return result.admin;
}

export function adminAccessErrorResponse(
  c: Context<{ Bindings: Env }>,
  error: unknown,
) {
  if (!(error instanceof AdminAccessError)) return null;
  return error.kind === "unauthenticated"
    ? c.json(APIErrors.unauthorized("Authentication required"), 401)
    : c.json(APIErrors.forbidden("Administrator access required"), 403);
}
