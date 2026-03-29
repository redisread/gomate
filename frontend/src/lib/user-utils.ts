/**
 * 用户相关工具函数
 */

/** 用户扩展信息结构 */
export interface UserExtra {
  equipment?: string[];
  experience?: string;
}

/**
 * 解析用户扩展信息 JSON 字符串
 * @param extra JSON 字符串或 null
 * @returns 解析后的对象，解析失败返回空对象
 */
export function parseExtra(extra: string | null | undefined): UserExtra {
  if (!extra) return {};
  try {
    return JSON.parse(extra);
  } catch {
    return {};
  }
}

/**
 * 将生日转为日期显示字符串 (YYYY-MM-DD)
 * @param birthday ISO 字符串、时间戳或 null
 * @returns 日期字符串或空字符串
 */
export function formatBirthday(birthday: string | number | null | undefined): string {
  if (!birthday) return "";
  const d = new Date(birthday);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 将生日转为年龄数值（正确计算，考虑月份和日期）
 * @param birthday ISO 字符串、时间戳或 null
 * @returns 年龄数值或 null
 */
export function getAgeNumber(birthday: string | number | null | undefined): number | null {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const now = new Date();
  
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  
  return age < 0 ? null : age;
}

/**
 * 根据生日计算年龄字符串
 * @param birthday ISO 字符串、时间戳或 null
 * @returns 年龄字符串（如 "25岁"）或空字符串
 */
export function getAgeFromBirthday(birthday: string | number | null | undefined): string {
  const age = getAgeNumber(birthday);
  if (age === null) return "";
  return `${age}岁`;
}

/**
 * 将日期字符串转为时间戳
 * @param dateStr 日期字符串 (YYYY-MM-DD)
 * @returns 时间戳 (ms) 或 null
 */
export function birthdayToTimestamp(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  // 使用 UTC 时间避免时区偏移
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}