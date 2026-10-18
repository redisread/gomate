import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "../db";
import * as schema from "../db/schema";
import type { WorkerEnv } from "../env";
import {
  sendEmailVerificationEmail,
  sendWelcomeEmail,
} from "./email";
import { logger } from "./logger";
import { isUserActive } from "./session-policy";
import { authPassword } from "./auth-password";
import {
  getAuthBaseUrl,
  getAuthTrustedOrigins,
} from "./preview-policy";

/** Better Auth 用户类型（包含扩展字段） */
interface AuthUser {
  id: string;
  email: string;
  name: string;
  nickname?: string | null;
}

/** 验证邮件回调参数 */
interface VerifyEmailParams {
  user: AuthUser;
  url: string;
  token: string;
}

export type Env = WorkerEnv;

type BackgroundExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

function privateClientUrl(appUrl: string, pathname: string, token: string) {
  const url = new URL(pathname, appUrl);
  url.search = "";
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

/**
 * 创建 Better Auth 实例（适用于 Cloudflare Workers 环境）
 */
export function createAuth(
  env: Env,
  executionContext?: BackgroundExecutionContext,
) {
  const authSecret = env.BETTER_AUTH_SECRET;

  // 强制检查 auth secret，生产环境必须有值
  if (!authSecret) {
    throw new Error("BETTER_AUTH_SECRET is required");
  }
  if (!env.APP_URL) {
    throw new Error("APP_URL is required");
  }

  const db = createDb(env.DB);

  // 本地 HTTP 开发时不能使用 Secure cookie，否则浏览器不会保存/发送 session
  const isSecure = (env.APP_URL || "").startsWith("https");

  return betterAuth({
    // Better Auth's default logger includes raw adapter errors and SQL params.
    // Disable it and throw unexpected API failures through Hono's sanitized
    // request boundary instead of persisting tokens, emails or query details.
    logger: { disabled: true },
    onAPIError: { throw: true, errorURL: new URL("/login?oauthError=1", env.APP_URL).href },
    database: drizzleAdapter(db as never, {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        disableIdTokenSignIn: true,
        includeGrantedScopes: false,
        accessType: "online",
        prompt: "select_account",
        mapProfileToUser: (profile) => ({
          email: profile.email.toLocaleLowerCase("en-US"),
          // Profile media stays under GoMate's existing upload boundary.
          image: undefined,
        }),
      },
    } : {},
    account: {
      encryptOAuthTokens: true,
      // Keep the 1.7.0–1.7.2 column populated until a separate schema
      // contraction. This also preserves rollback and custom credential reads.
      additionalFields: {
        issuer: { type: "string", required: true, input: false, returned: false },
      },
      accountLinking: {
        enabled: true,
        requireLocalEmailVerified: true,
        allowDifferentEmails: false,
        updateUserInfoOnLink: false,
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      password: authPassword,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url: _url, token }: VerifyEmailParams) => {
        const task = sendEmailVerificationEmail(
          user.email,
          privateClientUrl(env.APP_URL, "/verify-email", token),
          user.nickname || user.name || user.email,
          env,
        ).then((result) => {
          if (!result.success) {
            logger.error("verification_email_delivery_failed");
          }
        }).catch((error) => {
          logger.error("verification_email_delivery_failed", {
            errorType: error instanceof Error ? error.name : "UnknownEmailError",
          });
        });
        if (executionContext) {
          executionContext.waitUntil(task);
          return;
        }
        await task;
      },
      afterEmailVerification: async (user) => {
        const authUser = user as AuthUser;
        const task = sendWelcomeEmail(
          authUser.email,
          authUser.nickname || authUser.name || authUser.email,
          env,
        ).then((result) => {
          if (!result.success) logger.error("welcome_email_delivery_failed");
        });
        if (executionContext) {
          executionContext.waitUntil(task);
          return;
        }
        await task;
      },
    },
    verification: {
      storeInDatabase: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      storeSessionInDatabase: true,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 5 },
        "/get-session": false,
        "/sign-out": false,
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: isSecure,
        path: "/",
      },
      ...(executionContext
        ? {
            backgroundTasks: {
              handler: (promise: Promise<unknown>) =>
                executionContext.waitUntil(promise),
            },
          }
        : {}),
    },
    databaseHooks: {
      account: {
        create: {
          before: async (account) => {
            const issuer = account.providerId === "credential"
              ? "local:credential"
              : account.providerId === "google"
                ? "https://accounts.google.com"
                : null;
            if (!issuer) throw new Error("Unsupported account provider");
            return { data: { ...account, issuer } };
          },
        },
      },
      session: {
        create: {
          before: async (session) => isUserActive(env, session.userId),
        },
      },
    },
    user: {
      validateUserInfo: ({ user, source }) => {
        if (source.oauth?.providerId === "google" && user.emailVerified !== true) {
          return { error: "google_email_not_verified" };
        }
      },
      additionalFields: {
        bio: { type: "string", required: false, defaultValue: "", input: false },
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
          input: false,
        },
        nickname: { type: "string", required: false, input: false },
        gender: { type: "string", required: false, input: false },
        birthday: { type: "date", required: false, input: false },
        status: {
          type: "string",
          required: false,
          defaultValue: "active",
          input: false,
        },
      },
    },
    secret: authSecret,
    baseURL: getAuthBaseUrl(env),
    basePath: "/api/auth",
    trustedOrigins: (request) => getAuthTrustedOrigins(request, env),
  });
}
