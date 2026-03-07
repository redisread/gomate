/**
 * 马峦山路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const maluanshanRoutes = [
  {
    name: "马峦山瀑布线",
    slug: "maluanshan-pubu",
    description:
      "马峦山经典瀑布观赏路线，全程约6公里。沿途可欣赏深圳最大瀑布群，夏季水量充沛时最为壮观。",
    difficulty: "easy",
    durationMin: 120,
    durationMax: 180,
    distance: 6.0,
    elevation: 400,
    routeGuide: JSON.stringify({
      overview:
        "从小梅沙或坪山入口出发，沿溪谷步道前行，途经多个瀑布点，最终到达大瀑布。",
      tips: [
        "雨季瀑布更壮观",
        "可在马峦山村吃农家菜",
        "路况平缓，适合亲子",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["防滑鞋", "饮用水", "防蚊液"],
      warnings: ["雨后路滑注意安全", "溪边玩耍注意安全", "保护环境勿乱丢垃圾"],
    }),
  },
  {
    name: "马峦山大环线",
    slug: "maluanshan-loop",
    description:
      "环绕马峦山的完整路线，约10公里。途经瀑布群、古村、水库等多个景点，体验丰富。",
    difficulty: "moderate",
    durationMin: 240,
    durationMax: 300,
    distance: 10.0,
    elevation: 600,
    routeGuide: JSON.stringify({
      overview:
        "从坪山入口出发，经大瀑布、马峦山村、红花岭水库，最后返回起点。",
      tips: [
        "路线较长，需带足补给",
        "可在村里吃农家鸡",
        "水库风景优美",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "充足水", "路餐"],
      warnings: ["部分路段标识不清", "建议下载轨迹"],
    }),
  },
];

export function seedMaluanshanRoutes(
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
    if (location.slug === "maluan-mountain") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或马峦山ID，跳过马峦山路线数据插入");
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

  for (const route of maluanshanRoutes) {
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
