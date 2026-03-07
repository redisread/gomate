import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// 导入 Extra 类型（用于 extra 字段）
export type { UserExtra } from "@/lib/user-extra";
export type { RouteExtra } from "@/lib/route-extra";
export type {
  PoiExtra,
  PoiCategory,
  PoiEntityType,
  PoiRoleType,
  PoiRoleSpecificData,
  Coordinates,
} from "@/lib/poi-types";

// ==================== Tables ====================

// 用户表（Better Auth 扩展）
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(), // 用户唯一标识
    name: text("name").notNull(), // Better Auth 标准字段（用于认证）
    nickname: text("nickname"), // 用户昵称（用于展示，可为空则显示 name）
    email: text("email").notNull().unique(), // 邮箱地址（登录账号）
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(), // 邮箱是否已验证
    image: text("image"), // 用户头像 URL
    bio: text("bio"), // 个人简介
    gender: text("gender"), // 性别: male(男) | female(女) | other(其他) | null(未设置)
    birthday: integer("birthday", { mode: "timestamp" }), // 生日时间戳（可用于计算年龄段）
    level: text("level").default("beginner").notNull(), // beginner | intermediate | advanced | expert
    completedHikes: integer("completed_hikes").default(0), // 已完成徒步次数
    wechat: text("wechat"), // 微信号（可选，加入队伍时必填）
    role: text("role").default("user").notNull(), // user | admin
    status: text("status").default("active").notNull(), // active | suspended | banned | deleted
    extra: text("extra"), // JSON: { equipment, experience }
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 账号创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 资料更新时间
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // 软删除时间戳
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    nameIdx: index("users_name_idx").on(table.name), // 支持按用户名搜索
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

// 城市表（城市信息管理）
export const cities = sqliteTable(
  "cities",
  {
    id: text("id").primaryKey(), // 城市唯一标识
    adcode: text("adcode").notNull().unique(), // 高德行政区划代码（如"440300"）
    name: text("name").notNull(), // 城市名称（如"深圳"）
    pinyin: text("pinyin"), // 拼音（用于 A-Z 排序）
    province: text("province"), // 所属省份
    level: text("level"), // city / district
    isHot: integer("is_hot", { mode: "boolean" }).default(false).notNull(), // 是否热门城市
    parentId: text("parent_id"), // 父级 ID（省市区层级）
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 更新时间
  },
  (table) => ({
    adcodeIdx: uniqueIndex("cities_adcode_idx").on(table.adcode),
    isHotIdx: index("cities_is_hot_idx").on(table.isHot),
  })
);

// 地点表（徒步地点基础信息）
export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(), // 地点唯一标识
    name: text("name").notNull(), // 地点名称
    slug: text("slug").notNull().unique(), // URL 友好的唯一标识（如 "wutong-mountain"）
    subtitle: text("subtitle"), // 副标题，如"深圳第二高峰"
    description: text("description").notNull(), // 详细描述
    address: text("address"), // 详细地址
    cityId: text("city_id")
      .references(() => cities.id, { onDelete: "restrict" })
      .notNull(), // 关联城市 ID
    cityName: text("city_name"), // 城市名称（冗余存储便于展示）
    bestSeason: text("best_season").notNull(), // 最佳季节（JSON 数组）: ["春季", "秋季"]
    coverImage: text("cover_image").notNull(), // 封面图片 URL
    images: text("images").notNull(), // 图片列表（JSON 数组）
    coordinates: text("coordinates").notNull(), // 坐标（JSON）: { lat: number; lng: number }
    extra: text("extra"), // 扩展字段（JSON）: { facilities, tips, warnings }
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 更新时间
  },
  (table) => ({
    slugIdx: uniqueIndex("locations_slug_idx").on(table.slug),
    cityIdx: index("locations_city_idx").on(table.cityId),
  })
);

// 路线表（徒步路线详情）
export const routes = sqliteTable(
  "routes",
  {
    id: text("id").primaryKey(), // 路线唯一标识
    locationId: text("location_id")
      .references(() => locations.id, { onDelete: "cascade" })
      .notNull(), // 关联地点 ID
    cityId: text("city_id")
      .references(() => cities.id, { onDelete: "restrict" })
      .notNull(), // 关联城市 ID
    name: text("name").notNull(), // 路线名称（如"泰山涧线路"）
    description: text("description"), // 路线描述
    difficulty: text("difficulty").notNull(), // easy(简单), moderate(中等), hard(困难), expert(专家)
    // 数值类型字段（支持 SQL 排序和范围查询）
    durationMin: integer("duration_min").notNull(), // 最短耗时（分钟）
    durationMax: integer("duration_max").notNull(), // 最长耗时（分钟）
    distance: real("distance").notNull(), // 路线长度（公里）
    elevation: integer("elevation"), // 累计爬升（米）
    routeGuide: text("route_guide"), // 路线指南（JSON）: { overview: string; tips: string[] }
    extra: text("extra"), // 扩展字段（JSON）: { equipmentNeeded: string[], warnings: string[] }
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 更新时间
  },
  (table) => ({
    locationIdx: index("routes_location_idx").on(table.locationId),
    cityIdx: index("routes_city_idx").on(table.cityId),
    difficultyIdx: index("routes_difficulty_idx").on(table.difficulty),
    durationIdx: index("routes_duration_idx").on(table.durationMin, table.durationMax),
    distanceIdx: index("routes_distance_idx").on(table.distance),
    elevationIdx: index("routes_elevation_idx").on(table.elevation),
  })
);

// 标签表
export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(), // 标签唯一标识
    name: text("name").notNull().unique(), // 标签名称（如"溯溪"、"观景"）
    type: text("type").notNull(), // location | route | activity
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
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
    id: text("id").primaryKey(), // 关联记录唯一标识
    entityId: text("entity_id").notNull(), // 关联实体 ID（location_id 或 route_id）
    entityType: text("entity_type").notNull(), // location | route | activity
    tagId: text("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(), // 关联标签 ID
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
  },
  (table) => ({
    entityIdx: index("entity_to_tags_entity_idx").on(table.entityId, table.entityType),
    tagIdx: index("entity_to_tags_tag_idx").on(table.tagId),
    uniqueEntityTag: uniqueIndex("entity_to_tags_unique_idx").on(
      table.entityId,
      table.entityType,
      table.tagId
    ), // 防止重复关联
  })
);

// 队伍表
export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(), // 队伍唯一标识
    locationId: text("location_id")
      .references(() => locations.id, { onDelete: "cascade" })
      .notNull(), // 关联地点 ID
    routeId: text("route_id")
      .references(() => routes.id, { onDelete: "set null" }), // 关联路线 ID（可选）
    leaderId: text("leader_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // 领队用户 ID
    title: text("title").notNull(), // 活动标题
    description: text("description"), // 活动描述
    startTime: integer("start_time", { mode: "timestamp" }).notNull(), // 活动开始时间
    endTime: integer("end_time", { mode: "timestamp" }).notNull(), // 活动结束时间
    durationMin: integer("duration_min").notNull().default(240), // 活动时长（分钟），默认4小时
    maxMembers: integer("max_members").notNull().default(10), // 最大人数限制
    requirements: text("requirements"), // 入队要求（JSON 数组）
    icon: text("icon").default("⭿️").notNull(), // 队伍图标（emoji）
    status: text("status").notNull().default("recruiting"), // 状态: recruiting(招募中), full(已满), formed(已组建), completed(已完成), cancelled(已取消)
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 更新时间
  },
  (table) => ({
    locationIdx: index("teams_location_idx").on(table.locationId),
    routeIdx: index("teams_route_idx").on(table.routeId),
    leaderIdx: index("teams_leader_idx").on(table.leaderId),
    statusIdx: index("teams_status_idx").on(table.status),
    startTimeIdx: index("teams_start_time_idx").on(table.startTime),
    // 复合索引：支持按状态+时间排序的高效查询
    statusCreatedAtIdx: index("teams_status_created_at_idx").on(table.status, table.createdAt),
    statusStartTimeIdx: index("teams_status_start_time_idx").on(table.status, table.startTime),
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
    status: text("status").notNull().default("pending"), // 状态: pending(待审核), approved(已通过), rejected(已拒绝), leave_pending(退出申请中)
    joinedAt: integer("joined_at", { mode: "timestamp" }), // 加入时间（审核通过时设置）
    statusUpdatedAt: integer("status_updated_at", { mode: "timestamp" }), // 状态最后变更时间
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

// POI 库（物理兴趣点 - Physical Point of Interest）
// 存储真实世界的物理位置，如山峰、瀑布、停车场等
export const pois = sqliteTable(
  "pois",
  {
    id: text("id").primaryKey(), // POI 唯一标识
    name: text("name").notNull(), // 物理位置名称（如"梧桐山山顶"）
    description: text("description"), // 通用描述
    coordinates: text("coordinates").notNull(), // 坐标（JSON）: { lat: number; lng: number }（唯一真实来源）
    category: text("category"), // 类别：mountain_peak, waterfall, parking, viewpoint 等
    images: text("images"), // JSON 数组：通用图片
    extra: text("extra"), // JSON：通用扩展字段（elevation、openHours、fee 等）
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 更新时间
  },
  (table) => ({
    nameIdx: index("pois_name_idx").on(table.name),
    categoryIdx: index("pois_category_idx").on(table.category),
  })
);

// 实体-POI 角色关联表
// 定义 POI 在不同上下文中的角色（如同一山峰可以是路线途径点，也可以是地点观景点）
export const entityToPois = sqliteTable(
  "entity_to_pois",
  {
    id: text("id").primaryKey(), // 关联记录唯一标识
    poiId: text("poi_id")
      .references(() => pois.id, { onDelete: "cascade" })
      .notNull(), // 关联的 POI ID
    entityType: text("entity_type").notNull(), // 关联实体类型："route" | "location" | "city"
    entityId: text("entity_id").notNull(), // 关联实体的 ID
    roleType: text("role_type").notNull(), // 角色类型："waypoint" | "checkpoint" | "viewpoint" | "facility" | "poi"
    order: integer("order"), // 仅用于有序角色（如路线途径点），无序角色为 null
    roleSpecificData: text("role_specific_data"), // JSON：角色特定的额外数据（如途径点的 instructions）
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 创建时间
  },
  (table) => ({
    poiIdx: index("entity_to_pois_poi_idx").on(table.poiId),
    entityIdx: index("entity_to_pois_entity_idx").on(table.entityType, table.entityId),
    roleIdx: index("entity_to_pois_role_idx").on(table.roleType),
    orderIdx: index("entity_to_pois_order_idx").on(table.entityId, table.order),
    // 防止重复关联：同一 POI 在同一实体中的同一角色只能出现一次
    uniquePoiEntityRole: uniqueIndex("entity_to_pois_unique_idx").on(
      table.poiId,
      table.entityType,
      table.entityId,
      table.roleType
    ),
  })
);

// 用户收藏表（支持收藏地点、路线等多种实体）
export const userFavorites = sqliteTable(
  "user_favorites",
  {
    id: text("id").primaryKey(), // 收藏记录唯一标识
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(), // 关联用户 ID
    entityType: text("entity_type").notNull(), // 实体类型：location | route
    entityId: text("entity_id").notNull(), // 关联实体 ID（地点ID或路线ID）
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(), // 收藏时间
  },
  (table) => ({
    userIdx: index("user_favorites_user_idx").on(table.userId),
    entityIdx: index("user_favorites_entity_idx").on(table.entityType, table.entityId),
    // 联合唯一索引：防止重复收藏
    uniqueFavorite: uniqueIndex("user_favorites_unique_idx").on(
      table.userId,
      table.entityType,
      table.entityId
    ),
  })
);

// ==================== Relations（表间关系定义）====================

export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams, { relationName: "leaderTeams" }), // 用户创建的队伍（作为领队）
  teamMemberships: many(teamMembers), // 用户参加的队伍成员记录
  sessions: many(sessions), // 用户的登录会话
  accounts: many(accounts), // 用户绑定的第三方账号
  favorites: many(userFavorites), // 用户收藏的地点
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

export const citiesRelations = relations(cities, ({ many }) => ({
  locations: many(locations), // 该城市的地点
  routes: many(routes), // 该城市的路线
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  city: one(cities, {
    fields: [locations.cityId],
    references: [cities.id],
  }), // 所属城市
  routes: many(routes), // 该地点的路线
  teams: many(teams), // 该地点的徒步队伍
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
  location: one(locations, {
    fields: [routes.locationId],
    references: [locations.id],
  }), // 所属地点
  city: one(cities, {
    fields: [routes.cityId],
    references: [cities.id],
  }), // 所属城市
  teams: many(teams), // 该路线的队伍
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  entityToTags: many(entityToTags), // 标签关联记录
}));

export const entityToTagsRelations = relations(entityToTags, ({ one }) => ({
  tag: one(tags, {
    fields: [entityToTags.tagId],
    references: [tags.id],
  }), // 关联的标签
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  location: one(locations, {
    fields: [teams.locationId],
    references: [locations.id],
  }), // 队伍活动地点
  route: one(routes, {
    fields: [teams.routeId],
    references: [routes.id],
  }), // 队伍活动路线
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

// POI 关联
export const poisRelations = relations(pois, ({ many }) => ({
  entityToPois: many(entityToPois), // 该 POI 的所有角色关联
}));

// 实体-POI 角色关联
export const entityToPoisRelations = relations(entityToPois, ({ one }) => ({
  poi: one(pois, {
    fields: [entityToPois.poiId],
    references: [pois.id],
  }), // 关联的 POI
}));

// 用户收藏关联
export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }), // 收藏用户
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

export type City = typeof cities.$inferSelect; // 城市类型（查询结果）
export type NewCity = typeof cities.$inferInsert; // 城市类型（插入数据）

export type Location = typeof locations.$inferSelect; // 地点类型（查询结果）
export type NewLocation = typeof locations.$inferInsert; // 地点类型（插入数据）

export type Route = typeof routes.$inferSelect; // 路线类型（查询结果）
export type NewRoute = typeof routes.$inferInsert; // 路线类型（插入数据）

export type Tag = typeof tags.$inferSelect; // 标签类型（查询结果）
export type NewTag = typeof tags.$inferInsert; // 标签类型（插入数据）

export type EntityToTag = typeof entityToTags.$inferSelect; // 标签关联类型（查询结果）
export type NewEntityToTag = typeof entityToTags.$inferInsert; // 标签关联类型（插入数据）

export type Team = typeof teams.$inferSelect; // 队伍类型（查询结果）
export type NewTeam = typeof teams.$inferInsert; // 队伍类型（插入数据）

export type TeamMember = typeof teamMembers.$inferSelect; // 队伍成员类型（查询结果）
export type NewTeamMember = typeof teamMembers.$inferInsert; // 队伍成员类型（插入数据）

export type PasswordReset = typeof passwordResets.$inferSelect; // 密码重置类型（查询结果）
export type NewPasswordReset = typeof passwordResets.$inferInsert; // 密码重置类型（插入数据）

export type Poi = typeof pois.$inferSelect; // POI 类型（查询结果）
export type NewPoi = typeof pois.$inferInsert; // POI 类型（插入数据）

export type EntityToPoi = typeof entityToPois.$inferSelect; // 实体-POI 关联类型（查询结果）
export type NewEntityToPoi = typeof entityToPois.$inferInsert; // 实体-POI 关联类型（插入数据）

export type UserFavorite = typeof userFavorites.$inferSelect; // 用户收藏类型（查询结果）
export type NewUserFavorite = typeof userFavorites.$inferInsert; // 用户收藏类型（插入数据）

// ==================== Enums（枚举类型定义）====================

export type Difficulty = "easy" | "moderate" | "hard" | "expert"; // 难度等级：简单、中等、困难、专家
export type TeamStatus = "recruiting" | "full" | "formed" | "cancelled" | "completed"; // 队伍状态：招募中、已满、已组建、已取消、已完成
export type TeamMemberStatus = "pending" | "approved" | "rejected" | "leave_pending"; // 成员状态：待审核、已通过、已拒绝、退出申请中
export type UserRole = "user" | "admin"; // 用户角色：普通用户、管理员
export type UserLevel = "beginner" | "intermediate" | "advanced" | "expert"; // 用户等级：新手、进阶、资深、专家
export type UserStatus = "active" | "suspended" | "banned" | "deleted"; // 用户状态：活跃、暂停、封禁、已删除
export type UserGender = "male" | "female" | "other"; // 用户性别：男、女、其他
export type CityLevel = "city" | "district"; // 城市级别：城市、区县
export type TagType = "location" | "route" | "activity"; // 标签类型：地点标签、路线标签、活动标签
export type EntityType = "location" | "route" | "activity"; // 实体类型：地点、路线、活动
