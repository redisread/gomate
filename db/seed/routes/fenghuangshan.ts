/**
 * 凤凰山路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const fenghuangshanRoutes = [
  {
    name: "凤岩古庙线",
    slug: "fenghuangshan-gumiao",
    description:
      "凤凰山最经典路线，全程约3公里。从山脚沿石阶路直上凤岩古庙，可参拜祈福，适合全家老少。",
    difficulty: "easy",
    durationMin: 60,
    durationMax: 90,
    distance: 3.0,
    elevation: 376,
    routeGuide: JSON.stringify({
      overview:
        "从凤凰山森林公园入口出发，沿石阶路经凤岩古庙，最终到达山顶观景台。",
      tips: [
        "古庙可烧香祈福",
        "山路较缓，适合全家",
        "周末人流较多",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水"],
      warnings: ["古庙人多时注意财物", "部分台阶较陡"],
    }),
  },
  {
    name: "凤凰山大环线",
    slug: "fenghuangshan-loop",
    description:
      "环绕凤凰山一周的路线，全程约5公里。途经多个景点，体验更丰富的自然风光。",
    difficulty: "easy",
    durationMin: 90,
    durationMax: 150,
    distance: 5.0,
    elevation: 376,
    routeGuide: JSON.stringify({
      overview:
        "从主入口出发，经凤岩古庙、山顶平台，从另一侧下山形成环线。",
      tips: [
        "路线轻松",
        "可欣赏不同角度的风景",
        "适合周末休闲",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水", "防晒帽"],
      warnings: ["部分路段无遮挡，注意防晒"],
    }),
  },
];

export function seedFenghuangshanRoutes(
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
    if (location.slug === "fenghuangshan") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或凤凰山ID，跳过凤凰山路线数据插入");
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

  for (const route of fenghuangshanRoutes) {
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
