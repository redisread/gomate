"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { copy } from "@/lib/copy";

export type UserRole = "user" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  nickname?: string;
  avatar: string;
  email: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  completedHikes: number;
  bio: string;
  wechat?: string;
  gender?: "male" | "female" | "other";
  birthday?: string | number;
  extra?: string; // JSON 字符串
  role: UserRole;
  status?: "active" | "suspended" | "banned" | "deleted";
  createdAt: string;
}

// 从 API 获取完整用户信息
async function fetchFullUserInfo(userId: string): Promise<{ user: Partial<AuthUser> | null; shouldLogout?: boolean }> {
  try {
    const response = await fetch(`/api/user?id=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      // 404 表示用户不存在（数据库被清空或用户被删除），应该登出
      if (response.status === 404) {
        console.log("[fetchFullUserInfo] User not found (404), will logout");
        return { user: null, shouldLogout: true };
      }
      console.error("[fetchFullUserInfo] Response not ok:", response.status);
      return { user: null };
    }
    const data = await response.json() as { user: Partial<AuthUser> };
    return { user: data.user };
  } catch (error) {
    console.error("[fetchFullUserInfo] Error:", error);
    return { user: null };
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
  isAdmin: boolean;
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
      const { user: fullUser, shouldLogout } = await fetchFullUserInfo(session.user.id);

      // 如果用户不存在（如数据库被清空），自动登出
      if (shouldLogout) {
        await authClient.signOut();
        setUser(null);
        return;
      }

      const authUser: AuthUser = {
        id: session.user.id,
        name: fullUser?.name !== undefined ? fullUser.name : session.user.name,
        nickname: fullUser?.nickname,
        avatar: fullUser?.avatar !== undefined ? fullUser.avatar : (session.user.image || DEFAULT_AVATAR),
        email: session.user.email,
        level: (fullUser?.level !== undefined ? fullUser.level : (session.user as unknown as { level?: AuthUser["level"] }).level) || "beginner",
        completedHikes: fullUser?.completedHikes !== undefined ? fullUser.completedHikes : ((session.user as unknown as { completedHikes?: number }).completedHikes || 0),
        bio: (fullUser?.bio != null && fullUser.bio !== "") ? fullUser.bio : "新人户外爱好者，期待与你一起探索山野。",
        wechat: fullUser?.wechat,
        gender: fullUser?.gender,
        birthday: fullUser?.birthday,
        extra: fullUser?.extra,
        role: (fullUser?.role !== undefined ? fullUser.role : (session.user as unknown as { role?: UserRole }).role) || "user",
        status: fullUser?.status || "active",
        createdAt: fullUser?.createdAt !== undefined ? fullUser.createdAt : createdAtStr,
      };
      setUser(authUser);
    } else {
      setUser(null);
    }
  }, [session]);

  // 当 session 变化时更新用户状态
  React.useEffect(() => {
    if (isPending) {
      setIsLoading(true);
      return;
    }
    const sync = async () => {
      await syncUserData();
      setIsLoading(false);
    };
    sync();
  }, [session, isPending, syncUserData]);

  // 手动刷新用户信息
  const refreshUser = React.useCallback(async () => {
    if (session?.user?.id) {
      // 强制从 API 获取最新数据
      const { user: fullUser, shouldLogout } = await fetchFullUserInfo(session.user.id);

      // 如果用户不存在，自动登出
      if (shouldLogout) {
        await authClient.signOut();
        setUser(null);
        return;
      }

      if (fullUser) {
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            name: fullUser.name !== undefined ? fullUser.name : prev.name,
            avatar: fullUser.avatar !== undefined ? fullUser.avatar : prev.avatar,
            bio: (fullUser.bio != null && fullUser.bio !== "") ? fullUser.bio : prev.bio,
            level: (fullUser.level !== undefined ? fullUser.level : prev.level) || "beginner",
            completedHikes: fullUser.completedHikes !== undefined ? fullUser.completedHikes : prev.completedHikes,
            wechat: fullUser.wechat !== undefined ? fullUser.wechat : prev.wechat,
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
    isAdmin: user?.role === "admin",
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
