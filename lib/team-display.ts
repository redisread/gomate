/**
 * 队伍显示工具函数
 * 提供队伍等级、状态、日期格式化等通用显示逻辑
 */

import type { UserLevel } from "@/lib/types";

// 等级标签映射
const levelMap: Record<string, string> = {
  beginner: "新手",
  intermediate: "进阶",
  advanced: "资深",
  expert: "专家",
};

// 等级颜色映射
const levelColorMap: Record<string, string> = {
  beginner: "bg-green-100 text-green-700 border-green-200",
  intermediate: "bg-blue-100 text-blue-700 border-blue-200",
  advanced: "bg-purple-100 text-purple-700 border-purple-200",
  expert: "bg-orange-100 text-orange-700 border-orange-200",
};

/**
 * 获取等级标签文本
 * @param level - 用户等级
 * @returns 等级显示文本
 */
export function getLevelText(level: string): string {
  return levelMap[level] || "新手";
}

/**
 * 获取等级标签颜色类名
 * @param level - 用户等级
 * @returns Tailwind 颜色类名
 */
export function getLevelColor(level: string | UserLevel): string {
  return levelColorMap[level] || "bg-stone-100 text-stone-700 border-stone-200";
}

/**
 * 获取队伍状态标签文本
 * @param status - 队伍状态
 * @param currentMembers - 当前成员数
 * @param maxMembers - 最大成员数
 * @returns 状态显示文本
 */
export function getStatusText(
  status: string,
  currentMembers: number,
  maxMembers: number
): string {
  if (status === "recruiting") {
    return currentMembers >= maxMembers ? "已满" : "招募中";
  }
  if (status === "full") return "已满";
  if (status === "formed") return "已组建";
  if (status === "completed") return "已完成";
  if (status === "cancelled") return "已取消";
  return "已关闭";
}

/**
 * 获取队伍状态标签颜色类名
 * @param status - 队伍状态
 * @param currentMembers - 当前成员数
 * @param maxMembers - 最大成员数
 * @returns Tailwind 颜色类名
 */
export function getStatusColor(
  status: string,
  currentMembers: number,
  maxMembers: number
): string {
  if (status === "recruiting" && currentMembers < maxMembers) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  return "bg-stone-100 text-stone-600 border-stone-200";
}

/**
 * 格式化日期（MM月DD日 HH:mm）
 * @param date - 日期字符串
 * @param time - 时间字符串（可选）
 * @returns 格式化后的日期文本
 */
export function formatTeamDate(date: string, time?: string): string {
  const dateObj = new Date(date);
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  return time ? `${month}月${day}日 ${time}` : `${month}月${day}日`;
}
