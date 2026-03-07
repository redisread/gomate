/**
 * 用户工具函数
 * 提供用户信息展示等功能
 */

import type { User } from "@/db/schema";

/**
 * 获取用户展示名称（优先使用 nickname，回退到 name）
 */
export function getUserDisplayName(user: Pick<User, "nickname" | "name">): string {
  return user.nickname || user.name;
}

/**
 * 获取性别展示文本
 */
export function getGenderText(gender: string | null): string {
  switch (gender) {
    case "male":
      return "男";
    case "female":
      return "女";
    case "other":
      return "其他";
    default:
      return "未设置";
  }
}
