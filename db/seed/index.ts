/**
 * 数据库种子主入口
 * 按依赖顺序执行所有 seed 操作
 */

import type { Database } from "better-sqlite3";
import { seedCities } from "./cities";
import { seedLocations } from "./locations";
import { seedRoutes } from "./routes";
import { seedPois } from "./pois";
import { seedTags } from "./tags";
import { seedUsers } from "./users";
import { seedTeams } from "./teams";

// 动态导入 better-sqlite3 以避免 TypeScript 模块问题
async function getDatabase() {
  const { default: Database } = await import("better-sqlite3");
  return Database;
}

/**
 * 清空本地 miniflare KV 存储
 */
function clearLocalKV(): void {
  const fs = require("fs");
  const path = require("path");
  const glob = require("glob");

  const kvPath = "./.wrangler/state/v3/kv";
  if (fs.existsSync(kvPath)) {
    try {
      const files = glob.sync(`${kvPath}/**/*`, { nodir: true });
      for (const file of files) {
        fs.unlinkSync(file);
      }
      console.log("  ✓ 清空 miniflare KV 缓存");
    } catch (e) {
      // 忽略清理错误
    }
  }
}

/**
 * 查找本地数据库文件路径
 */
function findLocalDatabase(): string {
  const possiblePaths = [
    "./local.db",
    "./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite",
  ];

  // 首先检查显式路径
  const fs = require("fs");
  const path = require("path");
  const glob = require("glob");

  for (const dbPath of possiblePaths) {
    if (dbPath.includes("*")) {
      // 使用 glob 匹配
      const matches = glob.sync(dbPath);
      if (matches.length > 0) {
        return path.resolve(matches[0]);
      }
    } else if (fs.existsSync(dbPath)) {
      return path.resolve(dbPath);
    }
  }

  // 默认返回 local.db
  return path.resolve("./local.db");
}

/**
 * 清空所有数据表（保留表结构）
 */
function clearAllTables(db: Database): void {
  console.log("🧹 清空现有数据...\n");

  const tables = [
    "user_favorites",
    "entity_to_pois",
    "pois",
    "entity_to_tags",
    "tags",
    "team_members",
    "teams",
    "routes",
    "locations",
    "cities",
    "password_resets",
    "verifications",
    "accounts",
    "sessions",
    "users",
  ];

  // 清空 miniflare KV（Better Auth 用 KV 缓存 session，需要同步清理）
  clearLocalKV();

  for (const table of tables) {
    try {
      db.exec(`DELETE FROM ${table}`);
      console.log(`  ✓ 清空 ${table}`);
    } catch (e) {
      // 表可能不存在，忽略错误
    }
  }
  console.log();
}

/**
 * 主种子函数
 */
async function seed() {
  console.log("🌱 GoMate 数据库种子程序\n");
  console.log("=".repeat(40) + "\n");

  // 查找数据库路径
  const dbPath = findLocalDatabase();
  console.log(`📂 数据库路径: ${dbPath}\n`);

  // 动态导入并连接数据库
  const Database = await getDatabase();
  const db = new Database(dbPath) as Database;

  // 检查是否需要清空数据
  const shouldClear = process.argv.includes("--clear");
  if (shouldClear) {
    clearAllTables(db);
  }

  console.log("🚀 开始执行数据库种子...\n");

  try {
    // 按依赖顺序执行 seed
    // 1. 城市（无依赖）
    const cities = seedCities(db);

    // 2. 用户（无依赖）
    const users = await seedUsers(db);

    // 3. 地点（依赖城市）
    const locations = seedLocations(db, cities);

    // 4. 路线（依赖地点、城市）
    const routes = seedRoutes(db, cities, locations);

    // 5. POI（无依赖，但关联需要地点和路线）
    const pois = seedPois(db, locations, routes);

    // 6. 标签（无依赖，但关联需要地点和路线）
    const tags = seedTags(db, locations, routes);

    // 7. 队伍（依赖用户、地点、路线）
    const teams = seedTeams(db, users, locations, routes);

    console.log("=".repeat(40));
    console.log("\n✅ 数据库种子执行完成！");
    console.log(`\n📊 插入统计:`);
    console.log(`  • 城市: ${cities.length}`);
    console.log(`  • 用户: ${users.length}`);
    console.log(`  • 地点: ${locations.length}`);
    console.log(`  • 路线: ${routes.length}`);
    console.log(`  • POI: ${pois.length}`);
    console.log(`  • 标签: ${tags.length}`);
    console.log(`  • 队伍: ${teams.length}`);
    console.log();
  } catch (error) {
    console.error("\n❌ 种子执行失败:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// 执行种子
seed();
