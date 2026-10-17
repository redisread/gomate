import { z } from "zod";

export * from "./admin-i18n";
export * from "./enums";
export * from "./team-checklist";

import {
  ActivityTypeSchema,
  LocationStatusSchema,
  RecruitmentStatusSchema,
  RegionLevelSchema,
  StoryStatusSchema,
  TeamJoinRequestStatusSchema,
  TeamLifecycleSchema,
  UserGenderSchema,
  UserLevelSchema,
  UserRoleSchema,
  UserStatusSchema,
} from "./enums";
import { TeamChecklistSchema } from "./team-checklist";

/** API timestamps are ISO 8601 strings; D1 stores Unix milliseconds. */
export const TimestampSchema = z.iso.datetime({ offset: true });
export type Timestamp = z.infer<typeof TimestampSchema>;

export const CoordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

export const RegionSchema = z.object({
  id: z.string(),
  countryCode: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  nameEn: z.string().nullable(),
  slug: z.string(),
  code: z.string().nullable(),
  level: RegionLevelSchema,
  timezone: z.string().nullable(),
  centerLatitude: z.number().nullable(),
  centerLongitude: z.number().nullable(),
  serviceEnabled: z.boolean(),
  isHot: z.boolean(),
  sortOrder: z.number(),
});
export type Region = z.infer<typeof RegionSchema>;

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

export const HikingLocationExtraSchema = z.object({
  bestSeasons: z.array(z.string()).optional(),
});
export type HikingLocationExtra = z.infer<typeof HikingLocationExtraSchema>;

export const LocationExtraSchema = z.object({
  hiking: HikingLocationExtraSchema.optional(),
  facilities: z.array(z.string()).optional(),
});
export type LocationExtra = z.infer<typeof LocationExtraSchema>;

export const LocationSchema = z.object({
  id: z.string(),
  regionId: z.string(),
  name: z.string(),
  slug: z.string(),
  supportedActivityTypes: z.array(ActivityTypeSchema),
  status: LocationStatusSchema,
  subtitle: z.string().nullable(),
  description: z.string(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  coverImageUrl: z.string().nullable(),
  images: z.array(z.string()),
  extra: LocationExtraSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  region: RegionSchema.optional(),
  tags: z.array(TagSchema).optional(),
});
export type Location = z.infer<typeof LocationSchema>;

export const LocationStatsResponseSchema = z.object({
  success: z.literal(true),
  total: z.number(),
  regions: z.array(z.object({ region: RegionSchema, count: z.number() })),
  points: z.array(
    LocationSchema.pick({
      id: true,
      name: true,
      slug: true,
      regionId: true,
      latitude: true,
      longitude: true,
      coverImageUrl: true,
      supportedActivityTypes: true,
    }).extend({ region: RegionSchema }),
  ),
});
export type LocationStatsResponse = z.infer<typeof LocationStatsResponseSchema>;

export const UserExtraSchema = z.object({
  level: UserLevelSchema,
  completedHikes: z.number(),
  wechat: z.string().nullable(),
  city: z.string().nullable(),
});
export type UserExtra = z.infer<typeof UserExtraSchema>;

export const SessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  nickname: z.string().nullable(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  bio: z.string().nullable(),
  gender: UserGenderSchema.nullable(),
  birthday: TimestampSchema.nullable(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  extra: UserExtraSchema,
  createdAt: TimestampSchema,
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const AdminUserSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  nickname: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  createdAt: TimestampSchema,
});
export type AdminUserSummary = z.infer<typeof AdminUserSummarySchema>;

export const TeamParticipantSchema = z.object({
  userId: z.string(),
  joinedAt: TimestampSchema,
  leftAt: TimestampSchema.nullable(),
  user: SessionUserSchema.pick({
    id: true,
    name: true,
    nickname: true,
    image: true,
    bio: true,
    gender: true,
    birthday: true,
    extra: true,
  }).optional(),
});
export type TeamParticipant = z.infer<typeof TeamParticipantSchema>;

export const TeamJoinRequestSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  status: TeamJoinRequestStatusSchema,
  message: z.string().nullable(),
  decidedByUserId: z.string().nullable(),
  decidedAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type TeamJoinRequest = z.infer<typeof TeamJoinRequestSchema>;

export const TeamSchema = z.object({
  id: z.string(),
  locationId: z.string(),
  leaderId: z.string(),
  activityType: ActivityTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  startAt: TimestampSchema,
  endAt: TimestampSchema,
  maxParticipants: z.number(),
  activeParticipantCount: z.number(),
  requirements: z.array(z.string()),
  recruitmentStatus: RecruitmentStatusSchema,
  formedAt: TimestampSchema.nullable(),
  cancelledAt: TimestampSchema.nullable(),
  lifecycle: TeamLifecycleSchema,
  isFull: z.boolean(),
  checklist: TeamChecklistSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  leader: SessionUserSchema.pick({
    id: true,
    name: true,
    nickname: true,
    image: true,
    bio: true,
    extra: true,
  }).optional(),
  participants: z.array(TeamParticipantSchema).optional(),
  location: LocationSchema.optional(),
  tags: z.array(TagSchema).optional(),
});
export type Team = z.infer<typeof TeamSchema>;

export const AdminTeamSummarySchema = TeamSchema.pick({
  id: true,
  title: true,
  recruitmentStatus: true,
  lifecycle: true,
  createdAt: true,
  activeParticipantCount: true,
  maxParticipants: true,
}).extend({
  leader: SessionUserSchema.pick({ id: true, name: true, nickname: true }),
  location: LocationSchema.pick({ id: true, name: true }),
});
export type AdminTeamSummary = z.infer<typeof AdminTeamSummarySchema>;

export const AdminTeamsResponseSchema = z.object({
  success: z.literal(true),
  teams: z.array(AdminTeamSummarySchema),
  nextCursor: z.string().nullable(),
});
export type AdminTeamsResponse = z.infer<typeof AdminTeamsResponseSchema>;

export const AdminTeamFiltersSchema = z.object({
  q: z.string().optional(),
  recruitmentStatus: RecruitmentStatusSchema.optional(),
  lifecycle: TeamLifecycleSchema.optional(),
});
export type AdminTeamFilters = z.infer<typeof AdminTeamFiltersSchema>;

export const AdminTeamResponseSchema = z.object({
  success: z.literal(true),
  team: TeamSchema,
});
export type AdminTeamResponse = z.infer<typeof AdminTeamResponseSchema>;

export const StorySchema = z.object({
  id: z.string(),
  authorId: z.string(),
  teamId: z.string().nullable(),
  locationId: z.string().nullable(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  content: z.string(),
  images: z.array(z.string()),
  status: StoryStatusSchema,
  viewCount: z.number(),
  likeCount: z.number(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  displayTitle: z.string(),
  author: z
    .object({
      id: z.string(),
      name: z.string(),
      image: z.string().nullable(),
    })
    .nullable(),
  location: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    })
    .nullable(),
  team: z
    .object({
      id: z.string(),
      title: z.string(),
    })
    .nullable(),
  tags: z.array(TagSchema),
  isLiked: z.boolean(),
});
export type Story = z.infer<typeof StorySchema>;

export const UserPublicProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  nickname: z.string().nullable(),
  image: z.string().nullable(),
  bio: z.string().nullable(),
  extra: UserExtraSchema,
  createdAt: TimestampSchema,
  stats: z.object({
    createdTeams: z.number(),
    joinedTeams: z.number(),
    completedTeams: z.number(),
  }),
});
export type UserPublicProfile = z.infer<typeof UserPublicProfileSchema>;

export const ConversationSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  memberUserId: z.string(),
  initiatedByUserId: z.string(),
  lastMessagePreview: z.string().nullable(),
  lastMessageAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  team: z.object({
    id: z.string(),
    title: z.string(),
  }),
  otherUser: SessionUserSchema.pick({
    id: true,
    name: true,
    nickname: true,
    image: true,
  }).nullable(),
  unreadCount: z.number(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  readAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
  sender: SessionUserSchema.pick({
    id: true,
    name: true,
    nickname: true,
    image: true,
  })
    .nullable()
    .optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const cursorPageSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({ items: z.array(itemSchema), nextCursor: z.string().nullable() });
export type CursorPage<T> = z.infer<
  ReturnType<typeof cursorPageSchema<z.ZodType<T>>>
>;

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
  });
export type ApiResponse<T = unknown> = z.infer<
  ReturnType<typeof apiResponseSchema<z.ZodType<T>>>
>;
