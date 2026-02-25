"use server";

import { getDB } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";

// 获取当前用户
export async function getCurrentUser() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  // 获取完整的用户信息（包括 bio 和 level）
  const db = await getDB();
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  return user;
}

// 获取用户公开资料
export async function getUserProfile(userId: string) {
  const db = await getDB();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      name: true,
      image: true,
      bio: true,
      level: true,
      createdAt: true,
    },
  });

  return user;
}

// 更新用户资料
export async function updateProfile(data: {
  name?: string;
  bio?: string;
  level?: string;
  image?: string;
}) {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("请先登录");
  }

  const userId = session.user.id;
  const db = await getDB();

  // 验证数据
  if (data.name && data.name.length > 255) {
    throw new Error("昵称不能超过 255 个字符");
  }

  if (data.bio && data.bio.length > 2000) {
    throw new Error("个人简介不能超过 2000 个字符");
  }

  if (data.level && !["beginner", "intermediate", "advanced", "expert"].includes(data.level)) {
    throw new Error("无效的经验等级");
  }

  // 更新用户资料
  const [updatedUser] = await db
    .update(users)
    .set({
      ...(data.name && { name: data.name }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.level && { level: data.level }),
      ...(data.image && { image: data.image }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  // 清除缓存
  revalidateTag(`user-${userId}`);

  return updatedUser;
}

// 更新用户头像
export async function updateAvatar(imageUrl: string) {
  return updateProfile({ image: imageUrl });
}

// 检查用户是否已验证邮箱
export async function isEmailVerified() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return false;
  }

  const db = await getDB();
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      emailVerified: true,
    },
  });

  return user?.emailVerified || false;
}
