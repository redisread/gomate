import { createAuthClient } from "better-auth/react";
/**
 * Better Auth stays on the current origin under the unified Worker API prefix.
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
});

// 导出常用方法
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  resetPassword,
  sendVerificationEmail,
} = authClient;

// 导出类型
export type ClientAuthSession = typeof authClient.$Infer.Session;
