import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "@better-auth/api-key/client";
import { API_BASE } from "./api";

/**
 * Better Auth 客户端 - baseURL 指向 api/ 后端服务
 * plugins: apiKeyClient — P1b API Key 管理（#210）
 */
export const authClient = createAuthClient({
  baseURL: API_BASE,
  // 后端 Better Auth 挂载在 /auth，而非默认的 /api/auth
  basePath: "/auth",
  plugins: [apiKeyClient()],
});

// 导出常用方法
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  updateUser,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
} = authClient;

// 导出类型
export type ClientAuthSession = typeof authClient.$Infer.Session;
