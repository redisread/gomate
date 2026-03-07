/**
 * 莲花山路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const lianhuashanRoutes = [
  {
    name: "莲花山主峰线",
    slug: "lianhuashan-zhufeng",
    description:
      "莲花山最经典路线，全程约2公里。从南门沿缓坡步道登顶，山顶有邓小平铜像，可俯瞰整个福田中心区。",
    difficulty: "easy",
    durationMin: 30,
    durationMax: 60,
    distance: 2.0,
    elevation: 106,
    routeGuide: JSON.stringify({
      overview:
        "从南门入口出发，沿缓坡步道轻松登顶，参观邓小平铜像和山顶广场。",
      tips: [
        "地势平缓，适合老人小孩",
        "山顶可俯瞰福田CBD",
        "风筝广场可放风筝",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水"],
      warnings: ["节假日人流量极大", "注意保管随身物品"],
    }),
  },
  {
    name: "莲花山环湖线",
    slug: "lianhuashan-huhuan",
    description:
      "环绕莲花山湖边的休闲路线，全程约3公里。地势平坦，适合散步、慢跑和家庭休闲。",
    difficulty: "easy",
    durationMin: 45,
    durationMax: 75,
    distance: 3.0,
    elevation: 50,
    routeGuide: JSON.stringify({
      overview:
        "从风筝广场出发，环绕莲花山湖一周，欣赏城市中心的湖光山色。",
      tips: [
        "地势平坦，适合散步",
        "湖边风景优美",
        "适合带孩子游玩",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水"],
      warnings: ["人多时注意看好孩子"],
    }),
  },
];

export function seedLianhuashanRoutes(
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
    if (location.slug === "lianhuashan") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或莲花山ID，跳过莲花山路线数据插入");
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

  for (const route of lianhuashanRoutes) {
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
