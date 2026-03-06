"use server";

import { getDB } from "@/db";
import { routes, locations, cities, tags, entityToTags } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { Route } from "@/db/schema";

/**
 * 获取路线列表
 * @param filters - 筛选条件
 * @returns 路线列表
 */
export async function getRoutes(filters?: {
  locationId?: string;
  cityId?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const db = await getDB();
    const conditions = [];

    if (filters?.locationId) {
      conditions.push(eq(routes.locationId, filters.locationId));
    }

    if (filters?.cityId) {
      conditions.push(eq(routes.cityId, filters.cityId));
    }

    if (filters?.difficulty) {
      conditions.push(eq(routes.difficulty, filters.difficulty));
    }

    let query = db
      .select({
        route: routes,
        location: locations,
        city: cities,
      })
      .from(routes)
      .leftJoin(locations, eq(routes.locationId, locations.id))
      .leftJoin(cities, eq(routes.cityId, cities.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const results = await query;

    // 获取标签
    const routeIds = results.map((r) => r.route.id);
    const routeTags = await getRoutesTags(routeIds);

    return results.map((result) => ({
      ...result.route,
      location: result.location,
      city: result.city,
      tags: routeTags[result.route.id] || [],
    }));
  } catch (error) {
    console.error("获取路线列表失败:", error);
    throw new Error("获取路线列表失败");
  }
}

/**
 * 根据 ID 获取路线详情
 * @param id - 路线 ID
 * @returns 路线详情
 */
export async function getRouteById(id: string) {
  try {
    const db = await getDB();
    const result = await db
      .select({
        route: routes,
        location: locations,
        city: cities,
      })
      .from(routes)
      .leftJoin(locations, eq(routes.locationId, locations.id))
      .leftJoin(cities, eq(routes.cityId, cities.id))
      .where(eq(routes.id, id))
      .limit(1);

    if (!result || result.length === 0) {
      return null;
    }

    // 获取标签
    const routeTags = await getRoutesTags([id]);

    return {
      ...result[0].route,
      location: result[0].location,
      city: result[0].city,
      tags: routeTags[id] || [],
    };
  } catch (error) {
    console.error("获取路线详情失败:", error);
    throw new Error("获取路线详情失败");
  }
}

/**
 * 获取某个地点的所有路线
 * @param locationId - 地点 ID
 * @returns 路线列表
 */
export async function getLocationRoutes(locationId: string) {
  return getRoutes({ locationId });
}

/**
 * 创建路线（管理员）
 * @param data - 路线数据
 * @returns 创建的路线
 */
export async function createRoute(data: {
  locationId: string;
  cityId: string;
  name: string;
  description?: string;
  difficulty: "easy" | "moderate" | "hard" | "expert";
  durationMin: number; // 最短耗时（分钟）
  durationMax: number; // 最长耗时（分钟）
  distance: number; // 路线长度（公里）
  elevation?: number; // 累计爬升（米）
  routeGuide?: { overview: string; tips: string[] };
  equipmentNeeded?: string[];
  warnings?: string[];
  tagIds?: string[];
}) {
  try {
    const db = await getDB();
    const routeId = `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 构建 extra JSON
    const extra: { equipmentNeeded?: string[]; warnings?: string[] } = {};
    if (data.equipmentNeeded) {
      extra.equipmentNeeded = data.equipmentNeeded;
    }
    if (data.warnings) {
      extra.warnings = data.warnings;
    }

    const newRoute: any = {
      id: routeId,
      locationId: data.locationId,
      cityId: data.cityId,
      name: data.name,
      description: data.description,
      difficulty: data.difficulty,
      durationMin: data.durationMin,
      durationMax: data.durationMax,
      distance: data.distance,
      elevation: data.elevation,
      routeGuide: data.routeGuide ? JSON.stringify(data.routeGuide) : null,
      extra: Object.keys(extra).length > 0 ? JSON.stringify(extra) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(routes).values(newRoute);

    // 关联标签
    if (data.tagIds && data.tagIds.length > 0) {
      await addTagsToRoute(routeId, data.tagIds);
    }

    revalidatePath("/locations");
    revalidatePath(`/locations/${data.locationId}`);
    revalidatePath("/routes");

    return { success: true, routeId };
  } catch (error) {
    console.error("创建路线失败:", error);
    throw new Error("创建路线失败");
  }
}

/**
 * 更新路线（管理员）
 * @param id - 路线 ID
 * @param data - 更新数据
 */
export async function updateRoute(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    difficulty: "easy" | "moderate" | "hard" | "expert";
    durationMin: number; // 最短耗时（分钟）
    durationMax: number; // 最长耗时（分钟）
    distance: number; // 路线长度（公里）
    elevation: number; // 累计爬升（米）
    routeGuide: { overview: string; tips: string[] };
    equipmentNeeded: string[];
    warnings: string[];
    tagIds: string[];
  }>
) {
  try {
    const db = await getDB();
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // 转换 JSON 字段
    if (data.routeGuide) {
      updateData.routeGuide = JSON.stringify(data.routeGuide);
    }

    // 构建 extra JSON（如果有 equipmentNeeded 或 warnings）
    if (data.equipmentNeeded !== undefined || data.warnings !== undefined) {
      const extra: { equipmentNeeded?: string[]; warnings?: string[] } = {};
      if (data.equipmentNeeded !== undefined) {
        extra.equipmentNeeded = data.equipmentNeeded;
      }
      if (data.warnings !== undefined) {
        extra.warnings = data.warnings;
      }
      updateData.extra = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;
      delete updateData.equipmentNeeded;
      delete updateData.warnings;
    }

    // 移除 tagIds（单独处理）
    const tagIds = updateData.tagIds;
    delete updateData.tagIds;

    await db.update(routes).set(updateData).where(eq(routes.id, id));

    // 更新标签
    if (tagIds !== undefined) {
      // 删除旧标签关联
      await db.delete(entityToTags).where(
        and(
          eq(entityToTags.entityId, id),
          eq(entityToTags.entityType, "route")
        )
      );

      // 添加新标签关联
      if (tagIds.length > 0) {
        await addTagsToRoute(id, tagIds);
      }
    }

    // 获取路线信息以便刷新相关页面
    const route = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
    if (route.length > 0) {
      revalidatePath("/locations");
      revalidatePath(`/locations/${route[0].locationId}`);
      revalidatePath(`/routes/${id}`);
    }

    return { success: true };
  } catch (error) {
    console.error("更新路线失败:", error);
    throw new Error("更新路线失败");
  }
}

/**
 * 删除路线（管理员）
 * @param id - 路线 ID
 */
export async function deleteRoute(id: string) {
  try {
    const db = await getDB();
    // 获取路线信息
    const route = await db.select().from(routes).where(eq(routes.id, id)).limit(1);

    if (route.length === 0) {
      throw new Error("路线不存在");
    }

    await db.delete(routes).where(eq(routes.id, id));

    revalidatePath("/locations");
    revalidatePath(`/locations/${route[0].locationId}`);
    revalidatePath("/routes");

    return { success: true };
  } catch (error) {
    console.error("删除路线失败:", error);
    throw new Error("删除路线失败");
  }
}

/**
 * 为路线添加标签
 * @param routeId - 路线 ID
 * @param tagIds - 标签 ID 数组
 */
async function addTagsToRoute(routeId: string, tagIds: string[]) {
  const db = await getDB();
  const entityTagRecords = tagIds.map((tagId) => ({
    id: `ett_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    entityId: routeId,
    entityType: "route" as const,
    tagId,
    createdAt: new Date(),
  }));

  await db.insert(entityToTags).values(entityTagRecords);
}

/**
 * 获取多个路线的标签
 * @param routeIds - 路线 ID 数组
 * @returns 路线标签映射
 */
async function getRoutesTags(routeIds: string[]): Promise<Record<string, any[]>> {
  if (routeIds.length === 0) {
    return {};
  }

  const db = await getDB();
  const tagResults = await db
    .select({
      entityId: entityToTags.entityId,
      tag: tags,
    })
    .from(entityToTags)
    .leftJoin(tags, eq(entityToTags.tagId, tags.id))
    .where(
      and(
        inArray(entityToTags.entityId, routeIds),
        eq(entityToTags.entityType, "route")
      )
    );

  const tagsMap: Record<string, any[]> = {};
  tagResults.forEach((result) => {
    if (!tagsMap[result.entityId]) {
      tagsMap[result.entityId] = [];
    }
    if (result.tag) {
      tagsMap[result.entityId].push(result.tag);
    }
  });

  return tagsMap;
}
