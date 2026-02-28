/// <reference types="@cloudflare/workers-types" />

import { D1Database } from "../db";

/**
 * Cloudflare Workers / Pages 环境变量类型定义
 */
export interface CloudflareEnv {
  /** D1 数据库绑定 */
  DB: D1Database;
  /** R2 存储桶绑定 */
  R2?: R2Bucket;
  /** KV 命名空间，用于缓存 session（可选，缺失时自动降级） */
  GOMATE_KV?: KVNamespace;
  /** Better Auth 密钥 */
  BETTER_AUTH_SECRET: string;
  /** Better Auth URL */
  BETTER_AUTH_URL?: string;
}

/**
 * Next.js 运行时环境变量
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /** 使用本地数据库 */
      USE_LOCAL_DB?: string;
      /** 本地数据库路径 */
      LOCAL_DB_PATH?: string;
      /** Cloudflare 账号 ID */
      CLOUDFLARE_ACCOUNT_ID?: string;
      /** Cloudflare 数据库 ID */
      CLOUDFLARE_DATABASE_ID?: string;
      /** Cloudflare D1 Token */
      CLOUDFLARE_D1_TOKEN?: string;
      /** Better Auth 密钥 */
      BETTER_AUTH_SECRET?: string;
      /** Better Auth URL */
      BETTER_AUTH_URL?: string;
      /** 应用公共 URL */
      NEXT_PUBLIC_APP_URL?: string;
    }
  }

  /**
   * Cloudflare Workers 运行时全局变量
   */
  interface Env extends CloudflareEnv {}
}

export {};
