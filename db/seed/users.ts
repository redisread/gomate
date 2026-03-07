/**
 * 用户数据种子
 * 包含测试用户和管理员账号
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { hashPassword } from "better-auth/crypto";

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

// 测试用户数据
const usersData = [
  {
    email: "wujiahong2013@gmail.com",
    name: "伍家鸿",
    role: "admin" as const,
    password: "11111111",
    bio: "热爱户外，喜欢徒步和摄影",
    level: "expert",
  },
  {
    email: "1427298682@qq.com",
    name: "测试管理员",
    role: "admin" as const,
    password: "11111111",
    bio: "系统测试管理员账号",
    level: "expert",
  },
  {
    email: "1427298683@qq.com",
    name: "普通用户",
    role: "user" as const,
    password: "11111111",
    bio: "喜欢户外的新手",
    level: "beginner",
  },
  {
    email: "zhangsan@example.com",
    name: "张三",
    role: "user" as const,
    password: "11111111",
    bio: "喜欢徒步和露营",
    level: "intermediate",
  },
  {
    email: "lisi@example.com",
    name: "李四",
    role: "user" as const,
    password: "11111111",
    bio: "深圳户外爱好者",
    level: "advanced",
  },
  {
    email: "wangwu@example.com",
    name: "王五",
    role: "user" as const,
    password: "11111111",
    bio: "喜欢登山和摄影",
    level: "intermediate",
  },
  {
    email: "zhaoliu@example.com",
    name: "赵六",
    role: "user" as const,
    password: "11111111",
    bio: "徒步新手，期待和大家一起学习",
    level: "beginner",
  },
  {
    email: "test@example.com",
    name: "测试用户",
    role: "user" as const,
    password: "11111111",
    bio: "用于自动化测试的账号",
    level: "beginner",
  },
];

/**
 * 插入用户数据
 * Better Auth 设计：users 表存储用户信息，accounts 表存储认证信息（包括密码）
 */
export async function seedUsers(db: Database): Promise<UserData[]> {
  console.log("👤 开始插入用户数据...");

  // 插入 users 表
  const insertUserStmt = db.prepare(`
    INSERT OR IGNORE INTO users (
      id, email, name, email_verified, image, created_at, updated_at,
      role, bio, level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 插入 accounts 表（存储密码）
  const insertAccountStmt = db.prepare(`
    INSERT OR IGNORE INTO accounts (
      id, user_id, account_id, provider_id, password, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const insertedUsers: UserData[] = [];

  for (const user of usersData) {
    const userId = nanoid();
    // 使用 better-auth 的 hashPassword 加密密码
    const hashedPassword = await hashPassword(user.password);

    // 1. 插入用户到 users 表
    insertUserStmt.run(
      userId,
      user.email,
      user.name,
      1, // email_verified
      null, // image
      now,
      now,
      user.role,
      user.bio,
      user.level
    );

    // 2. 插入认证信息到 accounts 表
    // providerId 为 "credential" 表示邮箱/密码登录
    // accountId 使用邮箱地址
    const accountId = nanoid();
    insertAccountStmt.run(
      accountId,
      userId,
      user.email, // account_id
      "credential", // provider_id - 表示凭证登录
      hashedPassword,
      now,
      now
    );

    insertedUsers.push({
      id: userId,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    console.log(`  ✓ ${user.name} (${user.email}) - ${user.role}`);
  }

  console.log(`✅ 用户数据插入完成，共 ${insertedUsers.length} 个用户\n`);
  return insertedUsers;
}

/**
 * 获取用户 ID 映射
 */
export function getUserIdMap(users: UserData[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const user of users) {
    map.set(user.email, user.id);
    map.set(user.name, user.id);
  }
  return map;
}
