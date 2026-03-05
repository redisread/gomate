/**
 * 用户 extra 字段工具函数
 * extra 字段以 JSON 格式存储用户的扩展配置信息
 */

// Extra 字段类型定义（精简版）
export interface UserExtra {
  equipment?: string[]; // 常用装备列表，如 ["登山鞋", "冲锋衣", "登山杖"]
  experience?: string; // 徒步经验描述，如 "有3年徒步经验，完成过梧桐山、七娘山等路线"
}

/**
 * 解析用户 extra 字段
 */
export function parseUserExtra(extra: string | null): UserExtra {
  if (!extra) return {};
  try {
    return JSON.parse(extra) as UserExtra;
  } catch {
    return {};
  }
}

/**
 * 序列化 extra 字段
 */
export function stringifyUserExtra(extra: UserExtra): string {
  return JSON.stringify(extra);
}

/**
 * 合并 extra 字段更新
 */
export function mergeUserExtra(
  current: string | null,
  updates: Partial<UserExtra>
): string {
  const parsed = parseUserExtra(current);
  return stringifyUserExtra({ ...parsed, ...updates });
}

/**
 * 校验 extra 字段合法性
 */
export function validateUserExtra(extra: unknown): extra is UserExtra {
  if (typeof extra !== "object" || extra === null) return false;

  const data = extra as Record<string, unknown>;

  // 校验 equipment 字段
  if (data.equipment !== undefined) {
    if (!Array.isArray(data.equipment)) return false;
    if (!data.equipment.every((item) => typeof item === "string")) return false;
  }

  // 校验 experience 字段
  if (data.experience !== undefined && typeof data.experience !== "string") {
    return false;
  }

  return true;
}
