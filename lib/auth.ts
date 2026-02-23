import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@/db/schema";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email/resend";
import { copy } from "@/lib/copy";

// 判断是否在 Cloudflare Workers 环境
const isCloudflareWorkers = typeof globalThis !== 'undefined' &&
  (globalThis as { env?: { DB?: unknown } }).env?.DB !== undefined;

// 邮件发送函数
const handleSendResetPasswordEmail = async (data: {
  user: { email: string; name?: string };
  url: string;
}) => {
  const result = await sendPasswordResetEmail(
    data.user.email,
    data.url,
    data.user.name
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

// 动态创建 auth 配置
export const createAuth = (env?: { DB?: D1Database }) => {
  // 如果在 Cloudflare Workers 环境，使用 D1 数据库
  if (env?.DB) {
    return betterAuth({
      database: drizzleAdapter(env.DB as unknown as import("drizzle-orm").BetterSQLite3Database<typeof schema>, {
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
        sendResetPasswordEmail: handleSendResetPasswordEmail,
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
        },
      },
      secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8787",
    });
  }

  // 本地开发环境使用 better-sqlite3
  // 动态导入避免在 Cloudflare Workers 中加载 better-sqlite3
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
      sendResetPasswordEmail: handleSendResetPasswordEmail,
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
      },
    },
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  });
};

// 默认导出（用于本地开发）
let authInstance: ReturnType<typeof createAuth> | undefined;

export const auth = new Proxy({} as ReturnType<typeof createAuth>, {
  get(_, prop) {
    if (!authInstance) {
      authInstance = createAuth();
    }
    return authInstance[prop as keyof typeof authInstance];
  },
});
