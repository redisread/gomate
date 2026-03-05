/**
 * 用户工具函数
 * 提供用户信息展示、年龄计算等功能
 */

import type { User } from "@/db/schema";

/**
 * 获取用户展示名称（优先使用 nickname，回退到 name）
 */
export function getUserDisplayName(user: Pick<User, "nickname" | "name">): string {
  return user.nickname || user.name;
}

/**
 * 计算用户年龄（从生日时间戳）
 */
export function calculateAge(birthday: Date | number | string | null): number | null {
  if (!birthday) return null;

  let birthDate: Date;

  if (typeof birthday === "number") {
    birthDate = new Date(birthday);
  } else if (typeof birthday === "string") {
    birthDate = new Date(birthday);
  } else if (birthday instanceof Date) {
    birthDate = birthday;
  } else {
    return null;
  }

  // 验证日期是否有效
  if (isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * 获取年龄段标签
 */
export function getAgeGroup(birthday: Date | number | string | null): string | null {
  const age = calculateAge(birthday);
  if (age === null) return null;

  if (age < 18) return "未成年";
  if (age < 25) return "18-25岁";
  if (age < 35) return "26-35岁";
  if (age < 45) return "36-45岁";
  if (age < 55) return "46-55岁";
  return "55岁以上";
}

/**
 * 获取年龄显示文本（具体年龄）
 */
export function getAgeText(birthday: Date | number | string | null): string | null {
  const age = calculateAge(birthday);
  if (age === null) return null;
  return `${age}岁`;
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
