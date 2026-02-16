import { createAuthClient } from "better-auth/client";
import { auth } from "./auth";

// 创建客户端 auth 实例
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// 导出常用方法
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  updateUser,
  forgetPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
} = authClient;

// 导出类型
export type ClientAuthSession = typeof authClient.$Infer.Session;
