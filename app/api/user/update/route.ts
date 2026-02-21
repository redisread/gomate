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
    const { userId, name, bio, experience, image } = body;

    console.log("Update user request:", { userId, name, bio, experience });

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
    if (experience !== undefined) {
      updateData.experience = experience;
      // 同时更新 level 字段，保持与 experience 一致
      updateData.level = experience;
    }
    if (image !== undefined) updateData.image = image;

    // 手动设置 updatedAt（Drizzle ORM 会自动转换为时间戳）
    updateData.updatedAt = new Date();

    console.log("Update data:", updateData);

    // 首先通过 email 查找用户（Better Auth 的 session.user.id 可能是 email）
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, userId))
      .limit(1);

    console.log("Existing user by email:", existingUser);

    let targetUserId = userId;
    if (existingUser.length > 0) {
      targetUserId = existingUser[0].id;
    }

    console.log("Target user ID:", targetUserId);

    // 先查询用ID查找用户
    const userById = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);

    console.log("User by ID:", userById);

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

    console.log("Update result:", JSON.stringify(updateResult));

    // 获取更新后的用户信息
    const updatedUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1);

    console.log("Updated user from DB:", JSON.stringify(updatedUser[0]));

    if (!updatedUser.length) {
      return NextResponse.json(
        { error: "User not found after update" },
        { status: 404 }
      );
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
