import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

// 是否使用 mock 数据模式（开发环境可用）
export const isMockMode = process.env.USE_MOCK_DATA === "true";

// 是否使用本地 SQLite 数据库
export const isLocalDb = process.env.USE_LOCAL_DB === "true";

// 本地 SQLite 数据库路径
const localDbPath = process.env.LOCAL_DB_PATH || "./local.db";

// 创建 drizzle 实例
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

if (!isMockMode && isLocalDb) {
  // 本地 SQLite 模式
  const sqlite = new Database(localDbPath);
  dbInstance = drizzle(sqlite, { schema });
}

// 导出 drizzle 实例（mock 模式或远程 D1 模式下为 undefined）
export const db = dbInstance;

// D1 数据库绑定类型（用于 Cloudflare Workers 环境）
export interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
  dump: () => Promise<ArrayBuffer>;
  batch: <T = unknown>(statements: D1PreparedStatement[]) => Promise<T[]>;
  exec: (query: string) => Promise<{ count: number; duration: number }>;
}

export interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = unknown>(colName?: string) => Promise<T | null>;
  run: <T = unknown>() => Promise<D1Result<T>>;
  all: <T = unknown>() => Promise<D1Results<T>>;
  raw: <T = unknown>() => Promise<T[]>;
}

export interface D1Result<T> {
  results?: T;
  success: boolean;
  error?: string;
  meta: {
    last_row_id: number;
    changes: number;
    duration: number;
  };
}

export interface D1Results<T> {
  results: T[];
  success: boolean;
  error?: string;
  meta: {
    last_row_id: number;
    changes: number;
    duration: number;
  };
}

// 导出 schema
export * from "./schema";
