import { NextRequest, NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

// 动态导入 @opennextjs/cloudflare 以避免构建时错误
const getCloudflareContext = async () => {
  const mod = await import("@opennextjs/cloudflare");
  return mod.getCloudflareContext();
};

/**
 * PATCH /api/user/update
 * 更新用户信息
 */
export async function PATCH(request: NextRequest) {
  try {
    // 获取 Cloudflare 上下文
    const { env } = await getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const db = drizzle(env.DB as D1Database, { schema });

    // 解析请求体
    const body = await request.json();
    const { userId, name, bio, level, image } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // 构建更新数据
    const updateData: Partial<typeof schema.users.$inferInsert> = {};

    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (level !== undefined) {
      updateData.level = level;
    }
    if (image !== undefined) updateData.image = image;

    // 手动设置 updatedAt（Drizzle ORM 会自动转换为时间戳）
    updateData.updatedAt = new Date();

    // 首先通过 email 查找用户（Better Auth 的 session.user.id 可能是 email）
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, userId))
      .limit(1);

    let targetUserId = userId;
    if (existingUser.length > 0) {
      targetUserId = existingUser[0].id;
    }

    // 先查询用ID查找用户
    const userById = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);

    if (userById.length === 0) {
      return NextResponse.json(
        { error: "User not found with ID: " + targetUserId },
        { status: 404 }
      );
    }

    // 更新数据库
    const updateResult = await db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, targetUserId));

    // 获取更新后的用户信息
    const updatedUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);

    if (!updatedUser.length) {
      return NextResponse.json(
        { error: "User not found after update" },
        { status: 404 }
      );
    }

    // 清除 KV 缓存中的用户相关数据
    // Better Auth 使用 KV 作为 secondaryStorage，需要清除缓存以保持一致性
    if ((env as { GOMATE_KV?: KVNamespace }).GOMATE_KV) {
      const kv = (env as { GOMATE_KV: KVNamespace }).GOMATE_KV;
      const keysToDelete = [`user:${targetUserId}`];

      for (const key of keysToDelete) {
        try {
          await kv.delete(key);
          console.log("[KV] Deleted cache key:", key);
        } catch (err) {
          console.warn("[KV] Failed to delete key:", key, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: updatedUser[0],
    });
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json(
      { error: "Failed to update user", message: (error as Error).message },
      { status: 500 }
    );
  }
}
