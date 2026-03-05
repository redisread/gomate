// GoMate 前端类型定义

export interface Location {
  id: string;
  name: string;
  adcode?: string; // 高德行政区划代码
  cityName?: string; // 城市名称
  subtitle: string;
  description: string;
  coverImage: string;
  images: string[];
  difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
  duration: string;
  distance: string;
  elevation: string;
  bestSeason: string[];
  tags: string[];
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  routeGuide: {
    overview: string;
    waypoints: {
      name: string;
      description: string;
      distance: string;
    }[];
    tips: string[];
    warnings: string[];
  };
  facilities: {
    parking: boolean;
    restroom: boolean;
    water: boolean;
    food: boolean;
  };
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
}
