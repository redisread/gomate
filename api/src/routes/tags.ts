import { APIErrors } from "../lib/api-errors";
import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { createAuth, type Env } from "../lib/auth";
import { createTagSchema } from "../lib/validation";
import { generateId } from "../lib/id";
import { setPublicCacheHeaders } from "../lib/cache";

const tags = new Hono<{ Bindings: Env }>();

/** 验证管理员权限 */
async function checkAdmin(c: { env: Env; req: { raw: Request } }) {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new Error("未登录");
  const db = createDb(c.env.DB);
  const user = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .then((rows) => rows[0]);
  if (!user || user.role !== "admin") throw new Error("无权限访问");
  return session;
}

/**
 * GET /tags
 * 获取标签列表，支持 ?type=location|route|activity 筛选
 */
tags.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const type = c.req.query("type");
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, parseInt(c.req.query("pageSize") || "50", 10));
    const offset = (page - 1) * pageSize;

    const whereClause = type ? eq(schema.tags.type, type) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.tags)
      .where(whereClause);

    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    const result = await db
      .select()
      .from(schema.tags)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset);

    setPublicCacheHeaders(c);
    return c.json({
      success: true,
      tags: result,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Get tags error:", error);
    return c.json(APIErrors.internalError("获取标签列表失败"), 500);
  }
});

/**
 * POST /tags
 * 创建标签（需要管理员权限）
 */
tags.post("/", async (c) => {
  try {
    await checkAdmin(c);
    const db = createDb(c.env.DB);
    const body = await c.req.json();

    // Validate input with Zod
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入验证失败", parsed.error.errors), 400);
    }

    const { name, type } = parsed.data;

    // 检查是否已存在同名同类标签
    const existing = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(eq(schema.tags.name, name))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ success: true, tagId: existing[0].id, existing: true });
    }

    const tagId = generateId();
    await db.insert(schema.tags).values({
      id: tagId,
      name,
      type,
      createdAt: new Date(),
    });

    return c.json({ success: true, tagId, existing: false });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    console.error("Create tag error:", error);
    return c.json(APIErrors.internalError("创建标签失败"), 500);
  }
});

export { tags as tagsRoute };
