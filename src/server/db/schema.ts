import type { ActivityType } from "@/contracts";
export type { ActivityType } from "@/contracts";
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

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended" | "banned" | "deleted";
export type UserGender = "male" | "female" | "other";
export type RegionLevel = "province" | "city" | "district" | "other";
export type LocationStatus = "draft" | "published" | "archived";
export type RecruitmentStatus = "open" | "closed";

export interface UserExtra {
  level?: "beginner" | "intermediate" | "advanced" | "expert";
  completed_hikes?: number;
  wechat?: string | null;
  city?: string | null;
  [key: string]: unknown;
}

export interface LocationExtra {
  hiking?: {
    best_seasons?: string[];
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
    latitude: real("latitude"),
    longitude: real("longitude"),
    coverImageUrl: text("cover_image_url"),
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
    index("locations_public_feed_idx").on(table.status, table.createdAt, table.id),
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
      sql`${table.latitude} is null or ${table.latitude} between -90 and 90`,
    ),
    check(
      "locations_longitude_check",
      sql`${table.longitude} is null or ${table.longitude} between -180 and 180`,
    ),
    check(
      "locations_images_json_check",
      sql`json_valid(${table.images}) and json_type(${table.images}) = 'array'`,
    ),
    check(
      "locations_extra_json_check",
      sql`json_valid(${table.extra}) and json_type(${table.extra}) = 'object'`,
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
    meetingPoint: text("meeting_point"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(nowMs),
  },
  (table) => [
    index("teams_start_feed_idx").on(table.startAt, table.id),
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

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  createdLocations: many(locations, { relationName: "locationCreator" }),
  ledTeams: many(teams, { relationName: "teamLeader" }),
  teamMemberships: many(teamMembers),
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
}));
export const tagsRelations = relations(tags, ({ many }) => ({
  locations: many(locationTags),
  teams: many(teamTags),
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
  members: many(teamMembers),
  tags: many(teamTags),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
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
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
