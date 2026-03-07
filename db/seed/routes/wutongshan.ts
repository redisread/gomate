/**
 * 梧桐山路线数据种子
 * 包含梧桐山主要徒步路线
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

// 梧桐山路线数据
const wutongshanRoutes = [
  {
    name: "泰山涧线路",
    slug: "taishanjian-route",
    description:
      "泰山涧是梧桐山最经典的登山路线，全长约5.5公里。沿途溪流潺潺，怪石嶙峋，景色优美，是深圳最受欢迎的登山路线之一。",
    difficulty: "moderate",
    durationMin: 120,
    durationMax: 180,
    distance: 5.5,
    elevation: 700,
    routeGuide: JSON.stringify({
      overview:
        "从梧桐山村出发，沿泰山涧步道上山，途经多个观景点，最终到达大梧桐山顶。全程石阶路，路况良好。",
      tips: [
        "前半段平缓，后半段较陡",
        "沿途有多个休息点",
        "山顶有小卖部可补给",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "充足饮用水", "防晒用品"],
      warnings: ["周末人流较多", "雨天路滑注意安全"],
    }),
  },
  {
    name: "好汉坡线路",
    slug: "haohanpo-route",
    description:
      "好汉坡是梧桐山最具挑战性的路线之一，以陡峭著称。这条路线较短但坡度大，是考验登山者体力和意志的经典路线。",
    difficulty: "hard",
    durationMin: 90,
    durationMax: 150,
    distance: 4.0,
    elevation: 800,
    routeGuide: JSON.stringify({
      overview:
        "从仙湖植物园或梧桐山北大门出发，经好汉坡直达山顶。坡度陡峭，需要一定的体能基础。",
      tips: [
        "适合有一定登山经验的人",
        "可以使用登山杖辅助",
        "中途休息要充分",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["专业登山鞋", "登山杖", "护膝", "能量补给"],
      warnings: ["坡度陡峭，不适合初学者", "注意保护膝盖"],
    }),
  },
  {
    name: "百年古道",
    slug: "bainian-gudao",
    description:
      "百年古道是一条历史悠久的登山步道，曾是当地村民上山砍柴的必经之路。路线相对平缓，沿途古树参天，充满野趣。",
    difficulty: "easy",
    durationMin: 150,
    durationMax: 210,
    distance: 6.5,
    elevation: 650,
    routeGuide: JSON.stringify({
      overview:
        "从梧桐山村出发，走百年古道上山。这是一条相对冷门但风景优美的路线，人少清静。",
      tips: [
        "路线较长但坡度平缓",
        "适合喜欢安静的登山者",
        "部分路段较为原始",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["舒适的运动鞋", "防虫喷雾", "充足的水"],
      warnings: ["部分路段标识不清，建议下载离线地图"],
    }),
  },
];

/**
 * 插入梧桐山路线数据
 */
export function seedWutongshanRoutes(
  db: Database,
  cities: CityData[],
  locations: LocationData[]
): RouteData[] {
  // 获取深圳城市ID
  let shenzhenId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "440300") {
      shenzhenId = city.id;
      break;
    }
  }

  // 获取梧桐山地点ID
  let wutongshanId: string | undefined;
  for (const location of locations) {
    if (location.slug === "wutong-mountain") {
      wutongshanId = location.id;
      break;
    }
  }

  if (!shenzhenId || !wutongshanId) {
    console.warn("⚠️  未找到深圳或梧桐山ID，跳过梧桐山路线数据插入");
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

  for (const route of wutongshanRoutes) {
    const id = nanoid();
    insertStmt.run(
      id,
      wutongshanId,
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
      locationId: wutongshanId,
    });
    console.log(`  ✓ ${route.name}`);
  }

  return insertedRoutes;
}
