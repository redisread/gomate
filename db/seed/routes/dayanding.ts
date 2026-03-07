/**
 * 大雁顶路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const dayandingRoutes = [
  {
    name: "大雁顶主峰线",
    slug: "dayanding-zhufeng",
    description:
      "大雁顶经典登山路线，全程约7公里。从鹿嘴山庄出发，登顶深圳第三高峰，可俯瞰大鹏湾壮丽海景。",
    difficulty: "hard",
    durationMin: 210,
    durationMax: 300,
    distance: 7.0,
    elevation: 801,
    routeGuide: JSON.stringify({
      overview:
        "从鹿嘴山庄出发，沿山脊步道攀登，途经多个观景平台，最终到达801米主峰。",
      tips: [
        "建议早出发，避开正午高温",
        "山顶风大，注意保暖",
        "可顺路游览美人鱼拍摄地",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "防晒霜", "充足水", "路餐"],
      warnings: ["全程无补给", "山路较陡", "雷雨天气禁止登山"],
    }),
  },
  {
    name: "鹿嘴山庄环线",
    slug: "dayanding-loop",
    description:
      "大雁顶休闲环线，全程约5公里。适合想轻松欣赏海景的徒步者，可顺路打卡美人鱼拍摄地。",
    difficulty: "moderate",
    durationMin: 120,
    durationMax: 180,
    distance: 5.0,
    elevation: 400,
    routeGuide: JSON.stringify({
      overview:
        "从鹿嘴山庄出发，沿海岸线步道行走，途经美人鱼洞，最后返回起点。",
      tips: [
        "可观赏美人鱼拍摄地",
        "海景非常壮观",
        "适合拍照打卡",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水", "防晒帽"],
      warnings: ["海边风大", "注意潮汐变化"],
    }),
  },
];

export function seedDayandingRoutes(
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
    if (location.slug === "dayanding") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或大雁顶ID，跳过大雁顶路线数据插入");
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

  for (const route of dayandingRoutes) {
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
