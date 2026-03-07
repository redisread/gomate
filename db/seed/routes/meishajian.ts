/**
 * 梅沙尖路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const meishajianRoutes = [
  {
    name: "山海大观线",
    slug: "meishajian-shanhaidaguan",
    description:
      "梅沙尖最经典路线，全程约5公里。从山海大观入口出发，可360度俯瞰盐田港、大梅沙、梧桐山等美景。",
    difficulty: "moderate",
    durationMin: 150,
    durationMax: 210,
    distance: 5.0,
    elevation: 753,
    routeGuide: JSON.stringify({
      overview:
        "从山海大观入口出发，沿山脊步道登顶，山顶可360度俯瞰深圳东部美景。",
      tips: [
        "日出日落时分景色最美",
        "建议带长焦镜头",
        "山顶常年云雾缭绕",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "饮用水", "路餐"],
      warnings: ["部分路段为野路", "无补给点", "注意防滑"],
    }),
  },
  {
    name: "三洲田线",
    slug: "meishajian-sanzhoutian",
    description:
      "从三洲田水库出发的登山路线，全程约6公里。路况较好，适合有一定体能的户外爱好者。",
    difficulty: "moderate",
    durationMin: 180,
    durationMax: 240,
    distance: 6.0,
    elevation: 753,
    routeGuide: JSON.stringify({
      overview:
        "从三洲田水库出发，经茶溪谷方向上山，沿途风景优美，最终登顶梅沙尖。",
      tips: [
        "可顺路游览茶溪谷",
        "路况较好，标识清晰",
        "适合周末休闲",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "饮用水", "防晒用品"],
      warnings: ["全程无补给", "建议早出发"],
    }),
  },
];

export function seedMeishajianRoutes(
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
    if (location.slug === "meishajian") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或梅沙尖ID，跳过梅沙尖路线数据插入");
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

  for (const route of meishajianRoutes) {
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
