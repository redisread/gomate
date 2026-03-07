/**
 * 大笔架山路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const dabijiashanRoutes = [
  {
    name: "大笔架山三水线",
    slug: "dabijiashan-sanshuixian",
    description:
      "深圳经典三水线的重要组成部分，全程约8公里。山势起伏，挑战性强，是户外爱好者的必修课。",
    difficulty: "hard",
    durationMin: 240,
    durationMax: 360,
    distance: 8.0,
    elevation: 717,
    routeGuide: JSON.stringify({
      overview:
        "从葵涌出发，经大笔架山主峰，体验深圳最经典的山脊穿越路线之一。",
      tips: [
        "需要较好体能",
        "建议早出发",
        "带足水和食物",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "护膝", "充足水", "路餐", "头灯"],
      warnings: ["路线较长", "全程无补给", "需要一定户外经验"],
    }),
  },
  {
    name: "大笔架山环线",
    slug: "dabijiashan-loop",
    description:
      "大笔架山休闲环线，全程约6公里。路况相对平缓，适合中级户外爱好者。",
    difficulty: "moderate",
    durationMin: 180,
    durationMax: 240,
    distance: 6.0,
    elevation: 600,
    routeGuide: JSON.stringify({
      overview:
        "从葵涌入口出发，环绕大笔架山一周，欣赏原始生态风光。",
      tips: [
        "原始生态保持完好",
        "路况相对平缓",
        "适合周末挑战",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "饮用水", "路餐"],
      warnings: ["部分路段标识不清", "建议下载轨迹"],
    }),
  },
];

export function seedDabijiashanRoutes(
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
    if (location.slug === "dabijiashan") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或大笔架山ID，跳过大笔架山路线数据插入");
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

  for (const route of dabijiashanRoutes) {
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
