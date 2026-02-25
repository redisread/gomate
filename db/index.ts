import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * 创建 D1 数据库实例（用于 Cloudflare Workers/Pages 环境）
 * @param d1Database - Cloudflare D1 数据库绑定
 * @returns Drizzle ORM 实例
 */
export function createD1Client(d1Database: D1Database) {
  return drizzleD1(d1Database, { schema });
}

/**
 * 获取数据库实例
 * - 传入 env 时直接使用 D1 绑定
 * - 不传入时通过 getCloudflareContext() 自动获取 D1 绑定（适用于 Server Actions）
 * @param env - 环境变量（包含 D1 绑定）
 * @returns Drizzle ORM 实例
 */
export async function getDB(env?: { DB?: D1Database }) {
  if (env?.DB) {
    return createD1Client(env.DB);
  }
  // 自动从 Cloudflare context 获取 D1 绑定（next dev + initOpenNextCloudflareForDev 或 wrangler dev）
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env: cfEnv } = await getCloudflareContext();
  if (!cfEnv.DB) {
    throw new Error("D1 database binding not found. Make sure wrangler.toml has D1 binding configured.");
  }
  return createD1Client(cfEnv.DB as D1Database);
}

// D1 数据库类型
export type DB = ReturnType<typeof createD1Client>;

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
