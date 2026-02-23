"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import type { User } from "@/db/schema";
import { copy } from "@/lib/copy";

export interface AuthUser {
  id: string;
  name: string;
  avatar: string;
  email: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  completedHikes: number;
  bio: string;
  createdAt: string;
}

// 从 API 获取完整用户信息
async function fetchFullUserInfo(userId: string): Promise<Partial<AuthUser> | null> {
  try {
    const response = await fetch(`/api/user?id=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      console.error("[fetchFullUserInfo] Response not ok:", response.status);
      return null;
    }
    const data = await response.json();
    return data.user as Partial<AuthUser>;
  } catch (error) {
    console.error("[fetchFullUserInfo] Error:", error);
    return null;
  }
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// 默认头像
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // 使用 Better Auth 的 useSession hook 获取 session
  const { data: session, isPending } = authClient.useSession();

  // 同步用户数据的函数
  const syncUserData = React.useCallback(async () => {
    if (session?.user) {
      // 处理 createdAt 可能是 Date 或整数时间戳的情况
      let createdAtStr: string;
      if (session.user.createdAt) {
        if (typeof session.user.createdAt === 'number') {
          createdAtStr = new Date(session.user.createdAt).toISOString();
        } else if (session.user.createdAt instanceof Date) {
          createdAtStr = session.user.createdAt.toISOString();
        } else {
          createdAtStr = new Date().toISOString();
        }
      } else {
        createdAtStr = new Date().toISOString();
      }

      // 尝试从 API 获取完整用户信息（包含 bio、level 等自定义字段）
      const fullUser = await fetchFullUserInfo(session.user.id);

      const authUser: AuthUser = {
        id: session.user.id,
        name: fullUser?.name !== undefined ? fullUser.name : session.user.name,
        avatar: fullUser?.avatar !== undefined ? fullUser.avatar : (session.user.image || DEFAULT_AVATAR),
        email: session.user.email,
        level: (fullUser?.level !== undefined ? fullUser.level : session.user.level as AuthUser["level"]) || "beginner",
        completedHikes: fullUser?.completedHikes !== undefined ? fullUser.completedHikes : ((session.user as unknown as { completedHikes?: number }).completedHikes || 0),
        bio: "新人户外爱好者，期待与你一起探索山野。",
        createdAt: fullUser?.createdAt !== undefined ? fullUser.createdAt : createdAtStr,
      };
      setUser(authUser);
    } else {
      setUser(null);
    }
  }, [session]);

  // 当 session 变化时更新用户状态
  React.useEffect(() => {
    syncUserData();
    setIsLoading(isPending);
  }, [session, isPending, syncUserData]);

  // 手动刷新用户信息
  const refreshUser = React.useCallback(async () => {
    if (session?.user?.id) {
      // 强制从 API 获取最新数据
      const fullUser = await fetchFullUserInfo(session.user.id);
      if (fullUser) {
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            name: fullUser.name !== undefined ? fullUser.name : prev.name,
            avatar: fullUser.avatar !== undefined ? fullUser.avatar : prev.avatar,
            bio: fullUser.bio !== undefined ? fullUser.bio : prev.bio,
            level: (fullUser.level !== undefined ? fullUser.level : prev.level) || "beginner",
            completedHikes: fullUser.completedHikes !== undefined ? fullUser.completedHikes : prev.completedHikes,
          };
        });
      }
    }
  }, [session?.user?.id]);

  // 登录
  const login = React.useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        return { success: false, error: result.error.message || copy.auth.loginError };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: copy.api.sessionExpired };
    }
  }, []);

  // 注册
  const register = React.useCallback(async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        bio: "新人户外爱好者，期待与你一起探索山野。",
        level: "beginner",
      });

      if (result.error) {
        // 处理常见错误
        const errorMessage = result.error.message || "";
        if (errorMessage.includes("already exists") || errorMessage.includes("已存在")) {
          return { success: false, error: copy.auth.emailTaken };
        }
        if (errorMessage.includes("password") || errorMessage.includes("密码")) {
          return { success: false, error: copy.auth.passwordTooShort };
        }
        return { success: false, error: errorMessage || copy.auth.registerErrorRetry };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: copy.api.sessionExpired };
    }
  }, []);

  // 登出
  const logout = React.useCallback(async () => {
    await authClient.signOut();
    setUser(null);
  }, []);

  const value = React.useMemo(() => ({
    user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  }), [user, isLoading, login, register, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
