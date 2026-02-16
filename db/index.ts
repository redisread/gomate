import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// 数据库连接字符串
const connectionString = process.env.DATABASE_URL!;

// 创建 postgres 客户端
const client = postgres(connectionString, { prepare: false });

// 创建 drizzle 实例
export const db = drizzle(client, { schema });

// 导出 schema
export * from "./schema";
