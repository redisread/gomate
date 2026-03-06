"use server";

import { getDB } from "@/db";
import { pois, entityToPois } from "@/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type {
  Poi,
  EntityToPoi,
  PoiCategory,
  PoiEntityType,
  PoiRoleType,
} from "@/db/schema";
import { nanoid } from "nanoid";

/**
 * 获取 POI 列表
 * @param filters - 筛选条件
 * @returns POI 列表
 */
export async function getPois(filters?: {
  category?: PoiCategory;
  name?: string;
  orderBy?: "name" | "createdAt";
  orderDirection?: "asc" | "desc";
  limit?: number;
}) {
  try {
    const db = await getDB();
    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(pois.category, filters.category));
    }

    if (filters?.name) {
      conditions.push(sql`${pois.name} LIKE ${`%${filters.name}%`}`);
    }

    let query = db.select().from(pois);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // 排序
    const orderBy = filters?.orderBy || "createdAt";
    const orderDirection = filters?.orderDirection || "desc";
    const orderFn = orderDirection === "asc" ? asc : desc;

    if (orderBy === "name") {
      query = query.orderBy(orderFn(pois.name)) as any;
    } else if (orderBy === "createdAt") {
      query = query.orderBy(orderFn(pois.createdAt)) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    const results = await query;
    return results;
  } catch (error) {
    console.error("获取 POI 列表失败:", error);
    throw new Error("获取 POI 列表失败");
  }
}

/**
 * 根据 ID 获取 POI 详情
 * @param id - POI ID
 * @returns POI 详情
 */
export async function getPoiById(id: string) {
  try {
    const db = await getDB();
    const result = await db.select().from(pois).where(eq(pois.id, id)).limit(1);

    if (!result || result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error("获取 POI 详情失败:", error);
    throw new Error("获取 POI 详情失败");
  }
}

/**
 * 获取 POI 的所有角色关联
 * @param poiId - POI ID
 * @returns 角色关联列表
 */
export async function getPoiRoles(poiId: string) {
  try {
    const db = await getDB();
    const results = await db
      .select()
      .from(entityToPois)
      .where(eq(entityToPois.poiId, poiId))
      .orderBy(asc(entityToPois.order));

    return results;
  } catch (error) {
    console.error("获取 POI 角色失败:", error);
    throw new Error("获取 POI 角色失败");
  }
}

/**
 * 获取实体的所有 POI（包含角色信息）
 * @param entityType - 实体类型
 * @param entityId - 实体 ID
 * @param roleType - 角色类型（可选）
 * @returns POI 列表（包含角色信息）
 */
export async function getEntityPois(
  entityType: PoiEntityType,
  entityId: string,
  roleType?: PoiRoleType
) {
  try {
    const db = await getDB();
    const conditions = [
      eq(entityToPois.entityType, entityType),
      eq(entityToPois.entityId, entityId),
    ];

    if (roleType) {
      conditions.push(eq(entityToPois.roleType, roleType));
    }

    const results = await db
      .select({
        poi: pois,
        role: entityToPois,
      })
      .from(entityToPois)
      .innerJoin(pois, eq(entityToPois.poiId, pois.id))
      .where(and(...conditions))
      .orderBy(asc(entityToPois.order));

    return results;
  } catch (error) {
    console.error("获取实体 POI 失败:", error);
    throw new Error("获取实体 POI 失败");
  }
}

/**
 * 获取路线的途径点（有序）
 * @param routeId - 路线 ID
 * @returns 途径点列表
 */
export async function getRouteWaypoints(routeId: string) {
  return getEntityPois("route", routeId, "waypoint");
}

/**
 * 获取地点的兴趣点
 * @param locationId - 地点 ID
 * @param roleType - 角色类型（可选）
 * @returns 兴趣点列表
 */
export async function getLocationPois(
  locationId: string,
  roleType?: PoiRoleType
) {
  return getEntityPois("location", locationId, roleType);
}

/**
 * 创建 POI
 * @param data - POI 数据
 * @returns 创建的 POI ID
 */
export async function createPoi(data: {
  name: string;
  description?: string;
  coordinates: { lat: number; lng: number };
  category?: PoiCategory;
  images?: string[];
  extra?: Record<string, any>;
}) {
  try {
    const db = await getDB();
    const poiId = `poi_${nanoid()}`;

    const newPoi: any = {
      id: poiId,
      name: data.name,
      description: data.description,
      coordinates: JSON.stringify(data.coordinates),
      category: data.category || "other",
      images: data.images ? JSON.stringify(data.images) : null,
      extra: data.extra ? JSON.stringify(data.extra) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(pois).values(newPoi);

    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true, poiId };
  } catch (error) {
    console.error("创建 POI 失败:", error);
    throw new Error("创建 POI 失败");
  }
}

/**
 * 更新 POI
 * @param id - POI ID
 * @param data - 更新数据
 */
export async function updatePoi(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    coordinates: { lat: number; lng: number };
    category: PoiCategory;
    images: string[];
    extra: Record<string, any>;
  }>
) {
  try {
    const db = await getDB();
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // 转换 JSON 字段
    if (data.coordinates) {
      updateData.coordinates = JSON.stringify(data.coordinates);
    }
    if (data.images !== undefined) {
      updateData.images = data.images ? JSON.stringify(data.images) : null;
    }
    if (data.extra !== undefined) {
      updateData.extra = data.extra ? JSON.stringify(data.extra) : null;
    }

    await db.update(pois).set(updateData).where(eq(pois.id, id));

    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true };
  } catch (error) {
    console.error("更新 POI 失败:", error);
    throw new Error("更新 POI 失败");
  }
}

/**
 * 删除 POI（级联删除所有角色关联）
 * @param id - POI ID
 */
export async function deletePoi(id: string) {
  try {
    const db = await getDB();
    await db.delete(pois).where(eq(pois.id, id));

    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true };
  } catch (error) {
    console.error("删除 POI 失败:", error);
    throw new Error("删除 POI 失败");
  }
}

/**
 * 为实体添加 POI 角色关联
 * @param data - 角色关联数据
 * @returns 创建的关联 ID
 */
export async function addPoiToEntity(data: {
  poiId: string;
  entityType: PoiEntityType;
  entityId: string;
  roleType: PoiRoleType;
  order?: number;
  roleSpecificData?: Record<string, any>;
}) {
  try {
    const db = await getDB();
    const relationId = `etp_${nanoid()}`;

    const newRelation: any = {
      id: relationId,
      poiId: data.poiId,
      entityType: data.entityType,
      entityId: data.entityId,
      roleType: data.roleType,
      order: data.order,
      roleSpecificData: data.roleSpecificData
        ? JSON.stringify(data.roleSpecificData)
        : null,
      createdAt: new Date(),
    };

    await db.insert(entityToPois).values(newRelation);

    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true, relationId };
  } catch (error) {
    console.error("添加 POI 角色关联失败:", error);
    throw new Error("添加 POI 角色关联失败");
  }
}

/**
 * 更新 POI 角色关联
 * @param id - 关联 ID
 * @param data - 更新数据
 */
export async function updatePoiRole(
  id: string,
  data: Partial<{
    order: number;
    roleSpecificData: Record<string, any>;
  }>
) {
  try {
    const db = await getDB();
    const updateData: any = { ...data };

    if (data.roleSpecificData !== undefined) {
      updateData.roleSpecificData = data.roleSpecificData
        ? JSON.stringify(data.roleSpecificData)
        : null;
    }

    await db.update(entityToPois).set(updateData).where(eq(entityToPois.id, id));

    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true };
  } catch (error) {
    console.error("更新 POI 角色关联失败:", error);
    throw new Error("更新 POI 角色关联失败");
  }
}

/**
 * 删除 POI 角色关联
 * @param id - 关联 ID
 */
export async function removePoiFromEntity(id: string) {
  try {
    const db = await getDB();
    await db.delete(entityToPois).where(eq(entityToPois.id, id));

    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true };
  } catch (error) {
    console.error("删除 POI 角色关联失败:", error);
    throw new Error("删除 POI 角色关联失败");
  }
}

/**
 * 批量创建 POI 和角色关联（常用于路线途径点）
 * @param data - 批量数据
 */
export async function createPoisWithRoles(data: {
  entityType: PoiEntityType;
  entityId: string;
  roleType: PoiRoleType;
  pois: Array<{
    name: string;
    description?: string;
    coordinates: { lat: number; lng: number };
    category?: PoiCategory;
    order?: number;
    roleSpecificData?: Record<string, any>;
  }>;
}) {
  try {
    const db = await getDB();
    const results = [];

    for (const poiData of data.pois) {
      // 创建 POI
      const poiId = `poi_${nanoid()}`;
      const newPoi: any = {
        id: poiId,
        name: poiData.name,
        description: poiData.description,
        coordinates: JSON.stringify(poiData.coordinates),
        category: poiData.category || "other",
        images: null,
        extra: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(pois).values(newPoi);

      // 创建角色关联
      const relationId = `etp_${nanoid()}`;
      const newRelation: any = {
        id: relationId,
        poiId: poiId,
        entityType: data.entityType,
        entityId: data.entityId,
        roleType: data.roleType,
        order: poiData.order,
        roleSpecificData: poiData.roleSpecificData
          ? JSON.stringify(poiData.roleSpecificData)
          : null,
        createdAt: new Date(),
      };

      await db.insert(entityToPois).values(newRelation);

      results.push({ poiId, relationId });
    }

    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true, results };
  } catch (error) {
    console.error("批量创建 POI 失败:", error);
    throw new Error("批量创建 POI 失败");
  }
}
