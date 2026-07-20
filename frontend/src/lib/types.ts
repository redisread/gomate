import type { TeamStatus, TeamChecklist } from "@gomate/types";

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
  type: 'location' | 'activity';
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
  /** task #152：徒步参数扁平化到 location（API 下发 number，单位：分钟/公里/米） */
  durationMin?: number | null;
  durationMax?: number | null;
  distance?: string | number | null;
  elevation?: string | number | null;
  equipmentNeeded?: string[];
  bestSeason: string[];
  coverImage: string;
  images: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  /**
   * P0-B T2/T3（spec §3.4 / §5.4）：详情页决策信息 4 字段
   * - `parkingAvailable` boolean 三态：true=有停车 / false=无停车 / null=信息缺失（不渲染）
   * - `parkingInfo` 自由文本 (<100)
   * - `gearEssential/gearOptional` API 层已切好 string[]（源自 CSV 存储）
   */
  parkingAvailable?: boolean | null;
  parkingInfo?: string | null;
  gearEssential?: string[] | null;
  gearOptional?: string[] | null;
  extra?: {
    facilities?: string[];  // ["parking", "restroom", "water", "food"]
    tips?: string | string[];
    warnings?: string[];
    /** task #152：主路线攻略回填（0011 迁移），缺省字段为显式 null，按 falsy 隐藏 */
    hiking?: {
      overview?: string | null;
      tips?: string[] | null;
      equipmentNeeded?: string[] | null;
      warnings?: string[] | null;
    } | null;
  };

  tags?: Tag[];

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
  status: TeamStatus;
  createdAt: string;
  members?: TeamMember[]; // 已加入的成员列表
  location?: Location; // 关联的地点信息
  /**
   * task #163 + #165 CR B1：行动本 checklist
   * - 队长/成员：下发完整数据
   * - 访客（未登录或非成员）：server 返回 null —— 走 visitor 渲染路径
   * - 未填：undefined
   */
  checklist?: TeamChecklist | null;
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

// ─── P0-B T2/T3：交通决策 API 响应 ─────────────────────────────────────────────
// 与 api/src/routes/locations/transportation.ts 契约同步
// spec: notes/gomate-p0b-location-decision-spec.md §7

export interface TransportationSubway {
  station: string;
  lines: string[];
  distanceMeters: number;
  walkMinutes: number;
  /** true 时前端加"建议骑车/打车接驳"提示（>800m 或 amap walking direction 挂了走匀速兜底）*/
  approximate: boolean;
}

export interface TransportationDriving {
  distanceKm: number;
  durationMinutes: number;
  referencePointLabel: { zh: string; en: string; ja: string };
}

export interface TransportationData {
  /** 始终可用（无 amap 依赖）；空字符串 = 无坐标，前端整块不渲染 */
  mapUrl: string;
  subway: TransportationSubway | null;
  driving: TransportationDriving | null;
  /** true = subway/driving 都空，前端切换为「单一 mapUrl 链接」视觉 */
  amapAllFailed: boolean;
}

export interface TransportationResponse {
  success: boolean;
  locationId: string;
  transportation: TransportationData;
  meta: {
    cacheHit: boolean;
    /** >=7 时前端展示「信息更新于 X 天前」灰字 */
    staleDays: number | null;
  };
}
