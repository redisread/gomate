import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@/db/schema";
import { createD1Client } from "@/db";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email/resend";
import { copy } from "@/lib/copy";

// 判断是否在 Cloudflare Workers 环境
const isCloudflareWorkers = typeof globalThis !== 'undefined' &&
  (globalThis as { env?: { DB?: unknown } }).env?.DB !== undefined;

// 邮件发送函数 - 接收 env 参数
const handleSendResetPasswordEmail = async (
  data: { user: { id: string; email: string; name?: string; emailVerified: boolean; createdAt: Date; updatedAt: Date; image?: string }; url: string; token: string },
  request: Request,
  env: { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string; NEXT_PUBLIC_APP_URL?: string }
) => {
  const result = await sendPasswordResetEmail(
    data.user.email,
    data.url,
    data.user.name,
    env
  );

  if (!result.success) {
    console.error("Failed to send reset password email:", result.error);
    throw new Error(result.error || copy.api.sendEmailFailed);
  }
};

const handleSendWelcomeEmail = async (data: { user: { email: string; name?: string } }) => {
  if (!data.user.name) return;

  const result = await sendWelcomeEmail(data.user.email, data.user.name);

  if (!result.success) {
    console.error("Failed to send welcome email:", result.error);
    // 欢迎邮件发送失败不抛出错误，不影响注册流程
  }
};

/** KV TTL 最小值（Cloudflare KV 限制） */
const KV_MIN_TTL = 60;

/**
 * 将 KVNamespace 包装为 Better Auth secondaryStorage 接口。
 * KV 不可用时返回 undefined，auth 回退到纯 D1 查询。
 */
function buildKvSecondaryStorage(
  kv: KVNamespace | undefined
): import("better-auth").BetterAuthOptions["secondaryStorage"] | undefined {
  if (!kv) return undefined;
  return {
    get: async (key: string) => {
      try {
        return await kv.get(key);
      } catch (err) {
        console.warn("[KV] get failed, fallback to D1:", err);
        return null;
      }
    },
    set: async (key: string, value: string, ttl?: number) => {
      try {
        // TTL < 60s 时 KV 会报错，且 session 即将过期意义不大，直接跳过
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

// 动态创建 auth 配置
export const createAuth = (env?: {
  DB?: D1Database;
  GOMATE_KV?: KVNamespace;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  NEXT_PUBLIC_APP_URL?: string;
}) => {
  // 如果在 Cloudflare Workers 环境，使用 D1 数据库
  if (env?.DB) {
    // 创建 Drizzle D1 客户端（关键修复：drizzleAdapter 需要 Drizzle 客户端实例，而非原始 D1 绑定）
    const db = createD1Client(env.DB);

    return betterAuth({
      database: drizzleAdapter(db as unknown as import("drizzle-orm").BetterSQLite3Database<typeof schema>, {
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
        sendResetPassword: async (data, request) => {
          await handleSendResetPasswordEmail(data, request, env);
        },
        resetPasswordTokenExpiresIn: 3600, // 1小时
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
      },
      user: {
        additionalFields: {
          bio: {
            type: "string",
            required: false,
            defaultValue: "",
          },
          level: {
            type: "string",
            required: false,
            defaultValue: "beginner",
          },
        },
      },
      secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8787",
    });
  }

  // 本地开发环境使用 better-sqlite3
  // 动态导入避免在 Cloudflare Workers 中加载 better-sqlite3
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = require("@/db");
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 6,
      maxPasswordLength: 128,
      requireEmailVerification: false,
      sendResetPassword: async (data, request) => {
        await handleSendResetPasswordEmail(data, request, {});
      },
      resetPasswordTokenExpiresIn: 3600, // 1小时
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    user: {
      additionalFields: {
        bio: {
          type: "string",
          required: false,
          defaultValue: "",
        },
        level: {
          type: "string",
          required: false,
          defaultValue: "beginner",
        },
      },
    },
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  });
};

/**
 * 获取 auth 实例（自动通过 getCloudflareContext 获取 D1 绑定）
 * 适用于 Server Actions 等无法直接传入 env 的场景
 */
export async function getAuth() {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext();
  if (!env.DB) {
    throw new Error("D1 database binding not found.");
  }
  return createAuth({
    DB: env.DB as D1Database,
    GOMATE_KV: (env as { GOMATE_KV?: KVNamespace }).GOMATE_KV,
    RESEND_API_KEY: env.RESEND_API_KEY as string | undefined,
    RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL as string | undefined,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL as string | undefined,
  });
}
