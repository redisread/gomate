import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

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
    nicknameIdx: index("users_nickname_idx").on(table.nickname),
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
    // task #151（简化 Phase 1）：徒步参数扁平化到地点，从主路线回填（多路线取 MIN(created_at)）
    // 均可空——无路线的地点（城市探索类等）天然无徒步参数
    difficulty: text("difficulty"),
    durationMin: integer("duration_min"),
    durationMax: integer("duration_max"),
    distance: real("distance"),
    elevation: integer("elevation"),
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
    nameIdx: index("locations_name_idx").on(table.name),
    cityIdx: index("locations_city_idx").on(table.cityId),
    typeIdx: index("locations_type_idx").on(table.type),
    createdAtIdx: index("locations_created_at_idx").on(table.createdAt),
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
    typeTagEntityIdx: index("entity_to_tags_type_tag_entity_idx").on(table.entityType, table.tagId, table.entityId),
    uniqueEntityTag: uniqueIndex("entity_to_tags_unique_idx").on(table.entityId, table.entityType, table.tagId),
  })
);

// 队伍表
export const teams = sqliteTable(
  "teams",
  {
    id: text("id").primaryKey(),
    locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }).notNull(),
    leaderId: text("leader_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startTime: integer("start_time", { mode: "timestamp_ms" }).notNull(),
    endTime: integer("end_time", { mode: "timestamp_ms" }).notNull(),
    durationMin: integer("duration_min").notNull().default(240),
    maxMembers: integer("max_members").notNull().default(10),
    requirements: text("requirements"),
    icon: text("icon").default("⛰️").notNull(),
    status: text("status").notNull().default("recruiting"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    locationIdx: index("teams_location_idx").on(table.locationId),
    leaderIdx: index("teams_leader_idx").on(table.leaderId),
    statusIdx: index("teams_status_idx").on(table.status),
    startTimeIdx: index("teams_start_time_idx").on(table.startTime),
    titleIdx: index("teams_title_idx").on(table.title),
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
    teamStatusIdx: index("team_members_team_status_idx").on(table.teamId, table.status),
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
    // 0009 已建的复合索引（补充声明，对齐 DB 现状，零 DB 变更）
    userCreatedIdx: index("user_favorites_user_created_idx").on(table.userId, table.createdAt),
  })
);

// ==================== Relations ====================

export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams, { relationName: "leaderTeams" }),
  teamMemberships: many(teamMembers),
  sessions: many(sessions),
  accounts: many(accounts),
  favorites: many(userFavorites),
  storyLikes: many(userStoryLikes),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const citiesRelations = relations(cities, ({ many }) => ({
  locations: many(locations),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  city: one(cities, { fields: [locations.cityId], references: [cities.id] }),
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
  leader: one(users, { fields: [teams.leaderId], references: [users.id], relationName: "leaderTeams" }),
  members: many(teamMembers),
  activityPosts: many(activityPosts),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
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
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type EntityToTag = typeof entityToTags.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

// 私信会话表
export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
    userId: text("user_id").references(() => users.id).notNull(),
    leaderId: text("leader_id").references(() => users.id).notNull(),
    initiatorId: text("initiator_id").references(() => users.id).notNull(),
    lastMessageContent: text("last_message_content"),
    lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    teamIdx: index("conversations_team_idx").on(table.teamId),
    userIdx: index("conversations_user_idx").on(table.userId),
    leaderIdx: index("conversations_leader_idx").on(table.leaderId),
    participantIdx: uniqueIndex("conversations_participant_idx").on(table.teamId, table.userId),
    lastMsgIdx: index("conversations_last_msg_idx").on(table.lastMessageAt),
  })
);

// 私信消息表
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
    senderId: text("sender_id").references(() => users.id).notNull(),
    content: text("content").notNull(),
    isRead: integer("is_read", { mode: "boolean" }).default(false).notNull(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(table.conversationId),
    senderIdx: index("messages_sender_idx").on(table.senderId),
    createdIdx: index("messages_created_idx").on(table.createdAt),
    conversationCreatedIdx: index("messages_conversation_created_at_idx").on(table.conversationId, table.createdAt),
    conversationUnreadSenderIdx: index("messages_conversation_unread_sender_idx").on(
      table.conversationId,
      table.isRead,
      table.senderId
    ),
  })
);

// Relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  team: one(teams, { fields: [conversations.teamId], references: [teams.id] }),
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  leader: one(users, { fields: [conversations.leaderId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

// ==================== Activity Posts (活动后分享) ====================

export const activityPosts = sqliteTable(
  "activity_posts",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
    locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    content: text("content").notNull(),
    images: text("images").notNull(), // JSON array of image URLs
    status: text("status").notNull().default("visible"), // visible | hidden | deleted
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    teamIdx: index("activity_posts_team_idx").on(table.teamId),
    locationIdx: index("activity_posts_location_idx").on(table.locationId),
    authorIdx: index("activity_posts_author_idx").on(table.authorId),
    statusIdx: index("activity_posts_status_idx").on(table.status),
    createdAtIdx: index("activity_posts_created_at_idx").on(table.createdAt),
  })
);

export const activityPostsRelations = relations(activityPosts, ({ one }) => ({
  team: one(teams, { fields: [activityPosts.teamId], references: [teams.id] }),
  location: one(locations, { fields: [activityPosts.locationId], references: [locations.id] }),
  author: one(users, { fields: [activityPosts.authorId], references: [users.id] }),
}));

// Update teams relations to include activity posts
// (Need to update existing teamsRelations)
export type UserFavorite = typeof userFavorites.$inferSelect;
export type NewUserFavorite = typeof userFavorites.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type ActivityPost = typeof activityPosts.$inferSelect;
export type NewActivityPost = typeof activityPosts.$inferInsert;

// ==================== Enums ====================

export type Difficulty = "easy" | "moderate" | "hard" | "expert";
export type TeamStatus = "recruiting" | "full" | "formed" | "cancelled" | "completed";
export type TeamMemberStatus = "pending" | "approved" | "rejected" | "leave_pending" | "cancelled";
export type UserRole = "user" | "admin";
export type UserLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type UserStatus = "active" | "suspended" | "banned" | "deleted";
export type UserGender = "male" | "female" | "other";
export type CityLevel = "city" | "district";
export type TagType = "location" | "activity";
export type EntityType = "location" | "activity" | "story";

// 活动后分享状态
export type ActivityPostStatus = "visible" | "hidden" | "deleted";

// ==================== Stories (发现/故事) ====================

export const stories = sqliteTable(
  "stories",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(), // 摘要，限制 150 字
    content: text("content").notNull(), // Markdown/富文本内容
    coverImage: text("cover_image"), // 120x80px 封面图
    locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }), // 关联地点（可选）
    status: text("status").notNull().default("published"), // draft | published | hidden
    viewCount: integer("view_count").default(0),
    likeCount: integer("like_count").default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    authorIdx: index("stories_author_idx").on(table.authorId),
    locationIdx: index("stories_location_idx").on(table.locationId),
    statusIdx: index("stories_status_idx").on(table.status),
    createdAtIdx: index("stories_created_at_idx").on(table.createdAt),
    // 0009 已建的复合索引（补充声明，对齐 DB 现状，零 DB 变更）
    statusCreatedAtIdx: index("stories_status_created_at_idx").on(table.status, table.createdAt),
  })
);

export const storiesRelations = relations(stories, ({ one, many }) => ({
  author: one(users, { fields: [stories.authorId], references: [users.id] }),
  location: one(locations, { fields: [stories.locationId], references: [locations.id] }),
  likes: many(userStoryLikes),
}));

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;

// 发现内容状态
export type StoryStatus = "draft" | "published" | "hidden";

// ==================== User Story Likes (点赞) ====================

export const userStoryLikes = sqliteTable(
  "user_story_likes",
  {
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    storyId: text("story_id").references(() => stories.id, { onDelete: "cascade" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.storyId] }),
    userIdx: index("user_story_likes_user_idx").on(table.userId),
    storyIdx: index("user_story_likes_story_idx").on(table.storyId),
  })
);

export const userStoryLikesRelations = relations(userStoryLikes, ({ one }) => ({
  user: one(users, { fields: [userStoryLikes.userId], references: [users.id] }),
  story: one(stories, { fields: [userStoryLikes.storyId], references: [stories.id] }),
}));

export type UserStoryLike = typeof userStoryLikes.$inferSelect;
export type NewUserStoryLike = typeof userStoryLikes.$inferInsert;

// ==================== Image Cache (分享图图片预缓存) ====================

export const imageCaches = sqliteTable(
  "image_caches",
  {
    id: text("id").primaryKey(),
    imageUrl: text("image_url").notNull(), // 原始图片 URL
    base64Data: text("base64_data").notNull(), // Base64 Data URL
    contentType: text("content_type").notNull().default("image/jpeg"),
    size: integer("size"), // 图片大小(字节)
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(), // 缓存过期时间
    createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    imageUrlIdx: uniqueIndex("image_caches_url_idx").on(table.imageUrl),
    expiresIdx: index("image_caches_expires_idx").on(table.expiresAt),
  })
);

export type ImageCache = typeof imageCaches.$inferSelect;
export type NewImageCache = typeof imageCaches.$inferInsert;

// ==================== Share Events (分享埋点) ====================

export const shareEvents = sqliteTable(
  "share_events",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    shareChannel: text("share_channel").notNull(),
    userId: text("user_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    entityIdx: index("share_events_entity_idx").on(table.entityType, table.entityId),
    channelIdx: index("share_events_channel_idx").on(table.shareChannel),
    createdAtIdx: index("share_events_created_at_idx").on(table.createdAt),
  })
);

export type ShareEvent = typeof shareEvents.$inferSelect;
export type NewShareEvent = typeof shareEvents.$inferInsert;
