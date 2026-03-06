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
  subtitle?: string;
  description: string;
  address?: string;
  cityId: string;
  cityName: string;
  bestSeason: string[];
  coverImage: string;
  images: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  extra?: {
    facilities?: string[];  // ["parking", "restroom", "water", "food"]
    tips?: string;
    warnings?: string[];
  };

  // 新增：关联的路线数组
  routes?: Route[];
  tags?: Tag[];

  // 兼容层（临时，从 routes[0] 提取）
  // 这些字段将在所有组件迁移完成后移除
  difficulty?: 'easy' | 'moderate' | 'hard' | 'expert';
  duration?: string;
  distance?: string;
  elevation?: string;
  routeGuide?: {
    overview: string;
    waypoints: { name: string; description: string; distance: string }[];
    tips: string[];
    warnings: string[];
  };
  waypoints?: { name: string; lat: number; lng: number; description: string }[];
  equipmentNeeded?: string[];

  createdAt: string;
  updatedAt: string;
}

// 路线信息
export interface Route {
  id: string;
  locationId: string;
  cityId: string;
  name: string;
  description?: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
  duration: string;
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
  tags?: Tag[]; // 关联的标签
  location?: Location; // 关联的地点
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string; // 用户 ID
  name: string;
  image: string | null;
  bio: string | null;
  level: string;
  status?: 'pending' | 'approved' | 'rejected' | 'leave_pending';
  joinedAt: Date | string | null;
  wechat?: string; // 微信号（仅队友可见）
  gender?: string | null; // 性别
  birthday?: Date | number | string | null; // 生日（可能是 Date、时间戳或字符串）
  extra?: string | null; // 扩展信息（JSON 字符串）
}

export interface Team {
  id: string;
  locationId: string;
  routeId: string; // 关联路线 ID
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  maxMembers: number;
  currentMembers: number;
  requirements: string[];
  leader: {
    id: string;
    name: string;
    avatar: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    completedHikes: number;
    bio: string;
    wechat?: string; // 微信号（仅队友可见）
    gender?: string | null; // 性别
    birthday?: Date | number | string | null; // 生日（可能是 Date、时间戳或字符串）
    extra?: string | null; // 扩展信息（JSON 字符串）
  };
  status: 'recruiting' | 'full' | 'formed' | 'ongoing' | 'completed' | 'cancelled' | 'open' | 'closed';
  createdAt: string;
  members?: TeamMember[]; // 已加入的成员列表
  route?: Route; // 关联的路线信息
  location?: Location; // 关联的地点信息
}
