/**
 * 东西涌路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const dongxichongRoutes = [
  {
    name: "东西涌海岸线穿越",
    slug: "dongxichong-coastal",
    description:
      "中国最美八大海岸线穿越路线，全程约6公里。沿途可欣赏海蚀地貌、奇特礁石和清澈海水，是深圳最经典的海岸徒步线路。",
    difficulty: "moderate",
    durationMin: 180,
    durationMax: 300,
    distance: 6.0,
    elevation: 200,
    routeGuide: JSON.stringify({
      overview:
        "从东涌沙滩出发，沿海岸线礁石向西涌方向穿越，中途需翻越5个山头，部分路段需要攀爬。",
      tips: [
        "穿防滑鞋，带手套",
        "提前查询潮汐时间",
        "带足饮用水（至少2L）",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["防滑登山鞋", "手套", "防晒用品", "充足水"],
      warnings: ["注意潮汐变化", "部分路段需要在礁石上攀爬", "建议结伴而行"],
    }),
  },
  {
    name: "东涌环线",
    slug: "dongchong-loop",
    description:
      "东涌周边休闲路线，适合不想走完整穿越的朋友。沿途风景优美，难度较低。",
    difficulty: "easy",
    durationMin: 90,
    durationMax: 150,
    distance: 4.0,
    elevation: 150,
    routeGuide: JSON.stringify({
      overview:
        "从东涌沙滩出发，沿山路绕行一小段后返回，适合家庭休闲。",
      tips: [
        "路线轻松",
        "可在东涌沙滩游玩",
        "适合新手",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水"],
      warnings: ["注意防晒"],
    }),
  },
];

export function seedDongxichongRoutes(
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
    if (location.slug === "dongxichong") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或东西涌ID，跳过东西涌路线数据插入");
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

  for (const route of dongxichongRoutes) {
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
