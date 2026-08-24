/** Stable activity identifiers. Additions are shipped with code and translations. */
export const ACTIVITY_TYPES = [
  "hiking",
  "explore",
  "leisure",
  "travel",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type Difficulty = "easy" | "moderate" | "hard" | "expert";

export type RegionLevel = "province" | "city" | "district" | "other";

export type LocationStatus = "draft" | "published" | "archived";

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

export type Season = (typeof SEASONS)[number];

export type RecruitmentStatus = "open" | "closed";

export type TeamLifecycle =
  | "cancelled"
  | "pending"
  | "formed"
  | "in_progress"
  | "completed"
  | "expired_unformed";

export type TeamJoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type StoryStatus = "draft" | "published" | "hidden";

export type UserRole = "user" | "admin";

export type UserLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type UserStatus = "active" | "suspended" | "banned" | "deleted";

export type UserGender = "male" | "female" | "other";
