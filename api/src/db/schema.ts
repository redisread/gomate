import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ==================== Tables ====================

// 用户表（Better Auth 扩展）
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nickname: text("nickname"),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
    image: text("image"),
    bio: text("bio"),
    gender: text("gender"),
    birthday: integer("birthday", { mode: "timestamp_ms" }),
    level: text("level").default("beginner").notNull(),
    completedHikes: integer("completed_hikes").default(0),
    wechat: text("wechat"),
    role: text("role").default("user").notNull(),
    status: text("status").default("active").notNull(),
    extra: text("extra"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    nameIdx: index("users_name_idx").on(table.name),
  })
);

// Better Auth Session 表
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    userIdx: index("sessions_user_idx").on(table.userId),
    tokenIdx: index("sessions_token_idx").on(table.token),
  })
);

// Better Auth Account 表
export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    userIdx: index("accounts_user_idx").on(table.userId),
    providerIdx: uniqueIndex("accounts_provider_idx").on(table.providerId, table.accountId),
  })
);

// Better Auth Verification 表
export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    identifierIdx: uniqueIndex("verifications_identifier_idx").on(table.identifier),
  })
);

// 城市表
export const cities = sqliteTable(
  "cities",
  {
    id: text("id").primaryKey(),
    adcode: text("adcode").notNull().unique(),
    name: text("name").notNull(),
    pinyin: text("pinyin"),
    province: text("province"),
    level: text("level"),
    isHot: integer("is_hot", { mode: "boolean" }).default(false).notNull(),
    parentId: text("parent_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    adcodeIdx: uniqueIndex("cities_adcode_idx").on(table.adcode),
    isHotIdx: index("cities_is_hot_idx").on(table.isHot),
  })
);

// 地点表
export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    type: text("type"),
    subtitle: text("subtitle"),
    description: text("description").notNull(),
    address: text("address"),
    cityId: text("city_id").references(() => cities.id, { onDelete: "restrict" }).notNull(),
    cityName: text("city_name"),
    bestSeason: text("best_season").notNull(),
    coverImage: text("cover_image").notNull(),
    images: text("images").notNull(),
    coordinates: text("coordinates").notNull(),
    extra: text("extra"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("locations_slug_idx").on(table.slug),
    cityIdx: index("locations_city_idx").on(table.cityId),
    typeIdx: index("locations_type_idx").on(table.type),
  })
);

// 路线表
export const routes = sqliteTable(
  "routes",
  {
    id: text("id").primaryKey(),
    locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }).notNull(),
    cityId: text("city_id").references(() => cities.id, { onDelete: "restrict" }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    difficulty: text("difficulty").notNull(),
    durationMin: integer("duration_min").notNull(),
    durationMax: integer("duration_max").notNull(),
    distance: real("distance").notNull(),
    elevation: integer("elevation"),
    routeGuide: text("route_guide"),
    extra: text("extra"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    locationIdx: index("routes_location_idx").on(table.locationId),
    cityIdx: index("routes_city_idx").on(table.cityId),
    difficultyIdx: index("routes_difficulty_idx").on(table.difficulty),
  })
);

// 标签表
export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    type: text("type").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex("tags_name_idx").on(table.name),
    typeIdx: index("tags_type_idx").on(table.type),
  })
);

// 标签关联表
export const entityToTags = sqliteTable(
  "entity_to_tags",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    tagId: text("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    entityIdx: index("entity_to_tags_entity_idx").on(table.entityId, table.entityType),
    tagIdx: index("entity_to_tags_tag_idx").on(table.tagId),
    uniqueEntityTag: uniqueIndex("entity_to_tags_unique_idx").on(table.entityId, table.entityType, table.tagId),
  })
);

// 队伍表
export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }).notNull(),
    routeId: text("route_id").references(() => routes.id, { onDelete: "set null" }),
    leaderId: text("leader_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startTime: integer("start_time", { mode: "timestamp_ms" }).notNull(),
    endTime: integer("end_time", { mode: "timestamp_ms" }).notNull(),
    durationMin: integer("duration_min").notNull().default(240),
    maxMembers: integer("max_members").notNull().default(10),
    requirements: text("requirements"),
    icon: text("icon").default("⭿️").notNull(),
    status: text("status").notNull().default("recruiting"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    locationIdx: index("teams_location_idx").on(table.locationId),
    routeIdx: index("teams_route_idx").on(table.routeId),
    leaderIdx: index("teams_leader_idx").on(table.leaderId),
    statusIdx: index("teams_status_idx").on(table.status),
    startTimeIdx: index("teams_start_time_idx").on(table.startTime),
    statusCreatedAtIdx: index("teams_status_created_at_idx").on(table.status, table.createdAt),
    statusStartTimeIdx: index("teams_status_start_time_idx").on(table.status, table.startTime),
  })
);

// 队伍成员表
export const teamMembers = sqliteTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    status: text("status").notNull().default("pending"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }),
    statusUpdatedAt: integer("status_updated_at", { mode: "timestamp_ms" }),
    extra: text("extra"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    teamIdx: index("team_members_team_idx").on(table.teamId),
    userIdx: index("team_members_user_idx").on(table.userId),
    uniqueTeamUser: uniqueIndex("team_members_team_user_idx").on(table.teamId, table.userId),
  })
);

// 密码重置令牌表
export const passwordResets = sqliteTable(
  "password_resets",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    email: text("email").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    tokenIdx: index("password_resets_token_idx").on(table.token),
    userIdx: index("password_resets_user_idx").on(table.userId),
    emailIdx: index("password_resets_email_idx").on(table.email),
  })
);

// POI 表
// POI（Point of Interest）用于标记地点/路线上的关键节点
// 通过 entityToPois 关联表与地点或路线建立关系，每次关联可指定不同的角色类型
export const pois = sqliteTable(
  "pois",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    coordinates: text("coordinates").notNull(),
    // POI 内部分类标识，不对外暴露
    // 默认值为 "poi"，用于未来扩展或内部统计分析
    // 用户无需关心此字段，系统自动填充
    category: text("category").default("poi"),
    images: text("images"),
    extra: text("extra"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    nameIdx: index("pois_name_idx").on(table.name),
  })
);

// 实体-POI 角色关联表
export const entityToPois = sqliteTable(
  "entity_to_pois",
  {
    id: text("id").primaryKey(),
    poiId: text("poi_id").references(() => pois.id, { onDelete: "cascade" }).notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    roleType: text("role_type").notNull(),
    order: integer("order"),
    roleSpecificData: text("role_specific_data"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    poiIdx: index("entity_to_pois_poi_idx").on(table.poiId),
    entityIdx: index("entity_to_pois_entity_idx").on(table.entityType, table.entityId),
    roleIdx: index("entity_to_pois_role_idx").on(table.roleType),
    uniquePoiEntityRole: uniqueIndex("entity_to_pois_unique_idx").on(
      table.poiId, table.entityType, table.entityId, table.roleType
    ),
  })
);

// 用户收藏表
export const userFavorites = sqliteTable(
  "user_favorites",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    userIdx: index("user_favorites_user_idx").on(table.userId),
    entityIdx: index("user_favorites_entity_idx").on(table.entityType, table.entityId),
    uniqueFavorite: uniqueIndex("user_favorites_unique_idx").on(table.userId, table.entityType, table.entityId),
  })
);

// ==================== Relations ====================

export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams, { relationName: "leaderTeams" }),
  teamMemberships: many(teamMembers),
  sessions: many(sessions),
  accounts: many(accounts),
  favorites: many(userFavorites),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const citiesRelations = relations(cities, ({ many }) => ({
  locations: many(locations),
  routes: many(routes),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  city: one(cities, { fields: [locations.cityId], references: [cities.id] }),
  routes: many(routes),
  teams: many(teams),
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
  location: one(locations, { fields: [routes.locationId], references: [locations.id] }),
  city: one(cities, { fields: [routes.cityId], references: [cities.id] }),
  teams: many(teams),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  entityToTags: many(entityToTags),
}));

export const entityToTagsRelations = relations(entityToTags, ({ one }) => ({
  tag: one(tags, { fields: [entityToTags.tagId], references: [tags.id] }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  location: one(locations, { fields: [teams.locationId], references: [locations.id] }),
  route: one(routes, { fields: [teams.routeId], references: [routes.id] }),
  leader: one(users, { fields: [teams.leaderId], references: [users.id], relationName: "leaderTeams" }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const poisRelations = relations(pois, ({ many }) => ({
  entityToPois: many(entityToPois),
}));

export const entityToPoisRelations = relations(entityToPois, ({ one }) => ({
  poi: one(pois, { fields: [entityToPois.poiId], references: [pois.id] }),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, { fields: [userFavorites.userId], references: [users.id] }),
}));

// ==================== Types ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type EntityToTag = typeof entityToTags.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type Poi = typeof pois.$inferSelect;
export type NewPoi = typeof pois.$inferInsert;
export type EntityToPoi = typeof entityToPois.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type NewUserFavorite = typeof userFavorites.$inferInsert;

// ==================== Enums ====================

export type Difficulty = "easy" | "moderate" | "hard" | "expert";
export type TeamStatus = "recruiting" | "full" | "formed" | "cancelled" | "completed";
export type TeamMemberStatus = "pending" | "approved" | "rejected" | "leave_pending";
export type UserRole = "user" | "admin";
export type UserLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type UserStatus = "active" | "suspended" | "banned" | "deleted";
export type UserGender = "male" | "female" | "other";
export type CityLevel = "city" | "district";
export type TagType = "location" | "route" | "activity";
export type EntityType = "location" | "route" | "activity";
// POI 内部分类标识，不对外暴露，默认值为 "poi"
export type PoiCategory = "poi";
export type PoiEntityType = "route" | "location" | "city";
export type PoiRoleType = "waypoint" | "checkpoint" | "viewpoint" | "facility" | "poi";
