import { z } from "zod";

export const NativeSessionSchema = z.object({ token: z.string() });
export const NativeProvidersSchema = z.object({
  google: z.boolean(),
  apple: z.boolean(),
});
export const NativeStartResponseSchema = z.object({
  requestId: z.string(),
  url: z.string(),
});
export const NativeChallengeSchema = z
  .object({ challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/u) })
  .strict();
export const NativeExchangeSchema = z
  .object({
    requestId: z.uuid(),
    code: z.string().min(64).max(128),
    verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/u),
  })
  .strict();
export const NativeAppleSignInSchema = z
  .object({
    code: z.string().min(1).max(4096),
    nonce: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/u),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
  })
  .strict();
