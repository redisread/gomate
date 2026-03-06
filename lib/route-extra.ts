/**
 * Route Extra 字段类型定义
 * 用于 routes 表的 extra JSON 字段
 */
export interface RouteExtra {
  equipmentNeeded?: string[]; // 建议装备列表（如：["登山鞋", "登山杖", "充足的水"]）
  warnings?: string[]; // 安全警告列表（如：["雨天路滑", "注意防晒"]）
}
