/**
 * GoMate 类型定义
 * V1 版本 - 深圳徒步场景
 */

// ========== 地点相关类型 ==========

export interface Location {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  difficulty: DifficultyLevel;
  duration: number; // 预计耗时（小时）
  distance: number; // 距离（公里）
  elevation: number; // 爬升（米）
  images: string[];
  tags: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  transportGuide: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DifficultyLevel = "easy" | "moderate" | "hard" | "expert";

export const DifficultyLabels: Record<DifficultyLevel, string> = {
  easy: "简单",
  moderate: "中等",
  hard: "困难",
  expert: "专家",
};

// ========== 队伍相关类型 ==========

export interface Team {
  id: string;
  locationId: string;
  leaderId: string;
  title: string;
  description: string;
  maxMembers: number;
  currentMembers: number;
  startTime: Date;
  endTime?: Date;
  meetingPoint: string;
  status: TeamStatus;
  requirements?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TeamStatus = "recruiting" | "full" | "ongoing" | "completed" | "cancelled";

export const TeamStatusLabels: Record<TeamStatus, string> = {
  recruiting: "招募中",
  full: "已满员",
  ongoing: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

// ========== 成员相关类型 ==========

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: Date;
}

export type MemberRole = "leader" | "member";

export type MemberStatus = "active" | "left" | "removed";

// ========== 用户相关类型 ==========

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  phone?: string;
  wechatId?: string;
  bio?: string;
  hikingExperience?: DifficultyLevel;
  createdAt: Date;
  updatedAt: Date;
}

// ========== API 响应类型 ==========

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ========== 表单相关类型 ==========

export interface CreateTeamInput {
  locationId: string;
  title: string;
  description: string;
  maxMembers: number;
  startTime: Date;
  endTime?: Date;
  meetingPoint: string;
  requirements?: string;
}

export interface UpdateTeamInput extends Partial<CreateTeamInput> {
  id: string;
}

export interface JoinTeamInput {
  teamId: string;
  message?: string;
}

// ========== 筛选相关类型 ==========

export interface LocationFilters {
  difficulty?: DifficultyLevel;
  minDuration?: number;
  maxDuration?: number;
  search?: string;
}

export interface TeamFilters {
  locationId?: string;
  status?: TeamStatus;
  startDateFrom?: Date;
  startDateTo?: Date;
}
