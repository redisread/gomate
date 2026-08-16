import { Hono } from "hono";
import { logger } from "../../lib/logger";
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
    const city = await db.query.cities.findFirst({
      where: eq(schema.cities.id, data.cityId),
      columns: { name: true },
    });
    if (!city) return c.json(APIErrors.badRequest("城市不存在"), 400);

    await db.insert(schema.locations).values({
      id, name: data.name, slug, type: data.type || null, subtitle: data.subtitle || null,
      description: data.description, address: data.address || null,
      cityId: data.cityId, cityName: city.name,
      bestSeason: JSON.stringify(data.bestSeason || []),
      coverImage: data.coverImage,
      images: JSON.stringify(data.images || []),
      coordinates: JSON.stringify(data.coordinates || { lat: 0, lng: 0 }),
      extra: data.extra ? JSON.stringify(data.extra) : null,
      // P0-B T4（task #171）§8：停车 tri-state + 装备 CSV（后端存储格式，前端传数组）
      parkingAvailable: data.parkingAvailable ?? null,
      parkingInfo: data.parkingInfo || null,
      gearEssential: data.gearEssential && data.gearEssential.length > 0 ? data.gearEssential.join(",") : null,
      gearOptional: data.gearOptional && data.gearOptional.length > 0 ? data.gearOptional.join(",") : null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    return c.json({ success: true, location: { id, slug } });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    logger.error("Create location error:", error);
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

    if (updateData.cityId !== undefined) {
      const city = await db.query.cities.findFirst({
        where: eq(schema.cities.id, updateData.cityId),
        columns: { id: true },
      });
      if (!city) return c.json(APIErrors.badRequest("城市不存在"), 400);
    }

    const dataToUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.slug !== undefined) dataToUpdate.slug = updateData.slug;
    if (updateData.type !== undefined) dataToUpdate.type = updateData.type || null;
    if (updateData.subtitle !== undefined) dataToUpdate.subtitle = updateData.subtitle || null;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.address !== undefined) dataToUpdate.address = updateData.address || null;
    if (updateData.cityId !== undefined) dataToUpdate.cityId = updateData.cityId;
    if (updateData.bestSeason !== undefined) dataToUpdate.bestSeason = JSON.stringify(updateData.bestSeason);
    if (updateData.coverImage !== undefined) dataToUpdate.coverImage = updateData.coverImage;
    if (updateData.images !== undefined) dataToUpdate.images = JSON.stringify(updateData.images);
    if (updateData.coordinates !== undefined) dataToUpdate.coordinates = JSON.stringify(updateData.coordinates);
    if (updateData.extra !== undefined) dataToUpdate.extra = updateData.extra ? JSON.stringify(updateData.extra) : null;
    // P0-B T4（task #171）§8：4 字段独立处理；parkingAvailable 允许 null（信息缺失），gear[] 传 [] 时清空
    if (updateData.parkingAvailable !== undefined) dataToUpdate.parkingAvailable = updateData.parkingAvailable;
    if (updateData.parkingInfo !== undefined) dataToUpdate.parkingInfo = updateData.parkingInfo || null;
    if (updateData.gearEssential !== undefined) {
      dataToUpdate.gearEssential = updateData.gearEssential.length > 0 ? updateData.gearEssential.join(",") : null;
    }
    if (updateData.gearOptional !== undefined) {
      dataToUpdate.gearOptional = updateData.gearOptional.length > 0 ? updateData.gearOptional.join(",") : null;
    }

    await db.update(schema.locations).set(dataToUpdate).where(eq(schema.locations.id, id));

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    logger.error("Update location error:", error);
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
    logger.error("Delete location error:", error);
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

    const deleteExistingTags = db
      .delete(schema.entityToTags)
      .where(
        and(
          eq(schema.entityToTags.entityId, id),
          eq(schema.entityToTags.entityType, "location")
        )
      );

    if (tagIds && tagIds.length > 0) {
      const insertNewTags = db.insert(schema.entityToTags).values(
        tagIds.map((tagId) => ({
          id: generateId(),
          entityId: id,
          entityType: "location" as const,
          tagId,
        }))
      );
      await db.batch([deleteExistingTags, insertNewTags]);
    } else {
      await deleteExistingTags;
    }

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json(APIErrors.unauthorized("未登录"), 401);
    if (message === "无权限访问") return c.json(APIErrors.forbidden("无权限访问"), 403);
    logger.error("Update location tags error:", error);
    return c.json(APIErrors.internalError("更新标签失败"), 500);
  }
});

export default mutations;
