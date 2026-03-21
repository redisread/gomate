import { Hono } from "hono";
import type { TestDb } from "./db";

/**
 * 创建模拟 session 的 Better Auth 实例
 */
export function createMockAuth(sessionUser: { id: string; email: string; name: string } | null) {
  return {
    api: {
      getSession: async (_opts: unknown) => {
        if (!sessionUser) return null;
        return {
          user: sessionUser,
          session: { id: "test-session", userId: sessionUser.id, token: "test-token", expiresAt: new Date(Date.now() + 86400000) },
        };
      },
    },
  };
}

/**
 * 创建模拟 D1 数据库绑定（实际上使用 better-sqlite3 内存库）
 * 通过 Proxy 将 D1 API 调用转发到 drizzle 内存实例
 */
export function createMockD1(db: TestDb): D1Database {
  // 我们不真正需要 D1 接口，因为路由内部调用 createDb(c.env.DB)
  // 我们需要 mock createDb 函数本身
  return {} as D1Database;
}

/**
 * 创建测试用 Hono 环境绑定
 */
export interface TestEnv {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  APP_URL: string;
  FRONTEND_URL: string;
}

export function createTestEnv(db: TestDb): TestEnv {
  return {
    DB: createMockD1(db),
    BETTER_AUTH_SECRET: "test-secret-key-32-chars-minimum!!",
    APP_URL: "http://localhost:8799",
    FRONTEND_URL: "http://localhost:4321",
  };
}
