#!/usr/bin/env tsx

/**
 * 数据迁移脚本：将 locations.extra.facilities 从对象格式转为数组格式
 *
 * 迁移前格式：{ parking: true, restroom: true, water: false, food: false }
 * 迁移后格式：["parking", "restroom"]
 *
 * 使用方法：
 *   npm run tsx scripts/migrate-facilities-to-array.ts
 */

import { getDB } from "../db";
import { locations } from "../db/schema";
import { sql } from "drizzle-orm";

interface FacilitiesObject {
  parking?: boolean;
  restroom?: boolean;
  water?: boolean;
  food?: boolean;
}

interface LocationExtra {
  facilities?: FacilitiesObject | string[];
  tips?: string;
  warnings?: string[];
}

async function migrateFacilitiesToArray() {
  console.log("🚀 开始迁移 facilities 字段...\n");

  try {
    const db = await getDB();

    // 获取所有地点
    const allLocations = await db.select().from(locations);
    console.log(`📊 找到 ${allLocations.length} 条地点记录\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const location of allLocations) {
      try {
        // 解析 extra 字段
        if (!location.extra) {
          console.log(`⏭️  跳过 [${location.name}] - extra 字段为空`);
          skippedCount++;
          continue;
        }

        let extra: LocationExtra;
        try {
          extra = JSON.parse(location.extra);
        } catch (e) {
          console.error(`❌ [${location.name}] - 无法解析 extra JSON:`, e);
          errorCount++;
          continue;
        }

        // 检查 facilities 格式
        if (!extra.facilities) {
          console.log(`⏭️  跳过 [${location.name}] - 没有 facilities 字段`);
          skippedCount++;
          continue;
        }

        // 如果已经是数组格式，跳过
        if (Array.isArray(extra.facilities)) {
          console.log(`✅ [${location.name}] - facilities 已是数组格式，跳过`);
          skippedCount++;
          continue;
        }

        // 转换对象格式为数组格式
        const facilitiesObj = extra.facilities as FacilitiesObject;
        const facilitiesArray: string[] = [];

        if (facilitiesObj.parking === true) facilitiesArray.push("parking");
        if (facilitiesObj.restroom === true) facilitiesArray.push("restroom");
        if (facilitiesObj.water === true) facilitiesArray.push("water");
        if (facilitiesObj.food === true) facilitiesArray.push("food");

        // 更新 extra 字段
        const updatedExtra: LocationExtra = {
          ...extra,
          facilities: facilitiesArray,
        };

        // 写回数据库
        await db
          .update(locations)
          .set({ extra: JSON.stringify(updatedExtra) })
          .where(sql`id = ${location.id}`);

        console.log(
          `✅ [${location.name}] - 迁移成功: ${JSON.stringify(facilitiesObj)} → ${JSON.stringify(facilitiesArray)}`
        );
        migratedCount++;
      } catch (error) {
        console.error(`❌ [${location.name}] - 迁移失败:`, error);
        errorCount++;
      }
    }

    console.log("\n📈 迁移统计:");
    console.log(`   ✅ 成功迁移: ${migratedCount} 条`);
    console.log(`   ⏭️  跳过: ${skippedCount} 条`);
    console.log(`   ❌ 失败: ${errorCount} 条`);
    console.log(`   📊 总计: ${allLocations.length} 条\n`);

    if (errorCount === 0) {
      console.log("🎉 迁移完成！");
    } else {
      console.log("⚠️  迁移完成，但有部分失败，请检查错误日志");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ 迁移脚本执行失败:", error);
    process.exit(1);
  }
}

// 执行迁移
migrateFacilitiesToArray();
