import { createAuthClient } from "better-auth/react";

/**
 * Better Auth 客户端 - baseURL 指向 api/ 后端服务
 */
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    // 客户端：使用环境变量或默认后端地址
    return (
      (import.meta.env.PUBLIC_API_URL as string) || "http://localhost:8799"
    );
  }
  return (
    (import.meta.env.PUBLIC_API_URL as string) || "http://localhost:8799"
  );
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  // 后端 Better Auth 挂载在 /auth，而非默认的 /api/auth
  basePath: "/auth",
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
