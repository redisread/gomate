import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ==================== Tables ====================

// 用户表（Better Auth 扩展）
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(), // 用户唯一标识
    name: text("name").notNull(), // 用户昵称
    email: text("email").notNull().unique(), // 邮箱地址（登录账号）
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(), // 邮箱是否已验证
    image: text("image"), // 用户头像 URL
    bio: text("bio"), // 个人简介
    level: text("level").default("beginner"), // 领队等级: beginner(新手), intermediate(进阶), advanced(资深), expert(专家)
    completedHikes: integer("completed_hikes").default(0), // 完成徒步次数
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 账号创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 资料更新时间
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  })
);

// Better Auth Session 表（会话管理）
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // 会话唯一标识
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // 关联用户 ID
    token: text("token").notNull().unique(), // 会话令牌
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(), // 会话过期时间
    ipAddress: text("ip_address"), // 登录 IP 地址
    userAgent: text("user_agent"), // 浏览器 User-Agent
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 会话创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 会话更新时间
  },
  (table) => ({
    userIdx: index("sessions_user_idx").on(table.userId),
    tokenIdx: index("sessions_token_idx").on(table.token),
  })
);

// Better Auth Account 表（第三方登录账号绑定）
export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(), // 账号唯一标识
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // 关联用户 ID
    accountId: text("account_id").notNull(), // 第三方平台的用户 ID
    providerId: text("provider_id").notNull(), // 第三方平台标识（如 google, github）
    accessToken: text("access_token"), // 访问令牌
    refreshToken: text("refresh_token"), // 刷新令牌
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }), // 访问令牌过期时间
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }), // 刷新令牌过期时间
    scope: text("scope"), // OAuth 授权范围
    idToken: text("id_token"), // OpenID Connect 令牌
    password: text("password"), // 本地密码（邮箱登录时使用）
    // Better Auth 要求的字段
    expiresAt: integer("expires_at", { mode: "timestamp" }), // 通用过期时间
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 绑定创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 绑定更新时间
  },
  (table) => ({
    userIdx: index("accounts_user_idx").on(table.userId),
    providerIdx: uniqueIndex("accounts_provider_idx").on(table.providerId, table.accountId),
  })
);

// Better Auth Verification 表（邮箱验证码）
export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").primaryKey(), // 验证记录唯一标识
    identifier: text("identifier").notNull(), // 验证标识（通常是邮箱地址）
    value: text("value").notNull(), // 验证码
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(), // 验证码过期时间
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 更新时间
  },
  (table) => ({
    identifierIdx: uniqueIndex("verifications_identifier_idx").on(table.identifier),
  })
);

// 地点表（徒步路线/景点）
export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(), // 地点唯一标识
    name: text("name").notNull(), // 地点名称
    slug: text("slug").notNull().unique(), // URL 友好的唯一标识（如 "wutong-mountain"）
    subtitle: text("subtitle"), // 副标题，如"深圳第二高峰"
    description: text("description").notNull(), // 详细描述
    difficulty: text("difficulty").notNull(), // 难度等级: easy(简单), moderate(中等), hard(困难), expert(专家)
    duration: text("duration").notNull(), // 预计耗时，如 "4-5小时"
    distance: text("distance").notNull(), // 路线长度，如 "8.5公里"
    elevation: text("elevation"), // 海拔高度，如 "869米"
    bestSeason: text("best_season").notNull(), // 最佳季节（JSON 数组）: ["春季", "秋季"]
    tags: text("tags"), // 标签（JSON 数组）: ["海景", "山峰", "摄影"]
    coverImage: text("cover_image").notNull(), // 封面图片 URL
    images: text("images").notNull(), // 图片列表（JSON 数组）
    address: text("address"), // 详细地址
    routeDescription: text("route_description"), // 路线描述
    routeGuide: text("route_guide"), // 路线指南（JSON）: { overview: string; tips: string[] }
    waypoints: text("waypoints"), // 途径点列表（JSON 数组）: [{ name, lat, lng, description }]
    tips: text("tips"), // 徒步贴士
    warnings: text("warnings"), // 安全警告（JSON 数组）
    equipmentNeeded: text("equipment_needed"), // 建议装备（JSON 数组）
    coordinates: text("coordinates").notNull(), // 坐标（JSON）: { lat: number; lng: number }
    facilities: text("facilities"), // 设施信息（JSON）: { parking, restroom, water, food }
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 更新时间
  },
  (table) => ({
    slugIdx: index("locations_slug_idx").on(table.slug),
    difficultyIdx: index("locations_difficulty_idx").on(table.difficulty),
  })
);

// 队伍表（徒步活动）
export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(), // 队伍唯一标识
    locationId: text("location_id")
      .references(() => locations.id, { onDelete: "cascade" })
      .notNull(), // 关联地点 ID
    leaderId: text("leader_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // 领队用户 ID
    title: text("title").notNull(), // 活动标题
    description: text("description"), // 活动描述
    startTime: integer("start_time", { mode: "timestamp" }).notNull(), // 活动开始时间
    endTime: integer("end_time", { mode: "timestamp" }).notNull(), // 活动结束时间
    duration: text("duration"), // 活动时长，如 "6小时"
    maxMembers: integer("max_members").notNull().default(10), // 最大人数限制
    currentMembers: integer("current_members").notNull().default(1), // 当前已加入人数
    requirements: text("requirements"), // 入队要求（JSON 数组）
    status: text("status").notNull().default("recruiting"), // 状态: recruiting(招募中), full(已满), ongoing(进行中), completed(已完成), cancelled(已取消), open(开放)
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 更新时间
  },
  (table) => ({
    locationIdx: index("teams_location_idx").on(table.locationId),
    leaderIdx: index("teams_leader_idx").on(table.leaderId),
    statusIdx: index("teams_status_idx").on(table.status),
    startTimeIdx: index("teams_start_time_idx").on(table.startTime),
  })
);

// 队伍成员表（参与关系）
export const teamMembers = sqliteTable(
  "team_members",
  {
    id: text("id").primaryKey(), // 成员记录唯一标识
    teamId: text("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(), // 关联队伍 ID
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // 关联用户 ID
    role: text("role").notNull().default("member"), // 角色: leader(领队), member(队员)
    status: text("status").notNull().default("pending"), // 状态: pending(待审核), approved(已通过), rejected(已拒绝)
    joinedAt: integer("joined_at", { mode: "timestamp" }), // 加入时间（审核通过时设置）
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 申请创建时间
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
    id: text("id").primaryKey(), // 重置记录唯一标识
    token: text("token").notNull().unique(), // 重置令牌（一次性）
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // 关联用户 ID
    email: text("email").notNull(), // 申请重置的邮箱地址
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(), // 令牌过期时间
    usedAt: integer("used_at", { mode: "timestamp" }), // 使用时间（令牌被使用后记录）
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
  },
  (table) => ({
    tokenIdx: index("password_resets_token_idx").on(table.token),
    userIdx: index("password_resets_user_idx").on(table.userId),
    emailIdx: index("password_resets_email_idx").on(table.email),
  })
);

// ==================== Relations（表间关系定义）====================

export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams, { relationName: "leaderTeams" }), // 用户创建的队伍（作为领队）
  teamMemberships: many(teamMembers), // 用户参加的队伍成员记录
  sessions: many(sessions), // 用户的登录会话
  accounts: many(accounts), // 用户绑定的第三方账号
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }), // 会话所属用户
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }), // 账号所属用户
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  teams: many(teams), // 该地点的徒步队伍
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  location: one(locations, {
    fields: [teams.locationId],
    references: [locations.id],
  }), // 队伍活动地点
  leader: one(users, {
    fields: [teams.leaderId],
    references: [users.id],
    relationName: "leaderTeams",
  }), // 队伍领队
  members: many(teamMembers), // 队伍成员列表
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }), // 所属队伍
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }), // 成员用户
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }), // 重置请求所属用户
}));

// ==================== Types（类型导出）====================

export type User = typeof users.$inferSelect; // 用户类型（查询结果）
export type NewUser = typeof users.$inferInsert; // 用户类型（插入数据）

export type Session = typeof sessions.$inferSelect; // 会话类型（查询结果）
export type NewSession = typeof sessions.$inferInsert; // 会话类型（插入数据）

export type Account = typeof accounts.$inferSelect; // 账号类型（查询结果）
export type NewAccount = typeof accounts.$inferInsert; // 账号类型（插入数据）

export type Verification = typeof verifications.$inferSelect; // 验证码类型（查询结果）
export type NewVerification = typeof verifications.$inferInsert; // 验证码类型（插入数据）

export type Location = typeof locations.$inferSelect; // 地点类型（查询结果）
export type NewLocation = typeof locations.$inferInsert; // 地点类型（插入数据）

export type Team = typeof teams.$inferSelect; // 队伍类型（查询结果）
export type NewTeam = typeof teams.$inferInsert; // 队伍类型（插入数据）

export type TeamMember = typeof teamMembers.$inferSelect; // 队伍成员类型（查询结果）
export type NewTeamMember = typeof teamMembers.$inferInsert; // 队伍成员类型（插入数据）

export type PasswordReset = typeof passwordResets.$inferSelect; // 密码重置类型（查询结果）
export type NewPasswordReset = typeof passwordResets.$inferInsert; // 密码重置类型（插入数据）

// ==================== Enums（枚举类型定义）====================

export type Difficulty = "easy" | "moderate" | "hard" | "expert"; // 难度等级：简单、中等、困难、专家
export type TeamStatus = "recruiting" | "full" | "ongoing" | "completed" | "cancelled" | "open"; // 队伍状态：招募中、已满、进行中、已完成、已取消、开放
export type TeamMemberRole = "leader" | "member"; // 成员角色：领队、队员
export type TeamMemberStatus = "pending" | "approved" | "rejected"; // 成员状态：待审核、已通过、已拒绝
