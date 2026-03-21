import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * 使用 D1 绑定创建 Drizzle ORM 实例
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = ReturnType<typeof createDb>;
