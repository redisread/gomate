/**
 * 衡山路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const hengshanRoutes = [
  {
    name: "衡山经典登山线",
    slug: "hengshan-classic",
    description:
      "衡山最经典路线，从康家垅入口出发，经梵音谷、忠烈祠、南天门至祝融峰，全程约9公里。沿途可游览多处古迹和寺庙。",
    difficulty: "moderate",
    durationMin: 240,
    durationMax: 360,
    distance: 9.0,
    elevation: 1100,
    routeGuide: JSON.stringify({
      overview:
        "从南岳衡山游客中心出发，经康家垅门票处，沿登山步道经忠烈祠、穿岩诗林、南天门，最终到达祝融峰。",
      tips: [
        "可乘观光车至半山亭节省体力",
        "祝融峰是最佳观日出点",
        "沿途有多处寺庙可参观",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "饮用水", "冲锋衣"],
      warnings: ["山顶风大", "冬季路面可能结冰", "旺季人流较大"],
    }),
  },
  {
    name: "衡山古道朝圣线",
    slug: "hengshan-pilgrimage",
    description:
      "从南岳大庙出发，经胜利坊、玄都观、紫竹林至祝融峰，全程约10公里。这是一条历史悠久的朝圣古道，文化底蕴深厚。",
    difficulty: "moderate",
    durationMin: 300,
    durationMax: 420,
    distance: 10.0,
    elevation: 1200,
    routeGuide: JSON.stringify({
      overview:
        "从南岳大庙后门出发，经胜利坊开始登山，途经玄都观、邺候书院、紫竹林、南天门，最终到达祝融峰。",
      tips: [
        "可先游览南岳大庙",
        "古道文化底蕴深厚",
        "适合喜欢人文景观的游客",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["登山鞋", "登山杖", "充足水", "路餐"],
      warnings: ["路线较长", "需合理安排时间"],
    }),
  },
  {
    name: "衡山休闲索道路线",
    slug: "hengshan-cableway",
    description:
      "适合家庭和休闲游客的轻松路线，乘坐索道上下山，仅需徒步南天门至祝融峰段，全程约3公里。",
    difficulty: "easy",
    durationMin: 120,
    durationMax: 180,
    distance: 3.0,
    elevation: 200,
    routeGuide: JSON.stringify({
      overview:
        "乘坐环保车至半山亭，换乘索道至南天门，然后徒步至祝融峰，轻松欣赏衡山美景。",
      tips: [
        "最轻松的登山方式",
        "适合老人小孩",
        "索道上风景优美",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["运动鞋", "饮用水", "外套"],
      warnings: ["索道可能因天气停运", "山顶较冷注意保暖"],
    }),
  },
];

export function seedHengshanRoutes(
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
    if (location.slug === "heng-mountain") {
      locationId = location.id;
      break;
    }
  }

  if (!changshaId || !locationId) {
    console.warn("⚠️  未找到长沙或衡山ID，跳过衡山路线数据插入");
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

  for (const route of hengshanRoutes) {
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
