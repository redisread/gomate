"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import type { User } from "@/db/schema";

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

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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

  // 当 session 变化时更新用户状态
  React.useEffect(() => {
    if (session?.user) {
      const authUser: AuthUser = {
        id: session.user.id,
        name: session.user.name,
        avatar: session.user.image || DEFAULT_AVATAR,
        email: session.user.email,
        level: (session.user.experience as AuthUser["level"]) || "beginner",
        completedHikes: 0, // 从其他数据源获取
        bio: session.user.bio || "新人户外爱好者，期待与你一起探索山野。",
        createdAt: session.user.createdAt?.toISOString() || new Date().toISOString(),
      };
      setUser(authUser);
    } else {
      setUser(null);
    }
    setIsLoading(isPending);
  }, [session, isPending]);

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
        return { success: false, error: result.error.message || "邮箱或密码错误" };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: "登录失败，请稍后重试" };
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
        experience: "beginner",
      });

      if (result.error) {
        // 处理常见错误
        const errorMessage = result.error.message || "";
        if (errorMessage.includes("already exists") || errorMessage.includes("已存在")) {
          return { success: false, error: "该邮箱已被注册" };
        }
        if (errorMessage.includes("password") || errorMessage.includes("密码")) {
          return { success: false, error: "密码长度至少为6位" };
        }
        return { success: false, error: errorMessage || "注册失败，请稍后重试" };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: "注册失败，请稍后重试" };
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
    isAuthenticated: !!user,
  }), [user, isLoading, login, register, logout]);

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
