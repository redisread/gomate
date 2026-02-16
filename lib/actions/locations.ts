"use server";

import { db } from "@/db";
import { locations } from "@/db/schema";
import { eq, ilike, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LocationFilters } from "@/types";

// 获取地点列表
export async function getLocations(filters?: LocationFilters) {
  try {
    let query = db.query.locations.findMany({
      orderBy: (locations, { desc }) => [desc(locations.createdAt)],
    });

    // TODO: 应用筛选条件

    return { success: true, data: await query };
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return { success: false, error: "获取地点列表失败" };
  }
}

// 获取单个地点详情
export async function getLocationById(id: string) {
  try {
    const location = await db.query.locations.findFirst({
      where: eq(locations.id, id),
      with: {
        teams: true,
      },
    });

    if (!location) {
      return { success: false, error: "地点不存在" };
    }

    return { success: true, data: location };
  } catch (error) {
    console.error("Failed to fetch location:", error);
    return { success: false, error: "获取地点详情失败" };
  }
}

// 根据 slug 获取地点
export async function getLocationBySlug(slug: string) {
  try {
    const location = await db.query.locations.findFirst({
      where: eq(locations.slug, slug),
      with: {
        teams: {
          with: {
            leader: true,
            members: true,
          },
        },
      },
    });

    if (!location) {
      return { success: false, error: "地点不存在" };
    }

    return { success: true, data: location };
  } catch (error) {
    console.error("Failed to fetch location by slug:", error);
    return { success: false, error: "获取地点详情失败" };
  }
}

// 搜索地点
export async function searchLocations(searchTerm: string) {
  try {
    const results = await db.query.locations.findMany({
      where: ilike(locations.name, `%${searchTerm}%`),
    });

    return { success: true, data: results };
  } catch (error) {
    console.error("Failed to search locations:", error);
    return { success: false, error: "搜索失败" };
  }
}
