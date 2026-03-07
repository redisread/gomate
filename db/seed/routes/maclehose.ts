/**
 * 麦理浩径路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const maclehoseRoutes = [
  {
    name: "麦理浩径第一段",
    slug: "maclehose-section1",
    description:
      "麦理浩径第一段从北潭涌至浪茄，全长约10.6公里。途经万宜水库东坝，可欣赏香港地质公园的六角形岩柱群，是麦理浩径最平坦的一段。",
    difficulty: "easy",
    durationMin: 120,
    durationMax: 180,
    distance: 10.6,
    elevation: 150,
    routeGuide: JSON.stringify({
      overview:
        "从北潭涌出发，沿万宜水库步行至东坝，欣赏世界地质公园的独特地貌，最终到达浪茄沙滩。",
      tips: [
        "路况平坦，适合新手",
        "东坝风景绝美，多拍照",
        "浪茄沙滩可露营",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水", "防晒用品"],
      warnings: ["全程无遮阴，注意防晒", "夏季炎热"],
    }),
  },
  {
    name: "麦理浩径第二段",
    slug: "maclehose-section2",
    description:
      "麦理浩径最精华的路段，从浪茄至北潭凹，全长约13.5公里。途经西湾、咸田湾、大浪湾等美丽海滩，被誉为香港最美的海岸徒步径。",
    difficulty: "moderate",
    durationMin: 240,
    durationMax: 360,
    distance: 13.5,
    elevation: 450,
    routeGuide: JSON.stringify({
      overview:
        "从浪茄出发，翻越西湾山，途经西湾、咸田湾等美丽海滩，最终到达北潭凹。",
      tips: [
        "风景最美的路段",
        "海滩有补给和餐厅",
        "可在西湾或咸田湾露营",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "充足水", "路餐"],
      warnings: ["部分路段较陡峭", "注意补水", "台风后可能封路"],
    }),
  },
  {
    name: "麦理浩径一二段连穿",
    slug: "maclehose-section1-2",
    description:
      "一次性完成麦理浩径前两段，全长约24公里。从北潭涌至北潭凹，是体验麦理浩径精华的最佳选择，适合有一定体能的户外爱好者。",
    difficulty: "hard",
    durationMin: 420,
    durationMax: 600,
    distance: 24.0,
    elevation: 600,
    routeGuide: JSON.stringify({
      overview:
        "从北潭涌出发，经万宜水库东坝、浪茄、西湾、咸田湾，最终到达北潭凹。",
      tips: [
        "需早出发",
        "带足补给",
        "可在西湾中途休息",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "充足水", "路餐", "头灯"],
      warnings: ["路线较长", "需要较好体能", "建议结伴而行"],
    }),
  },
];

export function seedMaclehoseRoutes(
  db: Database,
  cities: CityData[],
  locations: LocationData[]
): RouteData[] {
  let hongkongId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "810000") {
      hongkongId = city.id;
      break;
    }
  }

  let locationId: string | undefined;
  for (const location of locations) {
    if (location.slug === "maclehose-trail") {
      locationId = location.id;
      break;
    }
  }

  if (!hongkongId || !locationId) {
    console.warn("⚠️  未找到香港或麦理浩径ID，跳过麦理浩径路线数据插入");
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

  for (const route of maclehoseRoutes) {
    const id = nanoid();
    insertStmt.run(
      id,
      locationId,
      hongkongId,
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
