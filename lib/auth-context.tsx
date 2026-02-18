"use client";

import * as React from "react";

export interface User {
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
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "gomate_auth";
const USERS_KEY = "gomate_users";

// 生成唯一ID
function generateId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 默认头像
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face";

// 获取存储的用户列表
function getStoredUsers(): Array<{ email: string; password: string; user: User }> {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(USERS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

// 保存用户列表
function saveStoredUsers(users: Array<{ email: string; password: string; user: User }>) {
  if (typeof window !== "undefined") {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // 初始化时从 localStorage 加载登录状态
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
        } catch {
          setUser(null);
        }
      }
    }
    setIsLoading(false);
  }, []);

  // 登录
  const login = React.useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    const users = getStoredUsers();
    const found = users.find((u) => u.email === email && u.password === password);

    if (!found) {
      // 检查是否是默认测试账号
      if (email === "test@example.com" && password === "123456") {
        const testUser: User = {
          id: "user-test",
          name: "测试用户",
          avatar: DEFAULT_AVATAR,
          email: "test@example.com",
          level: "intermediate",
          completedHikes: 5,
          bio: "热爱户外，喜欢探索新的徒步路线。",
          createdAt: new Date().toISOString(),
        };
        setUser(testUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(testUser));
        return { success: true };
      }
      return { success: false, error: "邮箱或密码错误" };
    }

    setUser(found.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(found.user));
    return { success: true };
  }, []);

  // 注册
  const register = React.useCallback(async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    const users = getStoredUsers();

    // 检查邮箱是否已存在
    if (users.some((u) => u.email === email)) {
      return { success: false, error: "该邮箱已被注册" };
    }

    // 检查邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: "请输入有效的邮箱地址" };
    }

    // 检查密码长度
    if (password.length < 6) {
      return { success: false, error: "密码长度至少为6位" };
    }

    const newUser: User = {
      id: generateId(),
      name,
      avatar: DEFAULT_AVATAR,
      email,
      level: "beginner",
      completedHikes: 0,
      bio: "新人户外爱好者，期待与你一起探索山野。",
      createdAt: new Date().toISOString(),
    };

    // 保存新用户
    users.push({ email, password, user: newUser });
    saveStoredUsers(users);

    // 自动登录
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));

    return { success: true };
  }, []);

  // 登出
  const logout = React.useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
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
