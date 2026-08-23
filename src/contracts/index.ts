export * from "./enums";
export * from "./team-checklist";

import type {
  ActivityType,
  Difficulty,
  LocationStatus,
  RecruitmentStatus,
  RegionLevel,
  StoryStatus,
  TeamJoinRequestStatus,
  TeamLifecycle,
  UserGender,
  UserLevel,
  UserRole,
  UserStatus,
} from "./enums";
import type { TeamChecklist } from "./team-checklist";

/** API timestamps are ISO 8601 strings; D1 stores Unix milliseconds. */
export type Timestamp = string;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Region {
  id: string;
  countryCode: string;
  parentId: string | null;
  name: string;
  nameEn: string | null;
  slug: string;
  code: string | null;
  level: RegionLevel;
  timezone: string | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
  serviceEnabled: boolean;
  isHot: boolean;
  sortOrder: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface ActivityTypeInfo {
  id: ActivityType;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}

export interface HikingLocationExtra {
  difficulty?: Difficulty;
  durationMin?: number;
  durationMax?: number;
  distanceKm?: number;
  elevationGainM?: number;
  bestSeasons?: string[];
  gearEssential?: string[];
  gearOptional?: string[];
  overview?: string | null;
  tips?: string[];
  warnings?: string[];
}

export interface LocationExtra {
  hiking?: HikingLocationExtra;
  facilities?: string[];
}

export interface Location {
  id: string;
  regionId: string;
  name: string;
  slug: string;
  supportedActivityTypes: ActivityType[];
  status: LocationStatus;
  subtitle: string | null;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string | null;
  images: string[];
  extra: LocationExtra;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  region?: Region;
  tags?: Tag[];
}

export interface UserExtra {
  level: UserLevel;
  completedHikes: number;
  wechat: string | null;
  city: string | null;
}

export interface SessionUser {
  id: string;
  name: string;
  nickname: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  bio: string | null;
  gender: UserGender | null;
  birthday: Timestamp | null;
  role: UserRole;
  status: UserStatus;
  extra: UserExtra;
  createdAt: Timestamp;
}

export interface TeamParticipant {
  userId: string;
  joinedAt: Timestamp;
  leftAt: Timestamp | null;
  user?: Pick<SessionUser, "id" | "name" | "nickname" | "image" | "bio" | "gender" | "birthday" | "extra">;
}

export interface TeamJoinRequest {
  id: string;
  teamId: string;
  userId: string;
  status: TeamJoinRequestStatus;
  message: string | null;
  decidedByUserId: string | null;
  decidedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Team {
  id: string;
  locationId: string;
  leaderId: string;
  activityType: ActivityType;
  title: string;
  description: string | null;
  startAt: Timestamp;
  endAt: Timestamp;
  maxParticipants: number;
  activeParticipantCount: number;
  requirements: string[];
  recruitmentStatus: RecruitmentStatus;
  formedAt: Timestamp | null;
  cancelledAt: Timestamp | null;
  lifecycle: TeamLifecycle;
  isFull: boolean;
  checklist: TeamChecklist | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  leader?: Pick<SessionUser, "id" | "name" | "nickname" | "image" | "bio" | "extra">;
  participants?: TeamParticipant[];
  location?: Location;
  tags?: Tag[];
}

export interface Story {
  id: string;
  authorId: string;
  teamId: string | null;
  locationId: string | null;
  title: string | null;
  summary: string | null;
  content: string;
  images: string[];
  status: StoryStatus;
  viewCount: number;
  likeCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  displayTitle: string;
  author: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  location: {
    id: string;
    name: string;
    slug: string;
  } | null;
  team: {
    id: string;
    title: string;
  } | null;
  tags: Tag[];
  isLiked: boolean;
}

export interface UserPublicProfile {
  id: string;
  name: string;
  nickname: string | null;
  image: string | null;
  bio: string | null;
  extra: UserExtra;
  createdAt: Timestamp;
  stats: {
    createdTeams: number;
    joinedTeams: number;
    completedTeams: number;
  };
}

export interface Conversation {
  id: string;
  teamId: string;
  memberUserId: string;
  initiatedByUserId: string;
  lastMessagePreview: string | null;
  lastMessageAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  team: { id: string; title: string };
  otherUser: Pick<SessionUser, "id" | "name" | "nickname" | "image"> | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: Timestamp | null;
  createdAt: Timestamp;
  sender?: Pick<SessionUser, "id" | "name" | "nickname" | "image"> | null;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
