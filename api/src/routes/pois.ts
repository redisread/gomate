import { APIErrors } from "../lib/api-errors";
import { Hono } from "hono";
import { like, eq } from "drizzle-orm";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { createAuth, type Env } from "../lib/auth";

export const poisRoute = new Hono<{ Bindings: Env }>();

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

/** 生成 POI ID */
function generatePoiId(): string {
  return `poi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** 验证坐标格式 */
function validateCoordinates(coords: unknown): { lat: number; lng: number } | null {
  if (typeof coords !== "object" || coords === null) return null;
  const { lat, lng } = coords as Record<string, unknown>;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * GET /pois
 * 获取打卡点列表（支持关键词搜索），供编辑页选择关联
 */
poisRoute.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const search = c.req.query("search")?.trim() ?? "";
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50"), 200);

    const rows = search
      ? await db
          .select()
          .from(schema.pois)
          .where(like(schema.pois.name, `%${search}%`))
          .limit(limit)
      : await db.select().from(schema.pois).limit(limit);

    const pois = rows.map((poi) => ({
      id: poi.id,
      name: poi.name,
      description: poi.description,
      coordinates: (() => {
        try { return JSON.parse(poi.coordinates); } catch { return { lat: 0, lng: 0 }; }
      })(),
    }));

    return c.json({ success: true, pois });
  } catch (error) {
    console.error("Get pois error:", error);
    return c.json(APIErrors.internalError("获取打卡点列表失败"), 500);
  }
});

/**
 * GET /pois/:id
 * 获取单个打卡点详情
 */
poisRoute.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const poi = await db
      .select()
      .from(schema.pois)
      .where(eq(schema.pois.id, id))
      .limit(1);

    if (!poi.length) {
      return c.json(APIErrors.notFound("打卡点不存在"), 404);
    }

    const p = poi[0];
    return c.json({
      success: true,
      poi: {
        id: p.id,
        name: p.name,
        description: p.description,
        coordinates: p.coordinates ? JSON.parse(p.coordinates) : null,
        images: p.images ? JSON.parse(p.images) : [],
        extra: p.extra ? JSON.parse(p.extra) : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get poi error:", error);
    return c.json(APIErrors.internalError("获取打卡点详情失败"), 500);
  }
});

/**
 * POST /pois
 * 创建打卡点（需管理员权限）
 */
poisRoute.post("/", async (c) => {
  try {
    await checkAdmin(c);
    const db = createDb(c.env.DB);
    const body = await c.req.json<{
      name?: string;
      description?: string;
      coordinates?: { lat: number; lng: number };
      images?: string[];
    }>();

    // 验证必填字段
    if (!body.name?.trim()) {
      return c.json(APIErrors.badRequest("名称为必填项"), 400);
    }
    if (body.name.length > 50) {
      return c.json(APIErrors.badRequest("名称不能超过50个字符"), 400);
    }

    // 验证坐标
    const coordinates = validateCoordinates(body.coordinates);
    if (!coordinates) {
      return c.json(APIErrors.badRequest("坐标格式无效，需要 { lat: number, lng: number }"), 400);
    }

    // 可选字段验证
    if (body.description && body.description.length > 500) {
      return c.json(APIErrors.badRequest("描述不能超过500个字符"), 400);
    }

    const poiId = generatePoiId();
    await db.insert(schema.pois).values({
      id: poiId,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      coordinates: JSON.stringify(coordinates),
      // category 由数据库默认值自动填充为 "poi"
      images: body.images ? JSON.stringify(body.images) : null,
      extra: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ success: true, poiId });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    console.error("Create poi error:", error);
    return c.json(APIErrors.internalError("创建打卡点失败"), 500);
  }
});

/**
 * PUT /pois/:id
 * 更新打卡点（需管理员权限）
 */
poisRoute.put("/:id", async (c) => {
  try {
    await checkAdmin(c);
    const id = c.req.param("id");
    const db = createDb(c.env.DB);
    const body = await c.req.json<{
      name?: string;
      description?: string;
      coordinates?: { lat: number; lng: number };
      images?: string[];
    }>();

    // 检查 POI 是否存在
    const existing = await db
      .select({ id: schema.pois.id })
      .from(schema.pois)
      .where(eq(schema.pois.id, id))
      .limit(1);
    if (!existing.length) {
      return c.json(APIErrors.notFound("打卡点不存在"), 404);
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return c.json(APIErrors.badRequest("名称不能为空"), 400);
      }
      if (body.name.length > 50) {
        return c.json(APIErrors.badRequest("名称不能超过50个字符"), 400);
      }
      updateData.name = body.name.trim();
    }

    if (body.coordinates !== undefined) {
      const coordinates = validateCoordinates(body.coordinates);
      if (!coordinates) {
        return c.json(APIErrors.badRequest("坐标格式无效"), 400);
      }
      updateData.coordinates = JSON.stringify(coordinates);
    }

    if (body.description !== undefined) {
      if (body.description && body.description.length > 500) {
        return c.json(APIErrors.badRequest("描述不能超过500个字符"), 400);
      }
      updateData.description = body.description?.trim() ?? null;
    }

    if (body.images !== undefined) {
      updateData.images = body.images ? JSON.stringify(body.images) : null;
    }

    await db
      .update(schema.pois)
      .set(updateData as Partial<typeof schema.pois.$inferInsert>)
      .where(eq(schema.pois.id, id));

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    console.error("Update poi error:", error);
    return c.json(APIErrors.internalError("更新打卡点失败"), 500);
  }
});

/**
 * DELETE /pois/:id
 * 删除打卡点（需管理员权限）
 * 级联删除：entityToPois 表会自动清理关联记录（外键 onDelete: cascade）
 */
poisRoute.delete("/:id", async (c) => {
  try {
    await checkAdmin(c);
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    // 检查 POI 是否存在，并统计关联数量
    const existing = await db
      .select({ id: schema.pois.id })
      .from(schema.pois)
      .where(eq(schema.pois.id, id))
      .limit(1);
    if (!existing.length) {
      return c.json(APIErrors.notFound("打卡点不存在"), 404);
    }

    // 查询关联数量（用于前端提示）
    const associations = await db
      .select({ id: schema.entityToPois.id })
      .from(schema.entityToPois)
      .where(eq(schema.entityToPois.poiId, id));
    const removedAssociations = associations.length;

    // 删除 POI（关联记录会通过外键级联删除）
    await db.delete(schema.pois).where(eq(schema.pois.id, id));

    return c.json({ success: true, removedAssociations });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    console.error("Delete poi error:", error);
    return c.json(APIErrors.internalError("删除打卡点失败"), 500);
  }
});
