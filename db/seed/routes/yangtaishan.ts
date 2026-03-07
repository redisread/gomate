/**
 * 阳台山路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const yangtaishanRoutes = [
  {
    name: "阳台山石岩线",
    slug: "yangtaishan-shiyan",
    description:
      "从石岩入口登阳台山的经典路线，全程约4公里。路况良好，台阶路为主，适合各年龄段登山者。",
    difficulty: "easy",
    durationMin: 90,
    durationMax: 150,
    distance: 4.0,
    elevation: 587,
    routeGuide: JSON.stringify({
      overview:
        "从阳台山森林公园石岩入口出发，沿台阶路直上山顶，沿途有多个休息平台和观景台。",
      tips: [
        "台阶路为主，路况好",
        "沿途有自动售货机",
        "适合带老人小孩",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水"],
      warnings: ["周末人流较多", "台阶较多注意膝盖保护"],
    }),
  },
  {
    name: "大小阳台山穿越",
    slug: "yangtaishan-crossing",
    description:
      "连接大阳台山和小阳台山的穿越路线，全程约8公里。可一次登顶两座山峰，体验不同风景。",
    difficulty: "moderate",
    durationMin: 180,
    durationMax: 240,
    distance: 8.0,
    elevation: 650,
    routeGuide: JSON.stringify({
      overview:
        "从石岩入口上大阳台山，经山脊线穿越至小阳台山，最后从大浪出口下山。",
      tips: [
        "路线较长，需带足补给",
        "山脊线风景优美",
        "可欣赏龙华和宝安全景",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "充足水", "路餐"],
      warnings: ["中途补给点较少", "注意时间安排"],
    }),
  },
  {
    name: "阳台山大环线",
    slug: "yangtaishan-loop",
    description:
      "环绕阳台山一周的完整路线，约12公里。途经多个景点，适合有一定体能的户外爱好者。",
    difficulty: "hard",
    durationMin: 240,
    durationMax: 360,
    distance: 12.0,
    elevation: 800,
    routeGuide: JSON.stringify({
      overview:
        "从石岩入口出发，环绕阳台山一周，途经大阳台、小阳台、应人石等多个景点后返回。",
      tips: [
        "路线较长，需早出发",
        "带足水和食物",
        "建议下载离线地图",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "护膝", "头灯", "充足补给"],
      warnings: ["路线较长，新手慎选", "部分路段标识不清"],
    }),
  },
];

export function seedYangtaishanRoutes(
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
    if (location.slug === "yangtai-mountain") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或阳台山ID，跳过阳台山路线数据插入");
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

  for (const route of yangtaishanRoutes) {
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
