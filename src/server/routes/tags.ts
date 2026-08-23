import { Hono } from "hono";
import { z } from "zod";
import { asc, eq, sql } from "drizzle-orm";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { APIErrors } from "../lib/api-errors";
import type { Env } from "../lib/auth";
import { getActiveSession } from "../lib/active-session";
import { setPublicCacheHeaders } from "../lib/http-cache";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";
import { validateRequest } from "../lib/validation";

const tagsRoute = new Hono<{ Bindings: Env }>();

const createTagSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u)
      .optional(),
  })
  .strict();

const tagsQuerySchema = z
  .object({
    type: z.string().optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
    limit: z.string().optional(),
  })
  .passthrough();

function slugify(name: string): string {
  return name
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);
}

async function isAdmin(c: { env: Env; req: { raw: Request } }) {
  const session = await getActiveSession(c.env, c.req.raw.headers);
  if (!session) return "unauthorized" as const;
  const db = createDb(c.env.DB);
  const [user] = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);
  return user?.role === "admin" ? ("ok" as const) : ("forbidden" as const);
}

tagsRoute.get("/", async (c) => {
  const query = await validateRequest(
    c,
    "query",
    tagsQuerySchema,
    "Invalid tag filters",
    "none",
  );
  if (query instanceof Response) return query;
  if (query.type !== undefined) {
    return c.json(
      APIErrors.badRequest("Tag type filtering is not supported"),
      400,
    );
  }
  const rawPage = Number(query.page ?? 1);
  const rawPageSize = Number(query.pageSize ?? query.limit ?? 50);
  const page = Number.isInteger(rawPage) ? Math.max(1, rawPage) : 1;
  const pageSize = Number.isInteger(rawPageSize)
    ? Math.min(200, Math.max(1, rawPageSize))
    : 50;
  const db = createDb(c.env.DB);
  try {
    const [count] = await db
      .select({ value: sql<number>`count(*)` })
      .from(schema.tags);
    const total = Number(count?.value ?? 0);
    const result = await db
      .select()
      .from(schema.tags)
      .orderBy(asc(schema.tags.name), asc(schema.tags.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const totalPages = Math.ceil(total / pageSize);
    setPublicCacheHeaders(c);
    return c.json({
      success: true,
      tags: result.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    logger.error("tags_list_failed", error);
    return c.json(APIErrors.internalError("Failed to load tags"), 500);
  }
});

tagsRoute.post("/", async (c) => {
  const access = await isAdmin(c);
  if (access === "unauthorized") return c.json(APIErrors.unauthorized(), 401);
  if (access === "forbidden") return c.json(APIErrors.forbidden(), 403);
  const parsed = await validateRequest(
    c,
    "json",
    createTagSchema,
    "Invalid tag",
    "issues",
  );
  if (parsed instanceof Response) return parsed;
  const slug = parsed.slug ?? slugify(parsed.name);
  if (!slug) return c.json(APIErrors.validationError("Tag slug is empty"), 400);
  const db = createDb(c.env.DB);
  const [existing] = await db
    .select({ id: schema.tags.id, name: schema.tags.name })
    .from(schema.tags)
    .where(eq(schema.tags.slug, slug))
    .limit(1);
  if (existing) {
    if (existing.name !== parsed.name) {
      return c.json(APIErrors.conflict("Tag slug already exists"), 409);
    }
    return c.json({ success: true, tagId: existing.id, existing: true });
  }
  const id = generateId();
  try {
    await db.insert(schema.tags).values({ id, name: parsed.name, slug });
    return c.json({ success: true, tagId: id, existing: false }, 201);
  } catch (error) {
    logger.error("tags_create_failed", error);
    return c.json(APIErrors.conflict("Tag already exists"), 409);
  }
});

export { tagsRoute };
