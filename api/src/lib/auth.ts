import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "../db";
import * as schema from "../db/schema";

/** KV TTL 最小值（Cloudflare KV 限制） */
const KV_MIN_TTL = 60;

/** 将 KVNamespace 包装为 Better Auth secondaryStorage 接口 */
function buildKvSecondaryStorage(
  kv: KVNamespace | undefined
): import("better-auth").BetterAuthOptions["secondaryStorage"] | undefined {
  if (!kv) return undefined;
  return {
    get: async (key: string) => {
      try {
        return await kv.get(key);
      } catch (err) {
        console.warn("[KV] get failed:", err);
        return null;
      }
    },
    set: async (key: string, value: string, ttl?: number) => {
      try {
        if (ttl !== undefined && ttl < KV_MIN_TTL) return;
        await kv.put(key, value, ttl !== undefined ? { expirationTtl: ttl } : undefined);
      } catch (err) {
        console.warn("[KV] set failed:", err);
      }
    },
    delete: async (key: string) => {
      try {
        await kv.delete(key);
      } catch (err) {
        console.warn("[KV] delete failed:", err);
      }
    },
  };
}

export interface Env {
  DB: D1Database;
  GOMATE_KV?: KVNamespace;
  R2?: R2Bucket;
  BETTER_AUTH_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  APP_URL?: string;
  FRONTEND_URL?: string;
  R2_PUBLIC_URL?: string;
}

/**
 * 创建 Better Auth 实例（适用于 Cloudflare Workers 环境）
 */
export function createAuth(env: Env) {
  const db = createDb(env.DB);

  return betterAuth({
    database: drizzleAdapter(db as never, {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    secondaryStorage: buildKvSecondaryStorage(env.GOMATE_KV),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 6,
      maxPasswordLength: 128,
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: 3600,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    user: {
      additionalFields: {
        bio: { type: "string", required: false, defaultValue: "" },
        level: { type: "string", required: false, defaultValue: "beginner" },
        role: { type: "string", required: false, defaultValue: "user" },
        nickname: { type: "string", required: false },
        gender: { type: "string", required: false },
        birthday: { type: "date", required: false },
        wechat: { type: "string", required: false },
        completedHikes: { type: "number", required: false, defaultValue: 0 },
        status: { type: "string", required: false, defaultValue: "active" },
        extra: { type: "string", required: false },
      },
    },
    secret: env.BETTER_AUTH_SECRET || "dev-secret-key",
    baseURL: env.APP_URL || "http://localhost:8799",
    basePath: "/auth",
    trustedOrigins: [
      "http://localhost:8799",
      "http://localhost:5432",
      "https://gomate.jiahongw.com",
      "https://gomate-api-production.wujiahong2013.workers.dev",
    ],
  });
}
