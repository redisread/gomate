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
    experience: text("experience"), // beginner, intermediate, advanced, expert
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

// 地点表
export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    difficulty: text("difficulty").notNull(), // easy, moderate, hard, expert
    duration: text("duration").notNull(), // 例如: "4-5小时"
    distance: text("distance").notNull(), // 例如: "8.5公里"
    bestSeason: text("best_season").notNull(), // JSON 数组: ["春季", "秋季"]
    coverImage: text("cover_image").notNull(),
    images: text("images").notNull(), // JSON 数组
    routeDescription: text("route_description"),
    tips: text("tips"),
    equipmentNeeded: text("equipment_needed"), // JSON 数组
    coordinates: text("coordinates").notNull(), // JSON: { lat: number; lng: number }
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
    maxMembers: integer("max_members").notNull().default(10),
    currentMembers: integer("current_members").notNull().default(1),
    requirements: text("requirements"), // 入队要求
    status: text("status").notNull().default("recruiting"), // recruiting, full, ongoing, completed, cancelled
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

// ==================== Relations ====================

export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams, { relationName: "leaderTeams" }),
  teamMemberships: many(teamMembers),
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

// ==================== Types ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

// 枚举类型定义
export type Difficulty = "easy" | "moderate" | "hard" | "expert";
export type TeamStatus = "recruiting" | "full" | "ongoing" | "completed" | "cancelled";
export type TeamMemberRole = "leader" | "member";
export type TeamMemberStatus = "pending" | "approved" | "rejected";
