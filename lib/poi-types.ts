/**
 * POI (Point of Interest) 类型定义
 * 用于 pois 表（物理兴趣点库）和 entity_to_pois 表（角色关联）
 */

// POI 类别（物理实体类型）
export type PoiCategory =
  | "mountain_peak"     // 山峰
  | "waterfall"         // 瀑布
  | "viewpoint"         // 观景台
  | "parking"           // 停车场
  | "restroom"          // 洗手间
  | "restaurant"        // 餐厅
  | "store"             // 商店
  | "checkpoint"        // 打卡点
  | "trail_marker"      // 路标
  | "rest_area"         // 休息区
  | "other";            // 其他

// 关联实体类型
export type PoiEntityType =
  | "route"       // 关联到路线
  | "location"    // 关联到地点
  | "city";       // 关联到城市

// POI 在不同上下文中的角色类型
export type PoiRoleType =
  | "waypoint"    // 路线途径点（有序）
  | "checkpoint"  // 打卡点（无序）
  | "viewpoint"   // 观景点（无序）
  | "facility"    // 设施点（无序）
  | "poi";        // 通用兴趣点（无序）

// POI Extra 字段结构（物理实体的通用属性）
export interface PoiExtra {
  elevation?: number;           // 海拔（米）
  prominence?: number;          // 相对高度（米）
  openHours?: string;           // 开放时间
  fee?: string;                 // 费用
  facilities?: string[];        // 设施列表
  contact?: {                   // 联系方式
    phone?: string;
    website?: string;
  };
  [key: string]: any;           // 其他扩展字段
}

// 角色特定数据结构（上下文相关的属性）
export interface PoiRoleSpecificData {
  // 途径点专用
  instructions?: string;        // 途径指引（如"登顶后拍照留念"）
  estimatedTime?: number;       // 从上一点到此点的预计时间（分钟）

  // 观景点专用
  viewDescription?: string;     // 景观描述（如"可俯瞰深圳全景"）
  bestViewingTime?: string;     // 最佳观赏时间（如"日出"、"日落"）

  // 设施点专用
  capacity?: number;            // 容量（如停车位数量）
  availability?: string;        // 可用性说明

  // 打卡点专用
  isPopular?: boolean;          // 是否热门打卡点
  photoSpots?: string[];        // 推荐拍照位置

  [key: string]: any;           // 其他角色特定字段
}

// 坐标类型
export interface Coordinates {
  lat: number;
  lng: number;
}
