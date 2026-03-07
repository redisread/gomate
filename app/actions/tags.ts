"use server";

import { getDB } from "@/db";
import { tags, entityToTags } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { Tag } from "@/db/schema";

/**
 * 获取标签列表
 * @param filters - 筛选条件
 * @returns 标签列表
 */
export async function getTags(filters?: {
  type?: "location" | "route" | "activity";
  limit?: number;
  offset?: number;
}) {
  try {
    const db = await getDB();
    let query = db.select().from(tags);

    if (filters?.type) {
      query = query.where(eq(tags.type, filters.type)) as any;
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
    console.error("获取标签列表失败:", error);
    throw new Error("获取标签列表失败");
  }
}

/**
 * 根据 ID 获取标签详情
 * @param id - 标签 ID
 * @returns 标签详情
 */
export async function getTagById(id: string) {
  try {
    const db = await getDB();
    const result = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("获取标签详情失败:", error);
    throw new Error("获取标签详情失败");
  }
}

/**
 * 根据名称获取标签
 * @param name - 标签名称
 * @returns 标签信息
 */
export async function getTagByName(name: string) {
  try {
    const db = await getDB();
    const result = await db
      .select()
      .from(tags)
      .where(eq(tags.name, name))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("获取标签信息失败:", error);
    throw new Error("获取标签信息失败");
  }
}

/**
 * 获取实体的标签
 * @param entityId - 实体 ID
 * @param entityType - 实体类型
 * @returns 标签列表
 */
export async function getEntityTags(
  entityId: string,
  entityType: "location" | "route" | "activity"
) {
  try {
    const db = await getDB();
    const result = await db
      .select({
        tag: tags,
      })
      .from(entityToTags)
      .leftJoin(tags, eq(entityToTags.tagId, tags.id))
      .where(
        and(
          eq(entityToTags.entityId, entityId),
          eq(entityToTags.entityType, entityType)
        )
      );

    return result.map((r) => r.tag).filter((tag): tag is Tag => tag !== null);
  } catch (error) {
    console.error("获取实体标签失败:", error);
    throw new Error("获取实体标签失败");
  }
}

/**
 * 创建标签（管理员）
 * @param data - 标签数据
 * @returns 创建的标签
 */
export async function createTag(data: {
  name: string;
  type: "location" | "route" | "activity";
}) {
  try {
    // 检查标签是否已存在
    const existingTag = await getTagByName(data.name);
    if (existingTag) {
      return { success: true, tagId: existingTag.id, existing: true };
    }

    const tagId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newTag: any = {
      id: tagId,
      name: data.name,
      type: data.type,
      createdAt: new Date(),
    };

    const db = await getDB();
    await db.insert(tags).values(newTag);

    revalidatePath("/tags");
    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true, tagId, existing: false };
  } catch (error) {
    console.error("创建标签失败:", error);
    throw new Error("创建标签失败");
  }
}

/**
 * 更新标签（管理员）
 * @param id - 标签 ID
 * @param data - 更新数据
 */
export async function updateTag(
  id: string,
  data: Partial<{
    name: string;
    type: "location" | "route" | "activity";
  }>
) {
  try {
    const db = await getDB();
    await db.update(tags).set(data).where(eq(tags.id, id));

    revalidatePath("/tags");
    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true };
  } catch (error) {
    console.error("更新标签失败:", error);
    throw new Error("更新标签失败");
  }
}

/**
 * 删除标签（管理员）
 * @param id - 标签 ID
 */
export async function deleteTag(id: string) {
  try {
    const db = await getDB();
    await db.delete(tags).where(eq(tags.id, id));

    revalidatePath("/tags");
    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true };
  } catch (error) {
    console.error("删除标签失败:", error);
    throw new Error("删除标签失败");
  }
}

/**
 * 为实体添加标签
 * @param entityId - 实体 ID
 * @param entityType - 实体类型
 * @param tagIds - 标签 ID 数组
 */
export async function addTagsToEntity(
  entityId: string,
  entityType: "location" | "route" | "activity",
  tagIds: string[]
) {
  try {
    const entityTagRecords = tagIds.map((tagId) => ({
      id: `ett_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      entityId,
      entityType,
      tagId,
      createdAt: new Date(),
    }));

    const db = await getDB();
    await db.insert(entityToTags).values(entityTagRecords);

    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true };
  } catch (error) {
    console.error("添加标签失败:", error);
    throw new Error("添加标签失败");
  }
}

/**
 * 从实体移除标签
 * @param entityId - 实体 ID
 * @param entityType - 实体类型
 * @param tagIds - 标签 ID 数组
 */
export async function removeTagsFromEntity(
  entityId: string,
  entityType: "location" | "route" | "activity",
  tagIds: string[]
) {
  try {
    const db = await getDB();
    await db
      .delete(entityToTags)
      .where(
        and(
          eq(entityToTags.entityId, entityId),
          eq(entityToTags.entityType, entityType),
          inArray(entityToTags.tagId, tagIds)
        )
      );

    revalidatePath("/locations");
    revalidatePath("/routes");

    return { success: true };
  } catch (error) {
    console.error("移除标签失败:", error);
    throw new Error("移除标签失败");
  }
}

/**
 * 批量创建标签（根据名称）
 * @param names - 标签名称数组
 * @param type - 标签类型
 * @returns 标签 ID 数组
 */
export async function createTagsByNames(
  names: string[],
  type: "location" | "route" | "activity"
): Promise<string[]> {
  try {
    const tagIds: string[] = [];

    for (const name of names) {
      const result = await createTag({ name, type });
      tagIds.push(result.tagId);
    }

    return tagIds;
  } catch (error) {
    console.error("批量创建标签失败:", error);
    throw new Error("批量创建标签失败");
  }
}

/**
 * 批量设置地点标签（同步操作：添加新标签、移除不存在标签）
 * @param locationId - 地点 ID
 * @param tagIds - 要设置的标签 ID 数组
 * @returns 操作结果统计
 */
export async function setLocationTags(locationId: string, tagIds: string[]) {
  try {
    // 获取当前地点的所有标签
    const currentTags = await getEntityTags(locationId, "location");
    const currentTagIds = currentTags.map((t) => t.id);

    // 计算需要添加的标签（传入但当前不存在）
    const toAdd = tagIds.filter((id) => !currentTagIds.includes(id));
    // 计算需要移除的标签（当前存在但未传入）
    const toRemove = currentTagIds.filter((id) => !tagIds.includes(id));

    // 执行批量添加
    if (toAdd.length > 0) {
      await addTagsToEntity(locationId, "location", toAdd);
    }

    // 执行批量移除
    if (toRemove.length > 0) {
      await removeTagsFromEntity(locationId, "location", toRemove);
    }

    return {
      success: true,
      added: toAdd.length,
      removed: toRemove.length,
      currentTagIds,
      newTagIds: tagIds,
    };
  } catch (error) {
    console.error("设置地点标签失败:", error);
    throw new Error("设置地点标签失败");
  }
}
