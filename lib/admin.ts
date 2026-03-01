import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-context";

/**
 * 检查用户是否为管理员
 */
export function isAdminUser(user: { role?: string | null } | null | undefined): boolean {
  return user?.role === "admin";
}

/**
 * 服务端权限检查 - 获取当前用户并验证管理员权限
 * @returns 如果是管理员返回用户信息，否则抛出错误
 */
export async function requireAdmin() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("未登录");
  }

  if (session.user.role !== "admin") {
    throw new Error("无权限访问");
  }

  return session;
}

/**
 * 服务端获取当前用户角色
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return (session?.user?.role as UserRole) || "user";
  } catch {
    return null;
  }
}