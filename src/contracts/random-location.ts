import { z } from "zod";

export const RandomLocationQuerySchema = z.object({
  recent: z
    .string()
    .max(1290)
    .optional()
    .transform((value) => (value ? value.split(",") : []))
    .pipe(z.array(z.string().min(1).max(128)).max(10))
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Recent IDs must be unique",
    ),
});
export const RandomLocationResponseSchema = z.object({
  success: z.literal(true),
  location: z
    .object({
      id: z.string(),
      name: z.string(),
      city: z.string(),
      coverImageUrl: z.string().nullable(),
    })
    .nullable(),
  total: z.number().int().nonnegative(),
});
export type RandomLocationResponse = z.infer<
  typeof RandomLocationResponseSchema
>;
