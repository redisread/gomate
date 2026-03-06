/**
 * 更新路线数据脚本
 * 根据路线名称设置合理的时长、距离、海拔数据
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

// 查找数据库文件
const dbDir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const files = fs.readdirSync(dbDir).filter((f) => f.endsWith(".sqlite"));
if (files.length === 0) {
  console.error("未找到数据库文件");
  process.exit(1);
}

const dbPath = path.join(dbDir, files[0]);
console.log(`使用数据库: ${dbPath}\n`);

const db = new Database(dbPath);

// 路线数据映射（根据深圳常见徒步路线设置）
const routesData: Record<
  string,
  {
    durationMin: number; // 分钟
    durationMax: number;
    distance: number; // 公里
    elevation: number | null; // 米
    equipmentNeeded?: string[];
    warnings?: string[];
  }
> = {
  route_qiniangshan: {
    durationMin: 360, // 6小时
    durationMax: 480, // 8小时
    distance: 12.0,
    elevation: 869,
    equipmentNeeded: ["登山鞋", "登山杖", "充足的水", "防晒用品"],
    warnings: ["路线较长，注意体力分配", "夏季注意防晒防暑"],
  },
  route_wutongshan: {
    durationMin: 240, // 4小时
    durationMax: 360, // 6小时
    distance: 10.0,
    elevation: 944,
    equipmentNeeded: ["登山鞋", "登山杖", "水"],
    warnings: ["山顶气温较低，注意保暖", "雨天路滑注意安全"],
  },
  route_dongxichong: {
    durationMin: 300, // 5小时
    durationMax: 420, // 7小时
    distance: 8.0,
    elevation: 200,
    equipmentNeeded: ["徒步鞋", "防晒用品", "泳衣"],
    warnings: ["注意防晒", "海边注意安全"],
  },
  route_maluanshan: {
    durationMin: 180, // 3小时
    durationMax: 240, // 4小时
    distance: 6.5,
    elevation: 590,
    equipmentNeeded: ["运动鞋", "水"],
    warnings: ["适合新手", "注意补水"],
  },
  route_tanglangshan: {
    durationMin: 120, // 2小时
    durationMax: 180, // 3小时
    distance: 5.0,
    elevation: 430,
    equipmentNeeded: ["运动鞋", "水"],
    warnings: ["适合新手", "人流较多"],
  },
  route_niunaipai: {
    durationMin: 240, // 4小时
    durationMax: 300, // 5小时
    distance: 8.0,
    elevation: 600,
    equipmentNeeded: ["登山鞋", "登山杖", "水"],
    warnings: ["有溯溪路段，注意防滑", "雨后不建议前往"],
  },
  route_yangtaishan: {
    durationMin: 180, // 3小时
    durationMax: 240, // 4小时
    distance: 7.0,
    elevation: 587,
    equipmentNeeded: ["运动鞋", "水"],
    warnings: ["适合中等强度徒步"],
  },
  route_fenghuangshan: {
    durationMin: 120, // 2小时
    durationMax: 180, // 3小时
    distance: 5.5,
    elevation: 376,
    equipmentNeeded: ["运动鞋", "水"],
    warnings: ["适合新手", "有寺庙可参观"],
  },
  route_paiyashan: {
    durationMin: 300, // 5小时
    durationMax: 420, // 7小时
    distance: 10.0,
    elevation: 707,
    equipmentNeeded: ["登山鞋", "登山杖", "充足的水"],
    warnings: ["路线较为陡峭", "注意体力分配"],
  },
  route_tianxinshan: {
    durationMin: 120, // 2小时
    durationMax: 150, // 2.5小时
    distance: 4.0,
    elevation: 195,
    equipmentNeeded: ["运动鞋", "水"],
    warnings: ["适合新手", "路线较短"],
  },
  route_yangtaishan2: {
    durationMin: 150, // 2.5小时
    durationMax: 210, // 3.5小时
    distance: 6.0,
    elevation: 448,
    equipmentNeeded: ["运动鞋", "水"],
    warnings: ["适合休闲徒步"],
  },
  route_bijiasan: {
    durationMin: 90, // 1.5小时
    durationMax: 120, // 2小时
    distance: 3.5,
    elevation: 178,
    equipmentNeeded: ["运动鞋", "水"],
    warnings: ["适合新手", "市区公园"],
  },
  route_dananshan: {
    durationMin: 90, // 1.5小时
    durationMax: 120, // 2小时
    distance: 4.0,
    elevation: 336,
    equipmentNeeded: ["运动鞋", "水"],
    warnings: ["适合新手", "观景好地方"],
  },
  route_qiushuishan: {
    durationMin: 150, // 2.5小时
    durationMax: 210, // 3.5小时
    distance: 6.0,
    elevation: 253,
    equipmentNeeded: ["运动鞋", "水"],
    warnings: ["适合休闲徒步"],
  },
};

console.log("开始更新路线数据...\n");

const transaction = db.transaction(() => {
  for (const [routeId, data] of Object.entries(routesData)) {
    console.log(`更新路线: ${routeId}`);

    // 构建 extra JSON
    const extra: { equipmentNeeded?: string[]; warnings?: string[] } = {};
    if (data.equipmentNeeded) {
      extra.equipmentNeeded = data.equipmentNeeded;
    }
    if (data.warnings) {
      extra.warnings = data.warnings;
    }
    const extraJson = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;

    console.log(`  - 时长: ${data.durationMin}-${data.durationMax} 分钟`);
    console.log(`  - 距离: ${data.distance} 公里`);
    console.log(`  - 海拔: ${data.elevation} 米`);

    db.prepare(`
      UPDATE routes
      SET duration_min = ?, duration_max = ?, distance = ?, elevation = ?, extra = ?
      WHERE id = ?
    `).run(
      data.durationMin,
      data.durationMax,
      data.distance,
      data.elevation,
      extraJson,
      routeId
    );

    console.log("");
  }
});

try {
  transaction();
  console.log("✅ 路线数据更新成功！\n");
} catch (error) {
  console.error("❌ 更新失败:", error);
  process.exit(1);
}

// 验证数据
console.log("验证更新结果...");

const routes = db
  .prepare(
    `
  SELECT id, name, duration_min, duration_max, distance, elevation
  FROM routes
  ORDER BY id
`
  )
  .all();

console.log("\n路线数据概览:");
console.log("ID\t\t\t名称\t\t时长(分钟)\t距离(km)\t海拔(m)");
console.log("-".repeat(80));
for (const route of routes as any[]) {
  console.log(
    `${route.id.padEnd(25)}\t${route.name.padEnd(15)}\t${route.duration_min}-${route.duration_max}\t\t${route.distance}\t\t${route.elevation || "N/A"}`
  );
}

console.log("\n✅ 验证完成！");

db.close();
