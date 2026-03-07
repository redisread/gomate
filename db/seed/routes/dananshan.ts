/**
 * 大南山路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const dananshanRoutes = [
  {
    name: "大南山北山道线",
    slug: "dananshan-beishandao",
    description:
      "大南山最热门路线，全程约4公里。从北山道入口出发，路况良好，是观赏深圳湾日落的绝佳选择。",
    difficulty: "easy",
    durationMin: 90,
    durationMax: 120,
    distance: 4.0,
    elevation: 336,
    routeGuide: JSON.stringify({
      overview:
        "从北山道入口出发，沿盘山公路上山，可俯瞰深圳湾和香港元朗美景。",
      tips: [
        "傍晚可看日落",
        "夜景非常美",
        "交通便捷",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水"],
      warnings: ["周末人流较多", "夜间注意防滑"],
    }),
  },
  {
    name: "大南山海关登山道",
    slug: "dananshan-haiguan",
    description:
      "从海关登山道入口上山，全程约3.5公里。台阶路为主，爬升较快，适合想快速登顶的徒步者。",
    difficulty: "easy",
    durationMin: 60,
    durationMax: 90,
    distance: 3.5,
    elevation: 336,
    routeGuide: JSON.stringify({
      overview:
        "从海关登山道入口出发，沿台阶路快速登顶，然后可从另一侧下山。",
      tips: [
        "台阶路爬升快",
        "适合短时间徒步",
        "可欣赏前海景色",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水"],
      warnings: ["台阶较多，注意膝盖保护"],
    }),
  },
];

export function seedDananshanRoutes(
  db: Database,
  cities: CityData[],
  locations: LocationData[]
): RouteData[] {
  let shenzhenId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "440300") {
      shenzhenId = city.id;
      break;
    }
  }

  let locationId: string | undefined;
  for (const location of locations) {
    if (location.slug === "dananshan") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或大南山ID，跳过大南山路线数据插入");
    return [];
  }

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO routes (
      id, location_id, city_id, name, description, difficulty,
      duration_min, duration_max, distance, elevation, route_guide, extra,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const insertedRoutes: RouteData[] = [];

  for (const route of dananshanRoutes) {
    const id = nanoid();
    insertStmt.run(
      id,
      locationId,
      shenzhenId,
      route.name,
      route.description,
      route.difficulty,
      route.durationMin,
      route.durationMax,
      route.distance,
      route.elevation,
      route.routeGuide,
      route.extra,
      now,
      now
    );

    insertedRoutes.push({
      id,
      name: route.name,
      locationId,
    });
    console.log(`  ✓ ${route.name}`);
  }

  return insertedRoutes;
}
