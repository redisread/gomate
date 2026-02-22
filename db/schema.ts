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
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
    image: text("image"),
    bio: text("bio"),
    level: text("level").default("beginner"), // 领队等级: beginner, intermediate, advanced, expert
    completedHikes: integer("completed_hikes").default(0), // 完成徒步次数
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

// Better Auth Session 表
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    userIdx: index("sessions_user_idx").on(table.userId),
    tokenIdx: uniqueIndex("sessions_token_idx").on(table.token),
  })
);

// Better Auth Account 表（用于 OAuth）
export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    // Better Auth 要求的字段
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
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
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    identifierIdx: uniqueIndex("verifications_identifier_idx").on(table.identifier),
  })
);

// 地点表
export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    subtitle: text("subtitle"), // 副标题，如"深圳第二高峰"
    description: text("description").notNull(),
    difficulty: text("difficulty").notNull(), // easy, moderate, hard, expert
    duration: text("duration").notNull(), // 例如: "4-5小时"
    distance: text("distance").notNull(), // 例如: "8.5公里"
    elevation: text("elevation"), // 海拔高度，如"869米"
    bestSeason: text("best_season").notNull(), // JSON 数组: ["春季", "秋季"]
    tags: text("tags"), // JSON 数组: ["海景", "山峰", "摄影"]
    coverImage: text("cover_image").notNull(),
    images: text("images").notNull(), // JSON 数组
    address: text("address"), // 详细地址
    routeDescription: text("route_description"),
    routeGuide: text("route_guide"), // JSON: { overview: string; tips: string[] }
    waypoints: text("waypoints"), // JSON 数组: 路线途径点
    tips: text("tips"),
    warnings: text("warnings"), // JSON 数组: 安全警告
    equipmentNeeded: text("equipment_needed"), // JSON 数组
    coordinates: text("coordinates").notNull(), // JSON: { lat: number; lng: number }
    facilities: text("facilities"), // JSON: { parking: boolean; restroom: boolean; water: boolean; food: boolean }
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("locations_slug_idx").on(table.slug),
    difficultyIdx: index("locations_difficulty_idx").on(table.difficulty),
  })
);

// 队伍表
export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    locationId: text("location_id")
      .references(() => locations.id, { onDelete: "cascade" })
      .notNull(),
    leaderId: text("leader_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startTime: integer("start_time", { mode: "timestamp" }).notNull(),
    endTime: integer("end_time", { mode: "timestamp" }).notNull(),
    duration: text("duration"), // 活动时长，如"6小时"
    maxMembers: integer("max_members").notNull().default(10),
    currentMembers: integer("current_members").notNull().default(1),
    requirements: text("requirements"), // 入队要求，JSON 数组
    status: text("status").notNull().default("recruiting"), // recruiting, full, ongoing, completed, cancelled, open
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    locationIdx: index("teams_location_idx").on(table.locationId),
    leaderIdx: index("teams_leader_idx").on(table.leaderId),
    statusIdx: index("teams_status_idx").on(table.status),
    startTimeIdx: index("teams_start_time_idx").on(table.startTime),
  })
);

// 队伍成员表
export const teamMembers = sqliteTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").notNull().default("member"), // leader, member
    status: text("status").notNull().default("pending"), // pending, approved, rejected
    joinedAt: integer("joined_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    teamIdx: index("team_members_team_idx").on(table.teamId),
    userIdx: index("team_members_user_idx").on(table.userId),
    uniqueTeamUser: uniqueIndex("team_members_team_user_idx").on(
      table.teamId,
      table.userId
    ),
  })
);

// 密码重置令牌表
export const passwordResets = sqliteTable(
  "password_resets",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp" }), // 使用时间
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("password_resets_token_idx").on(table.token),
    userIdx: index("password_resets_user_idx").on(table.userId),
    emailIdx: index("password_resets_email_idx").on(table.email),
  })
);

// ==================== Relations ====================

export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams, { relationName: "leaderTeams" }),
  teamMemberships: many(teamMembers),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  location: one(locations, {
    fields: [teams.locationId],
    references: [locations.id],
  }),
  leader: one(users, {
    fields: [teams.leaderId],
    references: [users.id],
    relationName: "leaderTeams",
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));

// ==================== Types ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;

// 枚举类型定义
export type Difficulty = "easy" | "moderate" | "hard" | "expert";
export type TeamStatus = "recruiting" | "full" | "ongoing" | "completed" | "cancelled";
export type TeamMemberRole = "leader" | "member";
export type TeamMemberStatus = "pending" | "approved" | "rejected";
