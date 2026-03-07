/**
 * 七娘山路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const qiniangshanRoutes = [
  {
    name: "七娘山主峰环线",
    slug: "qiniangshan-zhufeng",
    description:
      "七娘山经典登山路线，全程约8公里。沿途经过七座山峰，山势险峻，可俯瞰大鹏半岛壮丽海景。",
    difficulty: "hard",
    durationMin: 240,
    durationMax: 360,
    distance: 8.0,
    elevation: 869,
    routeGuide: JSON.stringify({
      overview:
        "从七娘山登山口出发，经一号峰至七号峰，最终到达主峰。全程山野路，需要一定户外经验。",
      tips: [
        "建议早出发，带足水和食物",
        "山顶风大，注意保暖",
        "部分路段需要手脚并用",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "手套", "防晒霜", "头灯"],
      warnings: ["全程无补给", "雷雨天气禁止登山", "建议结伴而行"],
    }),
  },
  {
    name: "七娘山科考线",
    slug: "qiniangshan-kaohexian",
    description:
      "地质科考路线，沿途可观赏火山岩地貌和古生物化石。路线相对平缓，适合亲子科普游。",
    difficulty: "moderate",
    durationMin: 180,
    durationMax: 240,
    distance: 6.0,
    elevation: 600,
    routeGuide: JSON.stringify({
      overview:
        "从国家地质公园博物馆出发，沿科考步道上山，途经多个地质观测点。",
      tips: [
        "可参观地质博物馆",
        "沿途有解说牌",
        "适合带小朋友",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水", "防晒帽"],
      warnings: ["注意保护地质遗迹，勿采集标本"],
    }),
  },
];

export function seedQiniangshanRoutes(
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
    if (location.slug === "qiniang-mountain") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或七娘山ID，跳过七娘山路线数据插入");
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

  for (const route of qiniangshanRoutes) {
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
