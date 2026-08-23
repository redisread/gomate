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
  extra: z.record(z.unknown()).nullable().optional(),
  // P0-B T4（task #171）§8：停车 tri-state；true / false / null
  parkingAvailable: z.boolean().nullable().optional(),
  parkingInfo: z.string().max(100, "停车说明不能超过100字").optional(),
});

export const updateLocationSchema = createLocationSchema.partial().extend({
  id: z.string().min(1, "地点ID不能为空"),
});

/**
 * Story validation schemas
 */
export const createStorySchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题不能超过100字"),
  summary: z.string().min(1, "摘要不能为空").max(150, "摘要不能超过150字"),
  content: z.string().min(1, "内容不能为空").max(10000, "内容不能超过10000字"),
  // spec §6（task #143）：封面改可选，无封面时下游用默认样式展示
  coverImage: z.string().url("封面图片必须是有效URL").optional(),
  locationId: z.string().min(1, "地点ID不能为空"),
  tags: z.array(z.string()).max(10, "最多10个标签").optional(),
});

export const updateStorySchema = createStorySchema.partial().extend({
  id: z.string().min(1, "故事ID不能为空"),
  status: z.enum(["draft", "published", "hidden"], { message: "状态必须是 draft、published 或 hidden" }).optional(),
  tags: z.array(z.string()).max(10, "最多10个标签").optional(),
});

/**
 * Activity Post validation schemas
 */
export const createActivityPostSchema = z.object({
  content: z.string().min(1, "内容不能为空").max(200, "内容不能超过200字"),
  images: z.array(z.string().url("图片必须是有效URL")).max(3, "最多3张图片").optional(),
});

/**
 * Tag validation schemas
 */
export const createTagSchema = z.object({
  name: z.string().min(1, "标签名称不能为空").max(50, "标签名称不能超过50字"),
  type: z.string().min(1, "标签类型不能为空").max(50, "标签类型不能超过50字"),
  icon: z.string().max(100, "图标不能超过100字").optional(),
});

/**
 * Favorite validation schemas
 */
export const createFavoriteSchema = z.object({
  entityType: z.enum(["location", "story"], { message: "实体类型必须是 location 或 story" }),
  entityId: z.string().min(1, "实体ID不能为空"),
});

/**
 * City validation schemas
 */
export const createCitySchema = z.object({
  name: z.string().min(1, "城市名称不能为空").max(100, "城市名称不能超过100字"),
  province: z.string().min(1, "省份不能为空").max(100, "省份不能超过100字"),
  level: z.enum(["city", "district", "county"], { message: "级别必须是 city、district 或 county" }),
  adcode: z.string().min(1, "行政区划代码不能为空").max(20, "行政区划代码不能超过20字"),
  isHot: z.boolean().optional(),
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
