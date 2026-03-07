/**
 * 武功山路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const wugongshanRoutes = [
  {
    name: "武功山经典登山线",
    slug: "wugongshan-classic",
    description:
      "武功山最经典路线，从景区正门出发，经石鼓寺、猴谷、好汉坡至金顶，全程约6公里。可欣赏十万亩高山草甸的壮美风光。",
    difficulty: "moderate",
    durationMin: 240,
    durationMax: 360,
    distance: 6.0,
    elevation: 1400,
    routeGuide: JSON.stringify({
      overview:
        "从武功山游客中心出发，可选择步行或索道上山，经好汉坡、吊马桩，最终到达金顶。",
      tips: [
        "可选择索道上山节省体力",
        "金顶可观日出云海",
        "山顶有客栈和帐篷营地",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "冲锋衣", "充足水"],
      warnings: ["山顶风大温差大", "注意防晒", "旺季需提前订房"],
    }),
  },
  {
    name: "武功山全程穿越",
    slug: "wugongshan-crossing",
    description:
      "从沈子村出发至龙山村，全程约20公里，是武功山最经典的两天一夜穿越路线。途经无人区草甸，可深度体验武功山的壮美。",
    difficulty: "hard",
    durationMin: 720,
    durationMax: 1080,
    distance: 20.0,
    elevation: 1800,
    routeGuide: JSON.stringify({
      overview:
        "从沈子村出发，经无人区草甸、发云界、好汉坡、金顶，最终从龙山村下山。",
      tips: [
        "需两天一夜",
        "可在发云界或金顶露营",
        "带足补给",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "帐篷", "睡袋", "充足水", "路餐", "头灯"],
      warnings: ["路线较长", "部分路段无信号", "需有户外经验"],
    }),
  },
  {
    name: "武功山休闲索道路线",
    slug: "wugongshan-cableway",
    description:
      "适合家庭和休闲游客的轻松路线，全程乘坐索道上下山，仅需徒步金顶周边，全程约3公里。",
    difficulty: "easy",
    durationMin: 120,
    durationMax: 240,
    distance: 3.0,
    elevation: 300,
    routeGuide: JSON.stringify({
      overview:
        "乘坐一级索道至中庵，再换乘二级索道至金顶附近，轻松登顶观赏美景。",
      tips: [
        "最轻松的登山方式",
        "适合老人小孩",
        "金顶风景不容错过",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水", "防晒用品"],
      warnings: ["索道可能因天气停运", "山顶风大注意保暖"],
    }),
  },
];

export function seedWugongshanRoutes(
  db: Database,
  cities: CityData[],
  locations: LocationData[]
): RouteData[] {
  let changshaId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "430100") {
      changshaId = city.id;
      break;
    }
  }

  let locationId: string | undefined;
  for (const location of locations) {
    if (location.slug === "wugong-mountain") {
      locationId = location.id;
      break;
    }
  }

  if (!changshaId || !locationId) {
    console.warn("⚠️  未找到长沙或武功山ID，跳过武功山路线数据插入");
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

  for (const route of wugongshanRoutes) {
    const id = nanoid();
    insertStmt.run(
      id,
      locationId,
      changshaId,
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
