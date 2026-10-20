import { z } from "zod";
import { LocationSchema, TagSchema, type ApiError } from "./index";

/** Public API responses discriminate successful payloads from the error envelope. */
export type ApiResult<T extends { success: true }> =
  T | { success: false; error: ApiError & { details?: unknown } };

export const LocationResponseSchema = z.object({
  success: z.literal(true),
  location: LocationSchema,
});
export const LocationPageSchema = z.object({
  success: z.literal(true),
  locations: z.array(LocationSchema),
  nextCursor: z.string().nullable(),
});
export const LocationsResponseSchema = LocationPageSchema.extend({
  total: z.number(),
});
export const TagsResponseSchema = z.object({
  success: z.literal(true),
  tags: z.array(
    TagSchema.extend({
      references: z
        .object({ locations: z.number(), teams: z.number() })
        .optional(),
    }),
  ),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean(),
  }),
});
export const UploadResponseSchema = z.object({
  success: z.literal(true),
  key: z.string(),
  url: z.string(),
  size: z.number().int(),
  type: z.string(),
});
export type LocationResponse = z.infer<typeof LocationResponseSchema>;
export type LocationsResponse = z.infer<typeof LocationsResponseSchema>;
export type TagsResponse = z.infer<typeof TagsResponseSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
