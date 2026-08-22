import type { TeamChecklist } from "@/contracts";
import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export type ActivityType = "hiking" | "explore" | "leisure" | "travel";
export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended" | "banned" | "deleted";
export type UserGender = "male" | "female" | "other";
export type RegionLevel = "province" | "city" | "district" | "other";
export type LocationStatus = "draft" | "published" | "archived";
export type RecruitmentStatus = "open" | "closed";
export type TeamJoinRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";
export type StoryStatus = "draft" | "published" | "hidden";

export interface UserExtra {
  level?: "beginner" | "intermediate" | "advanced" | "expert";
  completed_hikes?: number;
  wechat?: string | null;
  city?: string | null;
  [key: string]: unknown;
}

export interface LocationExtra {
  hiking?: {
    difficulty?: "easy" | "moderate" | "hard" | "expert";
    duration_min?: number;
    duration_max?: number;
    distance_km?: number;
    elevation_gain_m?: number;
    best_seasons?: string[];
    gear_essential?: string[];
    gear_optional?: string[];
    overview?: string | null;
    tips?: string[];
    warnings?: string[];
  };
  [key: string]: unknown;
}

const nowMs = sql`(unixepoch() * 1000)`;

export const users = sqliteTable(
  "users",
  {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull(),
    nickname: text("nickname"),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"),
    bio: text("bio"),
    gender: text("gender").$type<UserGender>(),
    birthday: integer("birthday", { mode: "timestamp_ms" }),
    role: text("role").$type<UserRole>().notNull().default("user"),
    status: text("status").$type<UserStatus>().notNull().default("active"),
    extra: text("extra", { mode: "json" })
      .$type<UserExtra>()
      .notNull()
      .default(sql`'{}'`),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_status_created_idx").on(
      table.status,
      table.createdAt,
      table.id,
    ),
    check("users_email_verified_check", sql`${table.emailVerified} in (0, 1)`),
    check(
      "users_gender_check",
      sql`${table.gender} is null or ${table.gender} in ('male', 'female', 'other')`,
    ),
    check("users_role_check", sql`${table.role} in ('user', 'admin')`),
    check(
      "users_status_check",
      sql`${table.status} in ('active', 'suspended', 'banned', 'deleted')`,
    ),
    check(
      "users_extra_json_check",
      sql`json_valid(${table.extra}) and json_type(${table.extra}) = 'object'`,
    ),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.token),
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("accounts_issuer_account_unique").on(
      table.issuer,
      table.accountId,
    ),
    index("accounts_user_idx").on(table.userId),
  ],
);

export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").notNull().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("verifications_identifier_unique").on(table.identifier),
    index("verifications_expires_idx").on(table.expiresAt),
  ],
);

export const region = sqliteTable(
  "region",
  {
    id: text("id").notNull().primaryKey(),
    countryCode: text("country_code").notNull(),
    parentId: text("parent_id").references((): AnySQLiteColumn => region.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    slug: text("slug").notNull(),
    code: text("code"),
    level: text("level").$type<RegionLevel>().notNull(),
    timezone: text("timezone"),
    centerLatitude: real("center_latitude"),
    centerLongitude: real("center_longitude"),
    serviceEnabled: integer("service_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    isHot: integer("is_hot", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("region_country_slug_unique").on(table.countryCode, table.slug),
    uniqueIndex("region_country_code_unique")
      .on(table.countryCode, table.code)
      .where(sql`${table.code} is not null`),
    index("region_hierarchy_idx").on(
      table.countryCode,
      table.parentId,
      table.level,
      table.sortOrder,
    ),
    index("region_service_picker_idx").on(
      table.countryCode,
      table.serviceEnabled,
      table.isHot,
      table.sortOrder,
      table.id,
    ),
    check(
      "region_country_code_check",
      sql`length(${table.countryCode}) = 2 and ${table.countryCode} = upper(${table.countryCode})`,
    ),
    check(
      "region_parent_not_self_check",
      sql`${table.id} <> ${table.parentId}`,
    ),
    check(
      "region_level_check",
      sql`${table.level} in ('province', 'city', 'district', 'other')`,
    ),
    check(
      "region_center_latitude_check",
      sql`${table.centerLatitude} is null or ${table.centerLatitude} between -90 and 90`,
    ),
    check(
      "region_center_longitude_check",
      sql`${table.centerLongitude} is null or ${table.centerLongitude} between -180 and 180`,
    ),
    check(
      "region_service_enabled_check",
      sql`${table.serviceEnabled} in (0, 1)`,
    ),
    check("region_is_hot_check", sql`${table.isHot} in (0, 1)`),
    check(
      "region_service_shape_check",
      sql`${table.serviceEnabled} = 0 or (${table.level} = 'city' and ${table.timezone} is not null and ${table.centerLatitude} is not null and ${table.centerLongitude} is not null)`,
    ),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [uniqueIndex("tags_slug_unique").on(table.slug)],
);

export const locations = sqliteTable(
  "locations",
  {
    id: text("id").notNull().primaryKey(),
    regionId: text("region_id")
      .notNull()
      .references(() => region.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    supportedActivityTypes: text("supported_activity_types", { mode: "json" })
      .$type<ActivityType[]>()
      .notNull()
      .default(sql`'[]'`),
    status: text("status")
      .$type<LocationStatus>()
      .notNull()
      .default("published"),
    subtitle: text("subtitle"),
    description: text("description").notNull(),
    address: text("address"),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    coverImageUrl: text("cover_image_url").notNull(),
    images: text("images", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    extra: text("extra", { mode: "json" })
      .$type<LocationExtra>()
      .notNull()
      .default(sql`'{}'`),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("locations_region_slug_unique").on(table.regionId, table.slug),
    index("locations_region_feed_idx").on(
      table.regionId,
      table.status,
      table.createdAt,
      table.id,
    ),
    check(
      "locations_supported_activity_types_json_check",
      sql`json_valid(${table.supportedActivityTypes}) and json_type(${table.supportedActivityTypes}) = 'array'`,
    ),
    check(
      "locations_status_check",
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
    check(
      "locations_latitude_check",
      sql`${table.latitude} between -90 and 90`,
    ),
    check(
      "locations_longitude_check",
      sql`${table.longitude} between -180 and 180`,
    ),
    check(
      "locations_images_json_check",
      sql`json_valid(${table.images}) and json_type(${table.images}) = 'array'`,
    ),
    check(
      "locations_extra_json_check",
      sql`json_valid(${table.extra}) and json_type(${table.extra}) = 'object'`,
    ),
    check(
      "locations_published_activity_check",
      sql`${table.status} <> 'published' or json_array_length(${table.supportedActivityTypes}) > 0`,
    ),
  ],
);

export const teams = sqliteTable(
  "teams",
  {
    id: text("id").notNull().primaryKey(),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    leaderId: text("leader_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    activityType: text("activity_type").$type<ActivityType>().notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startAt: integer("start_at", { mode: "timestamp_ms" }).notNull(),
    endAt: integer("end_at", { mode: "timestamp_ms" }).notNull(),
    maxParticipants: integer("max_participants").notNull().default(9),
    requirements: text("requirements", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    recruitmentStatus: text("recruitment_status")
      .$type<RecruitmentStatus>()
      .notNull()
      .default("open"),
    formedAt: integer("formed_at", { mode: "timestamp_ms" }),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
    checklist: text("checklist", { mode: "json" }).$type<TeamChecklist>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    index("teams_location_start_idx").on(
      table.locationId,
      table.startAt,
      table.id,
    ),
    index("teams_location_activity_feed_idx").on(
      table.locationId,
      table.activityType,
      table.recruitmentStatus,
      table.startAt,
      table.id,
    ),
    index("teams_leader_created_idx").on(
      table.leaderId,
      table.createdAt,
      table.id,
    ),
    index("teams_end_idx").on(table.cancelledAt, table.endAt, table.id),
    check(
      "teams_activity_type_check",
      sql`${table.activityType} in ('hiking', 'explore', 'leisure', 'travel')`,
    ),
    check("teams_time_range_check", sql`${table.endAt} >= ${table.startAt}`),
    check(
      "teams_capacity_check",
      sql`${table.maxParticipants} between 1 and 49`,
    ),
    check(
      "teams_requirements_json_check",
      sql`json_valid(${table.requirements}) and json_type(${table.requirements}) = 'array'`,
    ),
    check(
      "teams_recruitment_status_check",
      sql`${table.recruitmentStatus} in ('open', 'closed')`,
    ),
    check(
      "teams_checklist_json_check",
      sql`${table.checklist} is null or (json_valid(${table.checklist}) and json_type(${table.checklist}) = 'object')`,
    ),
  ],
);

export const teamJoinRequests = sqliteTable(
  "team_join_requests",
  {
    id: text("id").notNull().primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<TeamJoinRequestStatus>()
      .notNull()
      .default("pending"),
    message: text("message"),
    decidedByUserId: text("decided_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("team_join_requests_one_pending_unique")
      .on(table.teamId, table.userId)
      .where(sql`${table.status} = 'pending'`),
    index("team_join_requests_team_status_idx").on(
      table.teamId,
      table.status,
      table.createdAt,
      table.id,
    ),
    index("team_join_requests_user_created_idx").on(
      table.userId,
      table.createdAt,
      table.id,
    ),
    check(
      "team_join_requests_status_check",
      sql`${table.status} in ('pending', 'approved', 'rejected', 'cancelled')`,
    ),
    check(
      "team_join_requests_decision_check",
      sql`(
      ${table.status} = 'pending' and ${table.decidedAt} is null and ${table.decidedByUserId} is null
    ) or (
      ${table.status} in ('approved', 'rejected') and ${table.decidedAt} is not null and ${table.decidedByUserId} is not null
    ) or (
      ${table.status} = 'cancelled' and ${table.decidedAt} is not null
    )`,
    ),
  ],
);

export const teamMembers = sqliteTable(
  "team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    leftAt: integer("left_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.userId] }),
    index("team_members_active_idx").on(
      table.teamId,
      table.leftAt,
      table.joinedAt,
      table.userId,
    ),
    index("team_members_user_idx").on(
      table.userId,
      table.leftAt,
      table.joinedAt,
      table.teamId,
    ),
  ],
);

export const stories = sqliteTable(
  "stories",
  {
    id: text("id").notNull().primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => teams.id, {
      onDelete: "restrict",
    }),
    locationId: text("location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    summary: text("summary"),
    content: text("content").notNull(),
    images: text("images", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    status: text("status").$type<StoryStatus>().notNull().default("published"),
    viewCount: integer("view_count").notNull().default(0),
    likeCount: integer("like_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    index("stories_feed_idx").on(table.status, table.createdAt, table.id),
    index("stories_author_idx").on(table.authorId, table.createdAt, table.id),
    index("stories_team_feed_idx").on(
      table.teamId,
      table.status,
      table.createdAt,
      table.id,
    ),
    index("stories_location_feed_idx").on(
      table.locationId,
      table.status,
      table.createdAt,
      table.id,
    ),
    check("stories_content_check", sql`length(trim(${table.content})) > 0`),
    check(
      "stories_images_json_check",
      sql`json_valid(${table.images}) and json_type(${table.images}) = 'array'`,
    ),
    check(
      "stories_status_check",
      sql`${table.status} in ('draft', 'published', 'hidden')`,
    ),
    check("stories_view_count_check", sql`${table.viewCount} >= 0`),
    check("stories_like_count_check", sql`${table.likeCount} >= 0`),
    check(
      "stories_normal_title_check",
      sql`${table.teamId} is not null or (${table.title} is not null and length(trim(${table.title})) > 0)`,
    ),
  ],
);

export const locationTags = sqliteTable(
  "location_tags",
  {
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    primaryKey({ columns: [table.locationId, table.tagId] }),
    index("location_tags_tag_idx").on(table.tagId, table.locationId),
  ],
);

export const teamTags = sqliteTable(
  "team_tags",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.tagId] }),
    index("team_tags_tag_idx").on(table.tagId, table.teamId),
  ],
);

export const storyTags = sqliteTable(
  "story_tags",
  {
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    primaryKey({ columns: [table.storyId, table.tagId] }),
    index("story_tags_tag_idx").on(table.tagId, table.storyId),
  ],
);

export const storyLikes = sqliteTable(
  "story_likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.storyId] }),
    index("story_likes_story_idx").on(
      table.storyId,
      table.createdAt,
      table.userId,
    ),
  ],
);

export const userLocationFavorites = sqliteTable(
  "user_location_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.locationId] }),
    index("user_location_favorites_user_idx").on(
      table.userId,
      table.createdAt,
      table.locationId,
    ),
    index("user_location_favorites_location_idx").on(
      table.locationId,
      table.createdAt,
      table.userId,
    ),
  ],
);

export const userStoryFavorites = sqliteTable(
  "user_story_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.storyId] }),
    index("user_story_favorites_user_idx").on(
      table.userId,
      table.createdAt,
      table.storyId,
    ),
    index("user_story_favorites_story_idx").on(
      table.storyId,
      table.createdAt,
      table.userId,
    ),
  ],
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").notNull().primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    memberUserId: text("member_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    initiatedByUserId: text("initiated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    uniqueIndex("conversations_team_member_unique").on(
      table.teamId,
      table.memberUserId,
    ),
    index("conversations_member_inbox_idx").on(
      table.memberUserId,
      table.lastMessageAt,
      table.id,
    ),
    index("conversations_team_inbox_idx").on(
      table.teamId,
      table.lastMessageAt,
      table.id,
    ),
  ],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").notNull().primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    index("messages_conversation_cursor_idx").on(
      table.conversationId,
      table.createdAt,
      table.id,
    ),
    index("messages_sender_idx").on(table.senderId, table.createdAt, table.id),
    check("messages_content_check", sql`length(trim(${table.content})) > 0`),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  createdLocations: many(locations, { relationName: "locationCreator" }),
  ledTeams: many(teams, { relationName: "teamLeader" }),
  joinRequests: many(teamJoinRequests, { relationName: "joinRequestUser" }),
  decidedJoinRequests: many(teamJoinRequests, {
    relationName: "joinRequestDecider",
  }),
  teamMemberships: many(teamMembers),
  stories: many(stories),
  storyLikes: many(storyLikes),
  locationFavorites: many(userLocationFavorites),
  storyFavorites: many(userStoryFavorites),
  memberConversations: many(conversations, {
    relationName: "conversationMember",
  }),
  initiatedConversations: many(conversations, {
    relationName: "conversationInitiator",
  }),
  messages: many(messages),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
export const regionRelations = relations(region, ({ one, many }) => ({
  parent: one(region, {
    fields: [region.parentId],
    references: [region.id],
    relationName: "regionHierarchy",
  }),
  children: many(region, { relationName: "regionHierarchy" }),
  locations: many(locations),
}));
export const locationsRelations = relations(locations, ({ one, many }) => ({
  region: one(region, {
    fields: [locations.regionId],
    references: [region.id],
  }),
  creator: one(users, {
    fields: [locations.createdByUserId],
    references: [users.id],
    relationName: "locationCreator",
  }),
  teams: many(teams),
  tags: many(locationTags),
  stories: many(stories),
  favorites: many(userLocationFavorites),
}));
export const tagsRelations = relations(tags, ({ many }) => ({
  locations: many(locationTags),
  teams: many(teamTags),
  stories: many(storyTags),
}));
export const teamsRelations = relations(teams, ({ one, many }) => ({
  location: one(locations, {
    fields: [teams.locationId],
    references: [locations.id],
  }),
  leader: one(users, {
    fields: [teams.leaderId],
    references: [users.id],
    relationName: "teamLeader",
  }),
  joinRequests: many(teamJoinRequests),
  members: many(teamMembers),
  tags: many(teamTags),
  stories: many(stories),
  conversations: many(conversations),
}));
export const teamJoinRequestsRelations = relations(
  teamJoinRequests,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamJoinRequests.teamId],
      references: [teams.id],
    }),
    user: one(users, {
      fields: [teamJoinRequests.userId],
      references: [users.id],
      relationName: "joinRequestUser",
    }),
    decidedBy: one(users, {
      fields: [teamJoinRequests.decidedByUserId],
      references: [users.id],
      relationName: "joinRequestDecider",
    }),
  }),
);
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));
export const storiesRelations = relations(stories, ({ one, many }) => ({
  author: one(users, { fields: [stories.authorId], references: [users.id] }),
  team: one(teams, { fields: [stories.teamId], references: [teams.id] }),
  location: one(locations, {
    fields: [stories.locationId],
    references: [locations.id],
  }),
  tags: many(storyTags),
  likes: many(storyLikes),
  favorites: many(userStoryFavorites),
}));
export const locationTagsRelations = relations(locationTags, ({ one }) => ({
  location: one(locations, {
    fields: [locationTags.locationId],
    references: [locations.id],
  }),
  tag: one(tags, { fields: [locationTags.tagId], references: [tags.id] }),
}));
export const teamTagsRelations = relations(teamTags, ({ one }) => ({
  team: one(teams, { fields: [teamTags.teamId], references: [teams.id] }),
  tag: one(tags, { fields: [teamTags.tagId], references: [tags.id] }),
}));
export const storyTagsRelations = relations(storyTags, ({ one }) => ({
  story: one(stories, {
    fields: [storyTags.storyId],
    references: [stories.id],
  }),
  tag: one(tags, { fields: [storyTags.tagId], references: [tags.id] }),
}));
export const storyLikesRelations = relations(storyLikes, ({ one }) => ({
  user: one(users, { fields: [storyLikes.userId], references: [users.id] }),
  story: one(stories, {
    fields: [storyLikes.storyId],
    references: [stories.id],
  }),
}));
export const userLocationFavoritesRelations = relations(
  userLocationFavorites,
  ({ one }) => ({
    user: one(users, {
      fields: [userLocationFavorites.userId],
      references: [users.id],
    }),
    location: one(locations, {
      fields: [userLocationFavorites.locationId],
      references: [locations.id],
    }),
  }),
);
export const userStoryFavoritesRelations = relations(
  userStoryFavorites,
  ({ one }) => ({
    user: one(users, {
      fields: [userStoryFavorites.userId],
      references: [users.id],
    }),
    story: one(stories, {
      fields: [userStoryFavorites.storyId],
      references: [stories.id],
    }),
  }),
);
export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    team: one(teams, {
      fields: [conversations.teamId],
      references: [teams.id],
    }),
    member: one(users, {
      fields: [conversations.memberUserId],
      references: [users.id],
      relationName: "conversationMember",
    }),
    initiatedBy: one(users, {
      fields: [conversations.initiatedByUserId],
      references: [users.id],
      relationName: "conversationInitiator",
    }),
    messages: many(messages),
  }),
);
export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
export type Region = typeof region.$inferSelect;
export type NewRegion = typeof region.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type LocationTag = typeof locationTags.$inferSelect;
export type NewLocationTag = typeof locationTags.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamTag = typeof teamTags.$inferSelect;
export type NewTeamTag = typeof teamTags.$inferInsert;
export type TeamJoinRequest = typeof teamJoinRequests.$inferSelect;
export type NewTeamJoinRequest = typeof teamJoinRequests.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
export type StoryTag = typeof storyTags.$inferSelect;
export type NewStoryTag = typeof storyTags.$inferInsert;
export type StoryLike = typeof storyLikes.$inferSelect;
export type NewStoryLike = typeof storyLikes.$inferInsert;
export type UserLocationFavorite = typeof userLocationFavorites.$inferSelect;
export type NewUserLocationFavorite = typeof userLocationFavorites.$inferInsert;
export type UserStoryFavorite = typeof userStoryFavorites.$inferSelect;
export type NewUserStoryFavorite = typeof userStoryFavorites.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
