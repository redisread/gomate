import { z } from "zod";

/** Better Auth's browser-visible user differs from the product profile DTO. */
export const AuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  bio: z.string().nullable().optional(),
  role: z.string().optional(),
  nickname: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(),
  status: z.string().optional(),
});
export const BrowserSignInSchema = z.object({
  redirect: z.boolean(),
  url: z.string().optional(),
  user: AuthUserSchema,
});
export const BrowserSessionSchema = z
  .object({
    session: z.object({
      id: z.string(),
      userId: z.string(),
      expiresAt: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
    user: AuthUserSchema,
  })
  .nullable();
export const AuthProviderErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const SignOutSchema = z.object({
  success: z.literal(true),
  url: z.string().optional(),
  redirect: z.boolean().optional(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type BrowserSignIn = z.infer<typeof BrowserSignInSchema>;
export type BrowserSession = z.infer<typeof BrowserSessionSchema>;
