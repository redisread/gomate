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
