#!/usr/bin/env tsx

/**
 * 验证脚本：检查 facilities 迁移结果
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { locations } from "../db/schema";
import * as schema from "../db/schema";
import { glob } from "glob";

interface LocationExtra {
  facilities?: string[];
  tips?: string;
  warnings?: string[];
}

async function findD1DatabasePath(): Promise<string> {
  const pattern = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite";
  const files = await glob(pattern);

  if (files.length === 0) {
    throw new Error("未找到本地 D1 数据库文件");
  }

  return files[0];
}

async function verifyMigration() {
  console.log("🔍 开始验证 facilities 迁移结果...\n");

  try {
    const dbPath = await findD1DatabasePath();
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite, { schema });

    const allLocations = await db.select().from(locations);
    console.log(`📊 检查 ${allLocations.length} 条地点记录\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const location of allLocations) {
      if (!location.extra) {
        console.log(`⚠️  [${location.name}] - extra 字段为空`);
        continue;
      }

      try {
        const extra: LocationExtra = JSON.parse(location.extra);

        if (!extra.facilities) {
          console.log(`⚠️  [${location.name}] - 没有 facilities 字段`);
          continue;
        }

        if (Array.isArray(extra.facilities)) {
          console.log(
            `✅ [${location.name}] - facilities 格式正确: ${JSON.stringify(extra.facilities)}`
          );
          successCount++;
        } else {
          console.log(
            `❌ [${location.name}] - facilities 仍是对象格式: ${JSON.stringify(extra.facilities)}`
          );
          errorCount++;
        }
      } catch (e) {
        console.error(`❌ [${location.name}] - 解析 extra 失败:`, e);
        errorCount++;
      }
    }

    sqlite.close();

    console.log("\n📈 验证结果:");
    console.log(`   ✅ 格式正确: ${successCount} 条`);
    console.log(`   ❌ 格式错误: ${errorCount} 条\n`);

    if (errorCount === 0) {
      console.log("🎉 所有数据迁移成功！");
    } else {
      console.log("⚠️  部分数据迁移失败，请检查");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ 验证脚本执行失败:", error);
    process.exit(1);
  }
}

verifyMigration();
