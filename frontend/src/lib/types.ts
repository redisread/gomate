// GoMate 前端类型定义

// 城市信息
export interface City {
  id: string;
  adcode: string;
  name: string;
  pinyin?: string;
  province?: string;
  level: 'city' | 'district';
  isHot: boolean;
  parentId?: string;
}

// 标签
export interface Tag {
  id: string;
  name: string;
  type: 'location' | 'route' | 'activity';
}

// 地点信息（基础信息）
export interface Location {
  id: string;
  name: string;
  slug: string;
  type?: "hiking" | "explore" | "leisure" | "travel" | null;
  subtitle?: string;
  description: string;
  address?: string;
  cityId: string;
  cityName: string;
  difficulty?: "easy" | "moderate" | "hard" | "expert";
  duration?: string;
  distance?: string;
  elevation?: string;
  equipmentNeeded?: string[];
  bestSeason: string[];
  coverImage: string;
  images: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  extra?: {
    facilities?: string[];  // ["parking", "restroom", "water", "food"]
    tips?: string | string[];
    warnings?: string[];
  };

  // 关联的路线数组
  routes?: Route[];
  tags?: Tag[];

  createdAt: string;
  updatedAt: string;
}

// 路线 POI 类型
export interface RoutePoi {
  id: string;
  name: string;
  description?: string | null;
  coordinates: { lat: number; lng: number };
  images?: string[];
  extra?: Record<string, any> | null;
  order?: number | null;
  roleType: 'waypoint' | 'checkpoint' | 'viewpoint' | 'facility' | 'poi';
  roleSpecificData?: Record<string, any> | null;
}

// POI 类型从共享包导入
export type { PoiDetail, PoiCreateInput, PoiUpdateInput } from "@gomate/types";

// 路线信息
export interface Route {
  id: string;
  locationId: string;
  cityId: string;
  name: string;
  description?: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
  duration?: string;
  durationMin?: number;
  durationMax?: number;
  distance?: string | number;
  elevation?: string | number;
  routeGuide?: {
    overview: string;
    tips: string[];
  } | string;
  waypoints?: {
    name: string;
    lat: number;
    lng: number;
    description: string;
  }[];
  equipmentNeeded?: string[];
  warnings?: string[];
  extra?: {
    equipmentNeeded?: string[];
    warnings?: string[];
  } | string | null;
  tags?: Tag[]; // 关联的标签
  location?: Location; // 关联的地点
  pois?: RoutePoi[]; // 关联的 POI
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  nickname?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "user" | "admin" | string | null;
  bio?: string | null;
  level?: UserLevel | null;
  completedHikes?: number | null;
  createdAt?: string | null;
  wechat?: string | null;
  gender?: string | null;
  birthday?: string | null;
  extra?: string | null;
}

export interface TeamMember {
  id: string;
  userId: string; // 用户 ID
  name: string;
  nickname?: string | null; // 昵称（优先显示）
  avatar: string | null;
  bio: string | null;
  level: string;
  status?: 'pending' | 'approved' | 'rejected' | 'leave_pending';
  joinedAt: Date | string | null;
  wechat?: string; // 微信号（仅队友可见）
  gender?: string | null; // 性别
  birthday?: Date | number | string | null; // 生日（可能是 Date、时间戳或字符串）
  extra?: string | null; // 扩展信息（JSON 字符串）
}

// 用户等级
export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// 用户公开资料
export interface UserPublicProfile {
  id: string;
  name: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  gender: string | null;
  birthday: string | null;
  level: UserLevel;
  completedHikes: number;
  extra: string | null;
  createdAt: string;
  stats: {
    createdTeams: number;
    joinedTeams: number;
    completedTeams: number;
  };
}

export interface Team {
  id: string;
  locationId: string;
  routeId?: string; // 关联路线 ID（可选）
  title: string;
  description: string;
  date: string;
  time: string;
  startTime?: string; // 开始时间（API 返回，可能不存在）
  duration: string;
  durationMin?: number; // 活动时长（分钟）
  maxMembers: number;
  currentMembers: number;
  requirements: string[];
  icon?: string; // 队伍图标（emoji）
  leader: {
    id: string;
    name: string;
    nickname?: string | null; // 昵称（优先显示）
    avatar: string | null;
    level: UserLevel;
    completedHikes: number;
    bio: string;
    wechat?: string; // 微信号（仅队友可见）
    gender?: string | null; // 性别
    birthday?: Date | number | string | null; // 生日（可能是 Date、时间戳或字符串）
    extra?: string | null; // 扩展信息（JSON 字符串）
  };
  status: 'recruiting' | 'full' | 'formed' | 'cancelled' | 'completed';
  createdAt: string;
  members?: TeamMember[]; // 已加入的成员列表
  route?: Route; // 关联的路线信息
  location?: Location; // 关联的地点信息
}

// 入队申请
export interface Application {
  id: string;
  userId: string;
  createdAt: Date | string;
  user: {
    id: string;
    name: string;
    nickname: string | null;
    avatar: string | null;
    bio: string | null;
    level: string;
  };
}
