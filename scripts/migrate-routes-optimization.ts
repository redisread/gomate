/**
 * 路线表优化数据迁移脚本
 *
 * 功能：
 * 1. 解析 duration（"4-5小时" → durationMin: 240, durationMax: 300）
 * 2. 解析 distance（"8.5公里" → distance: 8.5）
 * 3. 解析 elevation（"869米" → elevation: 869）
 * 4. 构建 extra JSON（{ equipmentNeeded, warnings }）
 * 5. 解析 waypoints JSON 并插入 waypoints 表
 */

import Database from "better-sqlite3";
import { nanoid } from "nanoid";

const db = new Database(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite");

interface OldRoute {
  id: string;
  duration: string; // "4-5小时"
  distance: string; // "8.5公里"
  elevation: string | null; // "869米"
  equipmentNeeded: string | null; // JSON 数组
  warnings: string | null; // JSON 数组
  waypoints: string | null; // JSON 数组
}

interface Waypoint {
  name: string;
  lat: number;
  lng: number;
  description?: string;
}

/**
 * 解析时长字符串（如 "4-5小时"）
 * @returns [最短分钟数, 最长分钟数]
 */
function parseDuration(duration: string): [number, number] {
  // 移除空格和"小时"
  const cleaned = duration.replace(/\s/g, "").replace(/小时/g, "");

  // 匹配模式：4-5 或 4
  const rangeMatch = cleaned.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    return [parseInt(rangeMatch[1]) * 60, parseInt(rangeMatch[2]) * 60];
  }

  const singleMatch = cleaned.match(/^(\d+)$/);
  if (singleMatch) {
    const hours = parseInt(singleMatch[1]);
    return [hours * 60, hours * 60];
  }

  // 默认返回 4-5 小时
  console.warn(`无法解析时长: ${duration}，使用默认值 4-5 小时`);
  return [240, 300];
}

/**
 * 解析距离字符串（如 "8.5公里"）
 * @returns 距离（公里）
 */
function parseDistance(distance: string): number {
  const cleaned = distance.replace(/\s/g, "").replace(/公里/g, "");
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    console.warn(`无法解析距离: ${distance}，使用默认值 8.0`);
    return 8.0;
  }

  return parsed;
}

/**
 * 解析海拔字符串（如 "869米"）
 * @returns 海拔（米）
 */
function parseElevation(elevation: string | null): number | null {
  if (!elevation) return null;

  const cleaned = elevation.replace(/\s/g, "").replace(/米/g, "");
  const parsed = parseInt(cleaned);

  if (isNaN(parsed)) {
    console.warn(`无法解析海拔: ${elevation}，返回 null`);
    return null;
  }

  return parsed;
}

/**
 * 主迁移函数
 */
function migrate() {
  console.log("开始迁移路线数据...\n");

  // 1. 读取所有 routes 数据
  const routes = db.prepare(`
    SELECT id, duration, distance, elevation, equipment_needed, warnings, waypoints
    FROM routes
  `).all() as OldRoute[];

  console.log(`找到 ${routes.length} 条路线记录\n`);

  // 2. 开始事务
  const transaction = db.transaction(() => {
    for (const route of routes) {
      console.log(`处理路线: ${route.id}`);

      // 解析字段
      const [durationMin, durationMax] = parseDuration(route.duration);
      const distance = parseDistance(route.distance);
      const elevation = parseElevation(route.elevation);

      // 构建 extra JSON
      const extra: { equipmentNeeded?: string[]; warnings?: string[] } = {};
      if (route.equipmentNeeded) {
        try {
          extra.equipmentNeeded = JSON.parse(route.equipmentNeeded);
        } catch (e) {
          console.warn(`  - 解析 equipmentNeeded 失败: ${route.equipmentNeeded}`);
        }
      }
      if (route.warnings) {
        try {
          extra.warnings = JSON.parse(route.warnings);
        } catch (e) {
          console.warn(`  - 解析 warnings 失败: ${route.warnings}`);
        }
      }

      const extraJson = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;

      console.log(`  - 时长: ${durationMin}-${durationMax} 分钟`);
      console.log(`  - 距离: ${distance} 公里`);
      console.log(`  - 海拔: ${elevation} 米`);

      // 更新 routes 表（先更新新字段）
      db.prepare(`
        UPDATE routes
        SET duration_min = ?, duration_max = ?, distance = ?, elevation = ?, extra = ?
        WHERE id = ?
      `).run(durationMin, durationMax, distance, elevation, extraJson, route.id);

      // 处理 waypoints
      if (route.waypoints) {
        try {
          const waypoints: Waypoint[] = JSON.parse(route.waypoints);
          console.log(`  - 插入 ${waypoints.length} 个途径点`);

          waypoints.forEach((wp, index) => {
            const waypointId = nanoid();
            const coordinates = JSON.stringify({ lat: wp.lat, lng: wp.lng });
            const now = Math.floor(Date.now() / 1000);

            db.prepare(`
              INSERT INTO waypoints (id, route_id, name, description, coordinates, "order", created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              waypointId,
              route.id,
              wp.name,
              wp.description || null,
              coordinates,
              index,
              now,
              now
            );
          });
        } catch (e) {
          console.warn(`  - 解析 waypoints 失败: ${e}`);
        }
      }

      console.log("");
    }
  });

  // 执行事务
  try {
    transaction();
    console.log("✅ 数据迁移成功！\n");
  } catch (error) {
    console.error("❌ 数据迁移失败:", error);
    process.exit(1);
  }

  // 3. 验证数据
  console.log("验证迁移结果...");

  const nullDurationCount = db.prepare(`
    SELECT COUNT(*) as count FROM routes WHERE duration_min IS NULL OR duration_max IS NULL
  `).get() as { count: number };

  const nullDistanceCount = db.prepare(`
    SELECT COUNT(*) as count FROM routes WHERE distance IS NULL
  `).get() as { count: number };

  const waypointCount = db.prepare(`
    SELECT COUNT(*) as count FROM waypoints
  `).get() as { count: number };

  console.log(`- 空 duration 记录数: ${nullDurationCount.count} (应为 0)`);
  console.log(`- 空 distance 记录数: ${nullDistanceCount.count} (应为 0)`);
  console.log(`- waypoints 总数: ${waypointCount.count}`);

  if (nullDurationCount.count === 0 && nullDistanceCount.count === 0) {
    console.log("\n✅ 验证通过！");
  } else {
    console.log("\n⚠️  发现异常数据，请检查！");
  }
}

// 执行迁移
migrate();
db.close();
