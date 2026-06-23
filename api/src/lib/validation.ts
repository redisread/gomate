/**
 * Centralized Validation Schemas
 *
 * All route validation schemas should be defined here for consistency.
 * Use Zod for type-safe validation.
 */

import { z } from "zod";

/**
 * Location validation schemas
 */
export const createLocationSchema = z.object({
  name: z.string().min(1, "地点名称不能为空").max(200, "地点名称不能超过200字"),
  slug: z.string().max(200).optional(),
  type: z.string().max(50).optional(),
  subtitle: z.string().max(500).optional(),
  description: z.string().min(1, "地点描述不能为空").max(5000, "地点描述不能超过5000字"),
  address: z.string().max(500).optional(),
  cityId: z.string().min(1, "城市ID不能为空"),
  cityName: z.string().max(100).optional(),
  bestSeason: z.array(z.string()).optional(),
  coverImage: z.string().url("封面图片必须是有效URL"),
  images: z.array(z.string().url("图片必须是有效URL")).optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  extra: z.record(z.unknown()).optional(),
});

export const updateLocationSchema = createLocationSchema.partial().extend({
  id: z.string().min(1, "地点ID不能为空"),
});

/**
 * POI (Point of Interest) validation schemas
 */
export const createPoiSchema = z.object({
  locationId: z.string().min(1, "地点ID不能为空"),
  name: z.string().min(1, "打卡点名称不能为空").max(50, "打卡点名称不能超过50字"),
  description: z.string().max(500, "描述不能超过500字").optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90, "纬度必须在-90到90之间"),
    lng: z.number().min(-180).max(180, "经度必须在-180到180之间"),
  }, "坐标格式无效"),
  images: z.array(z.string().url("图片必须是有效URL")).max(10, "最多10张图片").optional(),
});

export const updatePoiSchema = createPoiSchema.partial().extend({
  id: z.string().min(1, "打卡点ID不能为空"),
});

/**
 * Story validation schemas
 */
export const createStorySchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题不能超过100字"),
  summary: z.string().min(1, "摘要不能为空").max(150, "摘要不能超过150字"),
  content: z.string().min(1, "内容不能为空").max(10000, "内容不能超过10000字"),
  coverImage: z.string().url("封面图片必须是有效URL"),
  locationId: z.string().min(1, "地点ID不能为空"),
  tags: z.array(z.string()).max(10, "最多10个标签").optional(),
});

export const updateStorySchema = createStorySchema.partial().extend({
  id: z.string().min(1, "故事ID不能为空"),
});

/**
 * Activity Post validation schemas
 */
export const createActivityPostSchema = z.object({
  teamId: z.string().min(1, "队伍ID不能为空"),
  content: z.string().min(1, "内容不能为空").max(200, "内容不能超过200字"),
  images: z.array(z.string().url("图片必须是有效URL")).max(3, "最多3张图片").optional(),
});

export const updateActivityPostSchema = createActivityPostSchema.partial().extend({
  id: z.string().min(1, "分享ID不能为空"),
});

/**
 * Tag validation schemas
 */
export const createTagSchema = z.object({
  name: z.string().min(1, "标签名称不能为空").max(50, "标签名称不能超过50字"),
  type: z.string().min(1, "标签类型不能为空").max(50, "标签类型不能超过50字"),
  icon: z.string().max(100, "图标不能超过100字").optional(),
});

export const updateTagSchema = createTagSchema.partial().extend({
  id: z.string().min(1, "标签ID不能为空"),
});

/**
 * Favorite validation schemas
 */
export const createFavoriteSchema = z.object({
  entityType: z.enum(["location", "route", "story"], "实体类型必须是 location、route 或 story"),
  entityId: z.string().min(1, "实体ID不能为空"),
});

/**
 * City validation schemas
 */
export const createCitySchema = z.object({
  name: z.string().min(1, "城市名称不能为空").max(100, "城市名称不能超过100字"),
  province: z.string().min(1, "省份不能为空").max(100, "省份不能超过100字"),
  level: z.enum(["city", "district", "county"], "级别必须是 city、district 或 county"),
  adcode: z.string().min(1, "行政区划代码不能为空").max(20, "行政区划代码不能超过20字"),
  isHot: z.boolean().optional(),
});

export const updateCitySchema = createCitySchema.partial().extend({
  id: z.string().min(1, "城市ID不能为空"),
});

/**
 * Hiking Route validation schemas
 */
export const createHikingRouteSchema = z.object({
  name: z.string().min(1, "路线名称不能为空").max(200, "路线名称不能超过200字"),
  description: z.string().max(5000, "描述不能超过5000字").optional(),
  locationId: z.string().min(1, "地点ID不能为空"),
  difficulty: z.enum(["easy", "medium", "hard"], "难度必须是 easy、medium 或 hard"),
  durationMin: z.number().int().min(1, "时长必须大于0"),
  distance: z.number().min(0, "距离不能为负"),
  elevation: z.number().min(0, "海拔不能为负").optional(),
  tags: z.array(z.string()).max(20, "最多20个标签").optional(),
});

export const updateHikingRouteSchema = createHikingRouteSchema.partial().extend({
  id: z.string().min(1, "路线ID不能为空"),
});

/**
 * Common validation patterns
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const idParamSchema = z.object({
  id: z.string().min(1, "ID不能为空"),
});

/**
 * Sanitization helpers
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeHtml(input: string): string {
  // Remove script tags and event handlers
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "")
    .replace(/on\w+='[^']*'/g, "");
}
