/**
 * GoMate 共享类型定义入口
 * 供 api、frontend、mobile 各子包共享使用
 */

export * from "./enums";

/** ISO 格式时间戳 */
export type Timestamp = string;

/** 地理坐标 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** 城市信息 */
export interface City {
  id: string;
  adcode: string;
  name: string;
  pinyin?: string;
  province?: string;
  level: "city" | "district";
  isHot: boolean;
  parentId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** 标签 */
export interface Tag {
  id: string;
  name: string;
  type: "location" | "route" | "activity";
}

/** 地点基础信息 */
export interface Location {
  id: string;
  name: string;
  slug: string;
  subtitle?: string;
  description: string;
  address?: string;
  cityId: string;
  cityName?: string;
  bestSeason: string[];
  coverImage: string;
  images: string[];
  coordinates: Coordinates;
  extra?: {
    facilities?: string[];
    tips?: string;
    warnings?: string[];
  };
  routes?: Route[];
  tags?: Tag[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** 路线 POI */
export interface RoutePoi {
  id: string;
  name: string;
  description?: string | null;
  coordinates: Coordinates;
  images?: string[];
  extra?: Record<string, unknown> | null;
  order?: number | null;
  roleType: "waypoint" | "checkpoint" | "viewpoint" | "facility" | "poi";
  roleSpecificData?: Record<string, unknown> | null;
}

/** POI 详情（完整实体） */
export interface PoiDetail {
  id: string;
  name: string;
  description?: string | null;
  coordinates: Coordinates;
  images?: string[];
  extra?: Record<string, unknown> | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** POI 创建输入 */
export interface PoiCreateInput {
  name: string;
  coordinates: Coordinates;
  description?: string;
  images?: string[];
}

/** POI 更新输入 */
export interface PoiUpdateInput {
  name?: string;
  coordinates?: Coordinates;
  description?: string;
  images?: string[];
}

/** 路线信息 */
export interface Route {
  id: string;
  locationId: string;
  cityId: string;
  name: string;
  description?: string;
  difficulty: "easy" | "moderate" | "hard" | "expert";
  duration: string;
  durationMin?: number;
  durationMax?: number;
  distance: string;
  elevation?: string;
  routeGuide?: {
    overview: string;
    tips: string[];
  };
  waypoints?: {
    name: string;
    lat: number;
    lng: number;
    description: string;
  }[];
  equipmentNeeded?: string[];
  warnings?: string[];
  tags?: Tag[];
  location?: Location;
  pois?: RoutePoi[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** 队伍成员 */
export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  nickname?: string | null;
  image: string | null;
  bio: string | null;
  level: string;
  status?: "pending" | "approved" | "rejected" | "leave_pending";
  joinedAt: Timestamp | null;
  wechat?: string;
  gender?: string | null;
  birthday?: Timestamp | null;
  extra?: string | null;
}

/** 队伍信息 */
export interface Team {
  id: string;
  locationId: string;
  routeId?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  durationMin?: number;
  maxMembers: number;
  currentMembers: number;
  requirements: string[];
  icon?: string;
  leader: {
    id: string;
    name: string;
    nickname?: string | null;
    avatar: string;
    level: string;
    completedHikes: number;
    bio: string;
    wechat?: string;
    gender?: string | null;
    birthday?: Timestamp | null;
    extra?: string | null;
  };
  status: "recruiting" | "full" | "formed" | "cancelled" | "completed";
  createdAt: Timestamp;
  members?: TeamMember[];
  route?: Route;
  location?: Location;
}

/** 用户公开资料 */
export interface UserPublicProfile {
  id: string;
  name: string;
  nickname: string | null;
  image: string | null;
  bio: string | null;
  gender: string | null;
  birthday: Timestamp | null;
  level: string;
  completedHikes: number;
  extra: string | null;
  createdAt: Timestamp;
  stats: {
    createdTeams: number;
    joinedTeams: number;
    completedTeams: number;
  };
}

/** API 通用响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 分页信息 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}
