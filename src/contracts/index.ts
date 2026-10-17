import { z } from "zod";

export * from "./admin-i18n";
export * from "./enums";

import {
  ActivityTypeSchema,
  LocationStatusSchema,
  RecruitmentStatusSchema,
  RegionLevelSchema,
  TeamLifecycleSchema,
  UserGenderSchema,
  UserLevelSchema,
  UserRoleSchema,
  UserStatusSchema,
} from "./enums";

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
  parentId: z.string().nullable().describe("父级地区 ID，根节点为 null。"),
  name: z.string(),
  nameEn: z.string().nullable(),
  slug: z.string(),
  code: z.string().nullable(),
  level: RegionLevelSchema,
  timezone: z.string().nullable().describe("地区时区标识，未设置时为 null。"),
  centerLatitude: z.number().nullable(),
  centerLongitude: z.number().nullable(),
  serviceEnabled: z.boolean().describe("是否对外开放该地区的服务。"),
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
  supportedActivityTypes: z
    .array(ActivityTypeSchema)
    .describe("地点推荐活动类型；空数组表示未设置推荐。"),
  status: LocationStatusSchema,
  subtitle: z.string().nullable(),
  description: z.string(),
  address: z.string().nullable(),
  latitude: z.number().nullable().describe("纬度；未设置坐标时为 null。"),
  longitude: z.number().nullable().describe("经度；未设置坐标时为 null。"),
  coverImageUrl: z.string().nullable(),
  images: z.array(z.string()),
  extra: LocationExtraSchema.describe("公开扩展信息，使用 camelCase 字段名。"),
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
  leftAt: TimestampSchema.nullable().describe("离队时间，null 表示有效成员。"),
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

export const TeamSchema = z.object({
  id: z.string(),
  locationId: z.string(),
  leaderId: z.string(),
  activityType: ActivityTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  startAt: TimestampSchema,
  endAt: TimestampSchema,
  maxParticipants: z.number().describe("包含队长在内的总人数上限。"),
  activeParticipantCount: z
    .number()
    .describe("队长加上尚未离队的有效成员人数。"),
  requirements: z.array(z.string()),
  recruitmentStatus: RecruitmentStatusSchema.describe(
    "招募开关，与生命周期独立；open 不保证仍有名额或仍可报名。",
  ),
  formedAt:
    TimestampSchema.nullable().describe("确认成团时间，未成团为 null。"),
  cancelledAt: TimestampSchema.nullable().describe("取消时间，未取消为 null。"),
  lifecycle: TeamLifecycleSchema.describe(
    "由取消时间、成团时间、开始和结束时间推导的当前生命周期。",
  ),
  isFull: z.boolean().describe("当前有效人数是否已达到人数上限。"),
  meetingPoint: z
    .string()
    .nullable()
    .describe(
      "集合地点说明；仅向队长、有效成员或管理员详情接口展示，其他访问者为 null。",
    ),
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
  nextCursor: z
    .string()
    .nullable()
    .describe("下一页游标；为 null 表示已到末页，客户端无需解析。"),
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

export const cursorPageSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z
      .string()
      .nullable()
      .describe("下一页游标；为 null 表示已到末页，客户端无需解析。"),
  });
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
