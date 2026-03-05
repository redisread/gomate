"use server";

import { getDB } from "@/db";
import { cities } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { City } from "@/db/schema";

/**
 * 获取城市列表
 * @param filters - 筛选条件
 * @returns 城市列表
 */
export async function getCities(filters?: {
  isHot?: boolean;
  province?: string;
  level?: "city" | "district";
  limit?: number;
  offset?: number;
}) {
  try {
    const db = await getDB();
    const conditions = [];

    if (filters?.isHot !== undefined) {
      conditions.push(eq(cities.isHot, filters.isHot));
    }

    if (filters?.province) {
      conditions.push(eq(cities.province, filters.province));
    }

    if (filters?.level) {
      conditions.push(eq(cities.level, filters.level));
    }

    let query = db.select().from(cities);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const result = await query;
    return result;
  } catch (error) {
    console.error("获取城市列表失败:", error);
    throw new Error("获取城市列表失败");
  }
}

/**
 * 获取热门城市
 * @returns 热门城市列表
 */
export async function getHotCities() {
  return getCities({ isHot: true });
}

/**
 * 根据 ID 获取城市详情
 * @param id - 城市 ID
 * @returns 城市详情
 */
export async function getCityById(id: string) {
  try {
    const db = await getDB();
    const result = await db
      .select()
      .from(cities)
      .where(eq(cities.id, id))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("获取城市详情失败:", error);
    throw new Error("获取城市详情失败");
  }
}

/**
 * 根据 adcode 获取城市
 * @param adcode - 高德行政区划代码
 * @returns 城市信息
 */
export async function getCityByAdcode(adcode: string) {
  try {
    const db = await getDB();
    const result = await db
      .select()
      .from(cities)
      .where(eq(cities.adcode, adcode))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("获取城市信息失败:", error);
    throw new Error("获取城市信息失败");
  }
}

/**
 * 创建城市（管理员）
 * @param data - 城市数据
 * @returns 创建的城市
 */
export async function createCity(data: {
  adcode: string;
  name: string;
  pinyin?: string;
  province?: string;
  level: "city" | "district";
  isHot?: boolean;
  parentId?: string;
}) {
  try {
    const cityId = `city_${data.adcode}`;

    const newCity: any = {
      id: cityId,
      adcode: data.adcode,
      name: data.name,
      pinyin: data.pinyin,
      province: data.province,
      level: data.level,
      isHot: data.isHot || false,
      parentId: data.parentId,
      createdAt: new Date(),
    };

    const db = await getDB();
    await db.insert(cities).values(newCity);

    revalidatePath("/cities");
    revalidatePath("/locations");

    return { success: true, cityId };
  } catch (error) {
    console.error("创建城市失败:", error);
    throw new Error("创建城市失败");
  }
}

/**
 * 更新城市（管理员）
 * @param id - 城市 ID
 * @param data - 更新数据
 */
export async function updateCity(
  id: string,
  data: Partial<{
    name: string;
    pinyin: string;
    province: string;
    level: "city" | "district";
    isHot: boolean;
    parentId: string;
  }>
) {
  try {
    const db = await getDB();
    await db.update(cities).set(data).where(eq(cities.id, id));

    revalidatePath("/cities");
    revalidatePath("/locations");

    return { success: true };
  } catch (error) {
    console.error("更新城市失败:", error);
    throw new Error("更新城市失败");
  }
}

/**
 * 删除城市（管理员）
 * @param id - 城市 ID
 */
export async function deleteCity(id: string) {
  try {
    const db = await getDB();
    await db.delete(cities).where(eq(cities.id, id));

    revalidatePath("/cities");
    revalidatePath("/locations");

    return { success: true };
  } catch (error) {
    console.error("删除城市失败:", error);
    throw new Error("删除城市失败");
  }
}
