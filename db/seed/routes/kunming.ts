/**
 * 昆明西山路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const kunmingRoutes = [
  {
    name: "西山龙门线",
    description: "从西山公园入口经华亭寺、太华寺到龙门石窟的经典登山线路，可俯瞰滇池全景。",
    difficulty: "moderate",
    durationMin: 120,
    durationMax: 180,
    distance: 4.5,
    elevation: 400,
    routeGuide: JSON.stringify({
      overview: "从西山公园入口出发，经华亭寺、太华寺到达龙门石窟，可俯瞰滇池全景。",
      tips: ["前半段较平缓", "龙门石窟是精华", "可乘坐环保车上山"],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["舒适运动鞋", "饮用水", "防晒用品"],
      warnings: ["节假日人流较大"],
    }),
  },
  {
    name: "西山全景穿越线",
    description: "从猫猫箐出发，穿越西山全山，途经聂耳墓、龙门、小石林，到达猫猫箐出口。",
    difficulty: "hard",
    durationMin: 240,
    durationMax: 360,
    distance: 8.0,
    elevation: 650,
    routeGuide: JSON.stringify({
      overview: "穿越西山全山，途经多个景点，适合有一定体能的登山者。",
      tips: ["需要较好体力", "沿途风景优美", "建议早出发"],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "充足水和食物"],
      warnings: ["路程较长，注意时间规划"],
    }),
  },
  {
    name: "西山索道上山徒步线",
    description: "乘坐索道上山，从龙门开始徒步游览，适合体力有限的游客。",
    difficulty: "easy",
    durationMin: 90,
    durationMax: 150,
    distance: 2.5,
    elevation: 150,
    routeGuide: JSON.stringify({
      overview: "索道上山，轻松游览龙门核心景区。",
      tips: ["适合全家出游", "节省时间体力", "精华景点全覆盖"],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["舒适鞋子", "饮用水"],
      warnings: ["索道需另外购票"],
    }),
  },
];

export function seedKunmingRoutes(
  db: Database,
  cities: CityData[],
  locations: LocationData[]
): RouteData[] {
  // 获取昆明城市ID
  let kunmingCityId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "530100") {
      kunmingCityId = city.id;
      break;
    }
  }

  // 获取昆明西山地点ID
  let xishanId: string | undefined;
  for (const location of locations) {
    if (location.slug === "kunming-xishan") {
      xishanId = location.id;
      break;
    }
  }

  if (!kunmingCityId || !xishanId) {
    console.warn("⚠️  未找到昆明或西山ID，跳过昆明路线数据插入");
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

  for (const route of kunmingRoutes) {
    const id = nanoid();
    insertStmt.run(
      id,
      xishanId,
      kunmingCityId,
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
      locationId: xishanId,
    });
    console.log(`  ✓ ${route.name}`);
  }

  return insertedRoutes;
}
