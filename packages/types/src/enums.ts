/**
 * GoMate 共享枚举类型定义
 * 与 db/schema.ts 中的枚举保持一致
 */

/** 路线/活动难度等级 */
export type Difficulty = "easy" | "moderate" | "hard" | "expert";

/** 队伍状态 */
export type TeamStatus =
  | "recruiting"
  | "full"
  | "formed"
  | "cancelled"
  | "completed";

/** 队伍成员状态 */
export type TeamMemberStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "leave_pending";

/** 用户角色 */
export type UserRole = "user" | "admin";

/** 用户徒步等级 */
export type UserLevel = "beginner" | "intermediate" | "advanced" | "expert";

/** 用户账号状态 */
export type UserStatus = "active" | "suspended" | "banned" | "deleted";

/** 用户性别 */
export type UserGender = "male" | "female" | "other";

/** 城市行政级别 */
export type CityLevel = "city" | "district";

/** 标签类型 */
export type TagType = "location" | "route" | "activity";

/** 实体类型 */
export type EntityType = "location" | "route" | "activity";

/** 地点类型 */
export type LocationType = "hiking" | "explore" | "leisure" | "travel";

/** POI 角色类型 */
export type PoiRoleType =
  | "waypoint"
  | "checkpoint"
  | "viewpoint"
  | "facility"
  | "poi";
