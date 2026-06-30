import { Hono } from "hono";
import { eq, and, sql, desc } from "drizzle-orm";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { createAuth, type Env } from "../lib/auth";
import { APIErrors } from "../lib/api-errors";
import { createFavoriteSchema } from "../lib/validation";
import { generateId } from "../lib/id";

/** 安全解析 JSON 字符串 */
function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const favorites = new Hono<{ Bindings: Env }>();

/**
 * GET /favorites
 * 获取当前用户的收藏列表，支持 ?entityType=location 筛选
 */
favorites.get("/", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const db = createDb(c.env.DB);
    const entityType = c.req.query("entityType");
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, parseInt(c.req.query("pageSize") || "20", 10));
    const offset = (page - 1) * pageSize;

    const conditions = [eq(schema.userFavorites.userId, session.user.id)];
    if (entityType) {
      conditions.push(eq(schema.userFavorites.entityType, entityType));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.userFavorites)
      .where(whereClause);

    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    const favs = await db
      .select({ favorite: schema.userFavorites, location: schema.locations })
      .from(schema.userFavorites)
      .where(whereClause)
      .leftJoin(
        schema.locations,
        and(
          eq(schema.userFavorites.entityType, "location"),
          eq(schema.userFavorites.entityId, schema.locations.id)
        )
      )
      .orderBy(desc(schema.userFavorites.createdAt))
      .limit(pageSize)
      .offset(offset);

    const formattedFavorites = favs.map(({ favorite, location }) => ({
      id: favorite.id,
      entityType: favorite.entityType,
      entityId: favorite.entityId,
      createdAt: favorite.createdAt,
      // 标记幽灵收藏（地点已删除）
      isDeleted: favorite.entityType === "location" && !location,
      location: location
        ? {
            id: location.id,
            name: location.name,
            slug: location.slug,
            type: location.type,
            subtitle: location.subtitle,
            description: location.description,
            address: location.address,
            cityId: location.cityId,
            cityName: location.cityName,
            bestSeason: safeJsonParse(location.bestSeason, [] as string[]),
            coverImage: location.coverImage,
            images: safeJsonParse(location.images, [] as string[]),
            coordinates: safeJsonParse(location.coordinates, { lat: 0, lng: 0 }),
            createdAt: location.createdAt,
          }
        : undefined,
    }));

    // 过滤幽灵收藏后的实际数量
    const visibleCount = formattedFavorites.filter(f => !f.isDeleted).length;

    return c.json({
      success: true,
      favorites: formattedFavorites,
      pagination: {
        page,
        pageSize,
        total,
        visibleCount,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Get favorites error:", error);
    return c.json(APIErrors.internalError("获取收藏列表失败"), 500);
  }
});

/**
 * POST /favorites
 * 添加收藏
 */
favorites.post("/", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const body = await c.req.json();

    // Validate input with Zod
    const parsed = createFavoriteSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入验证失败", parsed.error.errors), 400);
    }

    const { entityType, entityId } = parsed.data;
    const db = createDb(c.env.DB);

    const existing = await db
      .select()
      .from(schema.userFavorites)
      .where(and(
        eq(schema.userFavorites.userId, session.user.id),
        eq(schema.userFavorites.entityType, entityType),
        eq(schema.userFavorites.entityId, entityId)
      ))
      .limit(1);

    if (existing.length > 0) return c.json(APIErrors.conflict("已经收藏过了"), 409);

    if (entityType === "location") {
      const loc = await db
        .select({ id: schema.locations.id })
        .from(schema.locations)
        .where(eq(schema.locations.id, entityId))
        .limit(1);
      if (!loc.length) return c.json(APIErrors.notFound("地点不存在"), 404);
    }

    const id = generateId();
    const now = new Date();
    await db.insert(schema.userFavorites).values({
      id, userId: session.user.id, entityType, entityId, createdAt: now,
    });

    return c.json({ success: true, favorite: { id, entityType, entityId, createdAt: now } });
  } catch (error) {
    console.error("Add favorite error:", error);
    return c.json(APIErrors.internalError("添加收藏失败"), 500);
  }
});

/**
 * DELETE /favorites?entityType={type}&entityId={id}
 * 取消收藏
 */
favorites.delete("/", async (c) => {
  try {
    const authInstance = createAuth(c.env);
    const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json(APIErrors.unauthorized("请先登录"), 401);

    const entityType = c.req.query("entityType");
    const entityId = c.req.query("entityId");

    if (!entityType || !entityId) return c.json(APIErrors.badRequest("缺少必要参数"), 400);

    const db = createDb(c.env.DB);
    await db.delete(schema.userFavorites).where(
      and(
        eq(schema.userFavorites.userId, session.user.id),
        eq(schema.userFavorites.entityType, entityType),
        eq(schema.userFavorites.entityId, entityId)
      )
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete favorite error:", error);
    return c.json(APIErrors.internalError("取消收藏失败"), 500);
  }
});

export { favorites as favoritesRoute };
