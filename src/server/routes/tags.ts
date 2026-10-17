import { TagSchema } from "@/contracts";
import type { AdminErrorReason } from "@/contracts/admin-i18n";
import { asc, eq, sql } from "drizzle-orm";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { AdminAccessError, requireAdmin } from "../lib/admin-access";
import { APIErrors } from "../lib/api-errors";
import { setPublicCacheHeaders } from "../lib/http-cache";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";
import {
  adminMiddleware,
  apiErrorSchema,
  cookieSecurity,
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  legacyJsonBody,
  validationHook,
  z,
} from "../lib/openapi";

const tagsRoute = createApiApp();

const createTagSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .describe("标签显示名称，去除首尾空白后为 1–50 字符。"),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u)
      .optional()
      .describe("可选稳定标识，省略时由名称生成；重命名不会改变 slug。"),
  })
  .strict();

const updateTagSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
  })
  .strict();

const deleteTagQuerySchema = z
  .object({
    confirmDetach: z
      .enum(["true", "false"])
      .optional()
      .describe("仅 true 表示确认解除所有引用后删除；默认不解除引用。"),
  })
  .strict();

const tagsQuerySchema = z
  .object({
    type: z
      .string()
      .optional()
      .describe("不支持标签类型筛选，传入时返回 400。"),
    page: z
      .string()
      .optional()
      .describe("页码，默认 1；非整数回退 1，小于 1 时取 1。"),
    pageSize: z
      .string()
      .optional()
      .describe("每页数量，默认 50；整数限制在 1–200，非整数回退 50。"),
    limit: z
      .string()
      .optional()
      .describe("未提供 pageSize 时作为页大小来源，优先使用 pageSize。"),
    includeReferences: z
      .enum(["true", "false"])
      .optional()
      .describe("true 时返回引用统计并要求管理员权限；否则只返回公开目录。"),
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

tagsRoute.openapi(
  createRoute({
    description:
      "普通目录可匿名读取；includeReferences=true 时要求当前有效管理员，并返回地点和队伍引用数。此接口保留 page/pageSize 分页，不能套用其他列表的 cursor 规则；响应 pagination 包含总页数与 hasMore。",
    method: "get",
    path: "/",
    operationId: "tagsList",
    tags: ["标签"],
    summary: "查询标签目录",
    "x-audience": "public",
    request: { query: tagsQuerySchema },
    responses: {
      200: jsonResponse(
        z.object({
          success: z.literal(true),
          tags: z.array(
            TagSchema.extend({
              references: z
                .object({
                  locations: z.number(),
                  teams: z.number(),
                })
                .optional(),
            }),
          ),
          pagination: z.object({
            page: z.number(),
            pageSize: z.number(),
            total: z.number(),
            totalPages: z.number(),
            hasMore: z.boolean(),
          }),
        }),
        "请求成功，响应字段见下方结构。",
      ),
      ...errorResponses(400, 401, 403, 500),
    },
  }),
  async (c) => {
    const query = c.req.valid("query");
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
        if (error instanceof AdminAccessError)
          return error.kind === "unauthenticated"
            ? c.json(APIErrors.unauthorized("Authentication required"), 401)
            : c.json(APIErrors.forbidden("Administrator access required"), 403);
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
      return c.json(
        {
          success: true as const,
          tags: result.map((tag) => {
            const references = tag as typeof tag & {
              locationCount?: number;
              teamCount?: number;
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
        },
        200,
      );
    } catch (error) {
      logger.error("tags_list_failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return c.json(APIErrors.internalError("Failed to load tags"), 500);
    }
  },
  validationHook("Invalid tag filters", "none"),
);

tagsRoute.openapi(
  createRoute({
    description:
      "仅当前有效管理员可用。提交名称和可选 slug；未提供 slug 时按名称生成。命中已有标签时返回 200，新建成功返回 201，客户端应使用响应中的稳定标签 ID。",
    method: "post",
    path: "/",
    operationId: "tagsCreate",
    tags: ["标签"],
    summary: "创建或复用标签",
    "x-audience": "admin",
    security: cookieSecurity,
    middleware: [adminMiddleware(), legacyJsonBody("Invalid tag")],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createTagSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        z.object({
          success: z.literal(true),
          tagId: z.string(),
          existing: z.boolean(),
        }),
        "请求成功，响应字段见下方结构。",
      ),
      201: jsonResponse(
        z.object({
          success: z.literal(true),
          tagId: z.string(),
          existing: z.boolean(),
        }),
        "创建成功，返回新建资源。",
      ),
      ...errorResponses(400, 401, 403, 409, 500, 503),
    },
  }),
  async (c) => {
    const parsed = c.req.valid("json");
    const slug = parsed.slug ?? slugify(parsed.name);
    if (!slug)
      return c.json(APIErrors.validationError("Tag slug is empty"), 400);
    const db = createDb(c.env.DB);
    const [existing] = await db
      .select({ id: schema.tags.id, name: schema.tags.name })
      .from(schema.tags)
      .where(eq(schema.tags.slug, slug))
      .limit(1);
    if (existing) {
      if (existing.name !== parsed.name) {
        return c.json(
          APIErrors.conflict("Tag slug already exists", {
            reason: "tag_already_exists" satisfies AdminErrorReason,
          }),
          409,
        );
      }
      return c.json(
        { success: true as const, tagId: existing.id, existing: true },
        200,
      );
    }
    const id = generateId();
    try {
      await db.insert(schema.tags).values({ id, name: parsed.name, slug });
      return c.json(
        { success: true as const, tagId: id, existing: false },
        201,
      );
    } catch (error) {
      logger.error("tags_create_failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return c.json(
        APIErrors.conflict("Tag already exists", {
          reason: "tag_already_exists" satisfies AdminErrorReason,
        }),
        409,
      );
    }
  },
  validationHook("Invalid tag", "issues"),
);

tagsRoute.openapi(
  createRoute({
    description:
      "仅当前有效管理员可用。只更新标签名称，保留原 slug 和引用关系。名称冲突或并发变更返回 409，error.details.reason 提供原因分类。",
    method: "patch",
    path: "/{id}",
    operationId: "tagsUpdate",
    tags: ["标签"],
    summary: "重命名标签",
    "x-audience": "admin",
    security: cookieSecurity,
    middleware: [adminMiddleware(), legacyJsonBody("Invalid tag")],
    request: {
      params: z.object({ id: z.string() }),
      body: {
        required: true,
        content: { "application/json": { schema: updateTagSchema } },
      },
    },
    responses: {
      200: jsonResponse(
        z.object({ success: z.literal(true), tag: TagSchema }),
        "请求成功，响应字段见下方结构。",
      ),
      ...errorResponses(400, 401, 403, 404, 409, 500, 503),
    },
  }),
  async (c) => {
    const parsed = c.req.valid("json");
    const db = createDb(c.env.DB);
    try {
      const [updated] = await db
        .update(schema.tags)
        .set({ name: parsed.name })
        .where(eq(schema.tags.id, c.req.valid("param").id))
        .returning({
          id: schema.tags.id,
          name: schema.tags.name,
          slug: schema.tags.slug,
        });
      if (!updated) return c.json(APIErrors.notFound("Tag not found"), 404);
      return c.json({ success: true as const, tag: updated }, 200);
    } catch {
      return c.json(
        APIErrors.conflict("Tag update conflicts", {
          reason: "tag_update_conflict" satisfies AdminErrorReason,
        }),
        409,
      );
    }
  },
  validationHook("Invalid tag", "issues"),
);

tagsRoute.openapi(
  createRoute({
    description:
      "仅当前有效管理员可用。存在引用时默认返回 409 及引用计数；明确提交 confirmDetach=true 后解除引用并删除标签。操作前应向使用者展示受影响的地点和队伍数量。",
    method: "delete",
    path: "/{id}",
    operationId: "tagsDelete",
    tags: ["标签"],
    summary: "删除标签",
    "x-audience": "admin",
    security: cookieSecurity,
    middleware: [adminMiddleware()],
    request: {
      params: z.object({ id: z.string() }),
      query: deleteTagQuerySchema,
    },
    responses: {
      200: jsonResponse(
        z.object({
          success: z.literal(true),
          id: z.string(),
          detached: z.object({
            locations: z.number(),
            teams: z.number(),
          }),
        }),
        "请求成功，响应字段见下方结构。",
      ),
      ...errorResponses(400, 401, 403, 404, 500, 503),
      409: jsonResponse(
        apiErrorSchema.extend({
          references: z.object({
            locations: z.number(),
            teams: z.number(),
          }),
        }),
        "标签仍有引用，需显式确认解除引用后才能删除。",
      ),
    },
  }),
  async (c) => {
    const query = c.req.valid("query");
    const tagId = c.req.valid("param").id;
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
      })
      .from(schema.tags)
      .where(eq(schema.tags.id, tagId))
      .limit(1);
    if (!tag) return c.json(APIErrors.notFound("Tag not found"), 404);

    const references = {
      locations: Number(tag.locationCount),
      teams: Number(tag.teamCount),
    };
    const referenceCount = Object.values(references).reduce(
      (total, count) => total + count,
      0,
    );
    if (referenceCount > 0 && query.confirmDetach !== "true") {
      return c.json(
        {
          ...APIErrors.conflict("Tag still has references; confirm detachment"),
          references,
        },
        409,
      );
    }

    await db.batch([
      db
        .delete(schema.locationTags)
        .where(eq(schema.locationTags.tagId, tagId)),
      db.delete(schema.teamTags).where(eq(schema.teamTags.tagId, tagId)),
      db.delete(schema.tags).where(eq(schema.tags.id, tagId)),
    ]);
    return c.json(
      { success: true as const, id: tagId, detached: references },
      200,
    );
  },
  validationHook("Invalid delete confirmation", "issues"),
);

export { tagsRoute };
