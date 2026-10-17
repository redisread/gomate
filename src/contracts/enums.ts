import { z } from "zod";

/** Stable activity identifiers. Additions are shipped with code and translations. */
export const ACTIVITY_TYPES = [
  "hiking",
  "explore",
  "leisure",
  "travel",
] as const;

export const ActivityTypeSchema = z.enum(ACTIVITY_TYPES);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const RegionLevelSchema = z.enum([
  "province",
  "city",
  "district",
  "other",
]);
export type RegionLevel = z.infer<typeof RegionLevelSchema>;

export const LocationStatusSchema = z.enum(["draft", "published", "archived"]);
export type LocationStatus = z.infer<typeof LocationStatusSchema>;

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

export const SeasonSchema = z.enum(SEASONS);
export type Season = z.infer<typeof SeasonSchema>;

export function isSeason(value: unknown): value is Season {
  return typeof value === "string" && SEASONS.includes(value as Season);
}

export const RecruitmentStatusSchema = z.enum(["open", "closed"]);
export type RecruitmentStatus = z.infer<typeof RecruitmentStatusSchema>;

export const TeamLifecycleSchema = z.enum([
  "cancelled",
  "pending",
  "formed",
  "in_progress",
  "completed",
  "expired_unformed",
]);
export type TeamLifecycle = z.infer<typeof TeamLifecycleSchema>;

export const TeamJoinRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export type TeamJoinRequestStatus = z.infer<typeof TeamJoinRequestStatusSchema>;

export const StoryStatusSchema = z.enum(["draft", "published", "hidden"]);
export type StoryStatus = z.infer<typeof StoryStatusSchema>;

export const UserRoleSchema = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "expert",
]);
export type UserLevel = z.infer<typeof UserLevelSchema>;

export const UserStatusSchema = z.enum([
  "active",
  "suspended",
  "banned",
  "deleted",
]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UserGenderSchema = z.enum(["male", "female", "other"]);
export type UserGender = z.infer<typeof UserGenderSchema>;
