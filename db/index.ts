import { drizzle } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import Database from "better-sqlite3";
import * as schema from "./schema";

// 是否使用本地 SQLite 数据库（当无法使用 D1 时的备用方案）
export const isLocalDb = process.env.USE_LOCAL_DB === "true";

// 本地 SQLite 数据库路径
const localDbPath = process.env.LOCAL_DB_PATH || "./local.db";

// 创建 drizzle 实例
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

if (isLocalDb) {
  // 本地 SQLite 模式（备用方案）
  const sqlite = new Database(localDbPath);
  dbInstance = drizzle(sqlite, { schema });
}

// 导出 drizzle 实例（D1 模式下为 undefined）
export const db = dbInstance;

/**
 * 创建 D1 数据库实例（用于 Cloudflare Workers/Pages 环境）
 * @param d1Database - Cloudflare D1 数据库绑定
 * @returns Drizzle ORM 实例
 */
export function createD1Client(d1Database: D1Database) {
  return drizzleD1(d1Database, { schema });
}

/**
 * 获取数据库实例（支持 D1 模式优先，本地模式为备选）
 * @param env - 环境变量（包含 D1 绑定）
 * @returns Drizzle ORM 实例
 */
export function getDB(env?: { DB?: D1Database }) {
  if (env?.DB) {
    // Cloudflare D1 模式（首选）
    return createD1Client(env.DB);
  }
  if (dbInstance) {
    // 本地 SQLite 模式（备选）
    return dbInstance;
  }
  // 如果没有配置任何数据库，抛出错误
  throw new Error("No database available. Please configure DB binding (D1) or local database (USE_LOCAL_DB=true).");
  // 提示：对于本地开发，推荐使用 `npm run cf:dev` 命令启动，它会自动配置本地 D1 模拟
}

// D1 数据库类型
export type DB = ReturnType<typeof getDB>;

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
