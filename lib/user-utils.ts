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

/**
 * 计算年龄
 */
export function calculateAge(birthday: string | null | undefined): number | null {
  if (!birthday) return null;

  const birthDate = new Date(birthday);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  // 如果今年生日还没到，年龄减1
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * 获取年龄展示文本
 */
export function getAgeText(birthday: string | null | undefined): string {
  const age = calculateAge(birthday);
  return age !== null ? `${age}岁` : "";
}
