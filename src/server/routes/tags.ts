import { Hono } from "hono";
import { z } from "zod";
import { asc, eq, sql } from "drizzle-orm";
import type { AdminErrorReason } from "@/contracts/admin-i18n";
import { createDb } from "../db";
import * as schema from "../db/schema";
import {
  adminAccessErrorResponse,
  requireAdmin,
} from "../lib/admin-access";
import { APIErrors } from "../lib/api-errors";
import type { Env } from "../lib/auth";
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

const updateTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
}).strict();

const deleteTagQuerySchema = z.object({
  confirmDetach: z.enum(["true", "false"]).optional(),
}).strict();

const tagsQuerySchema = z
  .object({
    type: z.string().optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
    limit: z.string().optional(),
    includeReferences: z.enum(["true", "false"]).optional(),
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
  const includeReferences = query.includeReferences === "true";
  if (includeReferences) {
    try {
      await requireAdmin(c);
    } catch (error) {
      const denied = adminAccessErrorResponse(c, error);
      if (denied) return denied;
      throw error;
    }
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
    const result = includeReferences
      ? await db
          .select({
            id: schema.tags.id,
            name: schema.tags.name,
            slug: schema.tags.slug,
            locationCount: sql<number>`(
              select count(*) from location_tags
              where location_tags.tag_id = ${schema.tags.id}
            )`,
            teamCount: sql<number>`(
              select count(*) from team_tags
              where team_tags.tag_id = ${schema.tags.id}
            )`,
            storyCount: sql<number>`(
              select count(*) from story_tags
              where story_tags.tag_id = ${schema.tags.id}
            )`,
          })
          .from(schema.tags)
          .orderBy(asc(schema.tags.name), asc(schema.tags.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize)
      : await db
          .select({
            id: schema.tags.id,
            name: schema.tags.name,
            slug: schema.tags.slug,
          })
          .from(schema.tags)
          .orderBy(asc(schema.tags.name), asc(schema.tags.id))
          .limit(pageSize)
          .offset((page - 1) * pageSize);
    const totalPages = Math.ceil(total / pageSize);
    if (!includeReferences) setPublicCacheHeaders(c);
    return c.json({
      success: true,
      tags: result.map((tag) => {
        const references = tag as typeof tag & {
          locationCount?: number;
          teamCount?: number;
          storyCount?: number;
        };
        return {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          ...(includeReferences
            ? {
                references: {
                  locations: Number(references.locationCount ?? 0),
                  teams: Number(references.teamCount ?? 0),
                  stories: Number(references.storyCount ?? 0),
                },
              }
            : {}),
        };
      }),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    logger.error("tags_list_failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return c.json(APIErrors.internalError("Failed to load tags"), 500);
  }
});

tagsRoute.post("/", async (c) => {
  try {
    await requireAdmin(c);
  } catch (error) {
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    throw error;
  }
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
      return c.json(APIErrors.conflict("Tag slug already exists", {
        reason: "tag_already_exists" satisfies AdminErrorReason,
      }), 409);
    }
    return c.json({ success: true, tagId: existing.id, existing: true });
  }
  const id = generateId();
  try {
    await db.insert(schema.tags).values({ id, name: parsed.name, slug });
    return c.json({ success: true, tagId: id, existing: false }, 201);
  } catch (error) {
    logger.error("tags_create_failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return c.json(APIErrors.conflict("Tag already exists", {
      reason: "tag_already_exists" satisfies AdminErrorReason,
    }), 409);
  }
});

tagsRoute.patch("/:id", async (c) => {
  try {
    await requireAdmin(c);
  } catch (error) {
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    throw error;
  }
  const parsed = await validateRequest(
    c,
    "json",
    updateTagSchema,
    "Invalid tag",
    "issues",
  );
  if (parsed instanceof Response) return parsed;
  const db = createDb(c.env.DB);
  try {
    const [updated] = await db
      .update(schema.tags)
      .set({ name: parsed.name })
      .where(eq(schema.tags.id, c.req.param("id")))
      .returning({
        id: schema.tags.id,
        name: schema.tags.name,
        slug: schema.tags.slug,
      });
    if (!updated) return c.json(APIErrors.notFound("Tag not found"), 404);
    return c.json({ success: true as const, tag: updated });
  } catch {
    return c.json(APIErrors.conflict("Tag update conflicts", {
      reason: "tag_update_conflict" satisfies AdminErrorReason,
    }), 409);
  }
});

tagsRoute.delete("/:id", async (c) => {
  try {
    await requireAdmin(c);
  } catch (error) {
    const denied = adminAccessErrorResponse(c, error);
    if (denied) return denied;
    throw error;
  }
  const query = await validateRequest(
    c,
    "query",
    deleteTagQuerySchema,
    "Invalid delete confirmation",
    "issues",
  );
  if (query instanceof Response) return query;
  const tagId = c.req.param("id");
  const db = createDb(c.env.DB);
  const [tag] = await db
    .select({
      id: schema.tags.id,
      locationCount: sql<number>`(
        select count(*) from location_tags where location_tags.tag_id = ${schema.tags.id}
      )`,
      teamCount: sql<number>`(
        select count(*) from team_tags where team_tags.tag_id = ${schema.tags.id}
      )`,
      storyCount: sql<number>`(
        select count(*) from story_tags where story_tags.tag_id = ${schema.tags.id}
      )`,
    })
    .from(schema.tags)
    .where(eq(schema.tags.id, tagId))
    .limit(1);
  if (!tag) return c.json(APIErrors.notFound("Tag not found"), 404);

  const references = {
    locations: Number(tag.locationCount),
    teams: Number(tag.teamCount),
    stories: Number(tag.storyCount),
  };
  const referenceCount = Object.values(references).reduce(
    (total, count) => total + count,
    0,
  );
  if (referenceCount > 0 && query.confirmDetach !== "true") {
    return c.json({
      ...APIErrors.conflict("Tag still has references; confirm detachment"),
      references,
    }, 409);
  }

  await db.batch([
    db.delete(schema.locationTags).where(eq(schema.locationTags.tagId, tagId)),
    db.delete(schema.teamTags).where(eq(schema.teamTags.tagId, tagId)),
    db.delete(schema.storyTags).where(eq(schema.storyTags.tagId, tagId)),
    db.delete(schema.tags).where(eq(schema.tags.id, tagId)),
  ]);
  return c.json({ success: true as const, id: tagId, detached: references });
});

export { tagsRoute };
