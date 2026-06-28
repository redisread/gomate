import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { generateId } from "../../lib/id";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { createLocationSchema, updateLocationSchema } from "../../lib/validation";
import { APIErrors } from "../../lib/api-errors";
import { requireAdmin } from "./utils";

const mutations = new Hono<{ Bindings: Env }>();

/**
 * POST /locations
 * 创建新地点（需要管理员权限）
 */
mutations.post("/", async (c) => {
  try {
    await requireAdmin(c);
    const db = createDb(c.env.DB);
    const body = await c.req.json();

    // Validate input
    const parsed = createLocationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入验证失败", parsed.error.errors), 400);
    }

    const data = parsed.data;
    const id = generateId();
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    await db.insert(schema.locations).values({
      id, name: data.name, slug, type: data.type || null, subtitle: data.subtitle || null,
      description: data.description, address: data.address || null,
      cityId: data.cityId, cityName: data.cityName || null,
      bestSeason: JSON.stringify(data.bestSeason || []),
      coverImage: data.coverImage,
      images: JSON.stringify(data.images || []),
      coordinates: JSON.stringify(data.coordinates || { lat: 0, lng: 0 }),
      extra: data.extra ? JSON.stringify(data.extra) : null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    return c.json({ success: true, location: { id, slug } });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    console.error("Create location error:", error);
    return c.json(APIErrors.internalError("创建地点失败"), 500);
  }
});

/**
 * PUT /locations
 * 更新地点（需要管理员权限）
 */
mutations.put("/", async (c) => {
  try {
    await requireAdmin(c);
    const db = createDb(c.env.DB);
    const body = await c.req.json();

    // Validate input
    const parsed = updateLocationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(APIErrors.validationError("输入验证失败", parsed.error.errors), 400);
    }

    const { id, ...updateData } = parsed.data;

    const dataToUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.slug !== undefined) dataToUpdate.slug = updateData.slug;
    if (updateData.type !== undefined) dataToUpdate.type = updateData.type || null;
    if (updateData.subtitle !== undefined) dataToUpdate.subtitle = updateData.subtitle || null;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.address !== undefined) dataToUpdate.address = updateData.address || null;
    if (updateData.cityId !== undefined) dataToUpdate.cityId = updateData.cityId;
    if (updateData.cityName !== undefined) dataToUpdate.cityName = updateData.cityName || null;
    if (updateData.bestSeason !== undefined) dataToUpdate.bestSeason = JSON.stringify(updateData.bestSeason);
    if (updateData.coverImage !== undefined) dataToUpdate.coverImage = updateData.coverImage;
    if (updateData.images !== undefined) dataToUpdate.images = JSON.stringify(updateData.images);
    if (updateData.coordinates !== undefined) dataToUpdate.coordinates = JSON.stringify(updateData.coordinates);
    if (updateData.extra !== undefined) dataToUpdate.extra = updateData.extra ? JSON.stringify(updateData.extra) : null;

    await db.update(schema.locations).set(dataToUpdate).where(eq(schema.locations.id, id));

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    console.error("Update location error:", error);
    return c.json(APIErrors.internalError("更新地点失败"), 500);
  }
});

/**
 * DELETE /locations/:id
 * 删除地点（需要管理员权限）
 */
mutations.delete("/:id", async (c) => {
  try {
    await requireAdmin(c);
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const existing = await db.query.locations.findFirst({ where: eq(schema.locations.id, id) });
    if (!existing) return c.json(APIErrors.notFound("地点不存在"), 404);

    await db.delete(schema.locations).where(eq(schema.locations.id, id));

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    console.error("Delete location error:", error);
    return c.json(APIErrors.internalError("删除地点失败"), 500);
  }
});

/**
 * PUT /locations/:id/tags
 * 全量替换地点关联的标签（需要管理员权限）
 * body: { tagIds: string[] }
 */
mutations.put("/:id/tags", async (c) => {
  try {
    await requireAdmin(c);
    const id = c.req.param("id");
    const { tagIds } = await c.req.json<{ tagIds: string[] }>();
    const db = createDb(c.env.DB);

    // 删除旧关联
    await db
      .delete(schema.entityToTags)
      .where(
        and(
          eq(schema.entityToTags.entityId, id),
          eq(schema.entityToTags.entityType, "location")
        )
      );

    // 批量插入新关联
    if (tagIds && tagIds.length > 0) {
      await db.insert(schema.entityToTags).values(
        tagIds.map((tagId) => ({
          id: generateId(),
          entityId: id,
          entityType: "location" as const,
          tagId,
        }))
      );
    }

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    console.error("Update location tags error:", error);
    return c.json(APIErrors.internalError("更新标签失败"), 500);
  }
});

/**
 * PUT /locations/:id/pois
 * 全量替换地点关联的打卡点（需要管理员权限）
 * body: { pois: Array<{ poiId: string; roleType: string; order: number }> }
 */
mutations.put("/:id/pois", async (c) => {
  try {
    await requireAdmin(c);
    const id = c.req.param("id");
    const { pois: poiLinks } = await c.req.json<{
      pois: Array<{ poiId: string; roleType: string; order: number }>;
    }>();
    const db = createDb(c.env.DB);

    // 删除旧关联
    await db
      .delete(schema.entityToPois)
      .where(
        and(
          eq(schema.entityToPois.entityId, id),
          eq(schema.entityToPois.entityType, "location")
        )
      );

    // 批量插入新关联
    if (poiLinks && poiLinks.length > 0) {
      await db.insert(schema.entityToPois).values(
        poiLinks.map((link) => ({
          id: generateId(),
          entityId: id,
          entityType: "location" as const,
          poiId: link.poiId,
          roleType: link.roleType as schema.PoiRoleType,
          order: link.order,
        }))
      );
    }

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    console.error("Update location pois error:", error);
    return c.json(APIErrors.internalError("更新打卡点失败"), 500);
  }
});

export default mutations;
