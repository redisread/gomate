import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==================== Enums ====================

export const difficultyEnum = pgEnum("difficulty", [
  "easy",
  "moderate",
  "hard",
  "expert",
]);

export const teamStatusEnum = pgEnum("team_status", [
  "recruiting",
  "full",
  "ongoing",
  "completed",
  "cancelled",
]);

export const teamMemberRoleEnum = pgEnum("team_member_role", [
  "leader",
  "member",
]);

export const teamMemberStatusEnum = pgEnum("team_member_status", [
  "pending",
  "approved",
  "rejected",
]);

// ==================== Tables ====================

// 用户表（Better Auth 扩展）
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: varchar("image", { length: 500 }),
    bio: text("bio"),
    experience: varchar("experience", { length: 50 }), // beginner, intermediate, advanced, expert
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

// 地点表
export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    duration: varchar("duration", { length: 100 }).notNull(), // 例如: "4-5小时"
    distance: varchar("distance", { length: 100 }).notNull(), // 例如: "8.5公里"
    bestSeason: varchar("best_season", { length: 100 }).array().notNull(), // ["春季", "秋季"]
    coverImage: varchar("cover_image", { length: 500 }).notNull(),
    images: varchar("images", { length: 500 }).array().default([]).notNull(),
    routeDescription: text("route_description"),
    tips: text("tips"),
    equipmentNeeded: varchar("equipment_needed", { length: 200 }).array().default([]),
    coordinates: jsonb("coordinates").$type<{ lat: number; lng: number }>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("locations_slug_idx").on(table.slug),
    difficultyIdx: index("locations_difficulty_idx").on(table.difficulty),
  })
);

// 队伍表
export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .references(() => locations.id, { onDelete: "cascade" })
      .notNull(),
    leaderId: uuid("leader_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    maxMembers: integer("max_members").notNull().default(10),
    currentMembers: integer("current_members").notNull().default(1), // 队长默认算1人
    requirements: text("requirements"), // 入队要求
    status: teamStatusEnum("status").notNull().default("recruiting"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    locationIdx: index("teams_location_idx").on(table.locationId),
    leaderIdx: index("teams_leader_idx").on(table.leaderId),
    statusIdx: index("teams_status_idx").on(table.status),
    startTimeIdx: index("teams_start_time_idx").on(table.startTime),
  })
);

// 队伍成员表
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: teamMemberRoleEnum("role").notNull().default("member"),
    status: teamMemberStatusEnum("status").notNull().default("pending"),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
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

export type Difficulty = (typeof difficultyEnum.enumValues)[number];
export type TeamStatus = (typeof teamStatusEnum.enumValues)[number];
export type TeamMemberRole = (typeof teamMemberRoleEnum.enumValues)[number];
export type TeamMemberStatus = (typeof teamMemberStatusEnum.enumValues)[number];
