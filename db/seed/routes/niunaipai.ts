/**
 * 牛奶排路线数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "../locations";
import type { RouteData } from "./index";

const niunaipaiRoutes = [
  {
    name: "牛奶排海岸线穿越",
    slug: "niunaipai-crossing",
    description:
      "深圳最难海岸线穿越，全程约5公里。需要攀爬、绳降、泅渡等多种技能，被誉为深圳户外毕业线路，仅限经验丰富的户外达人挑战。",
    difficulty: "expert",
    durationMin: 300,
    durationMax: 480,
    distance: 5.0,
    elevation: 200,
    routeGuide: JSON.stringify({
      overview:
        "从西涌出发，沿海岸线穿越牛奶排，途经多个需要绳索下降的断崖和泅渡点，最终到达磨刀坑。",
      tips: [
        "必须结伴而行，不建议 solo",
        "携带专业装备（绳索、安全带等）",
        "提前了解潮汐，选择退潮时段",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["防滑登山鞋", "绳索", "安全带", "头盔", "手套", "救生衣", "充足水", "头灯"],
      warnings: ["难度极高，新手勿入", "需要专业装备", "注意潮汐变化", "建议结伴而行", "风险自负"],
    }),
  },
  {
    name: "牛奶排休闲观光线",
    slug: "niunaipai-leisure",
    description:
      "在牛奶排附近海岸线徒步的休闲路线，全程约3公里。不穿越危险地段，适合想欣赏牛奶排风景的户外爱好者。",
    difficulty: "moderate",
    durationMin: 120,
    durationMax: 180,
    distance: 3.0,
    elevation: 100,
    routeGuide: JSON.stringify({
      overview:
        "从西涌沙滩出发，沿牛奶排外围海岸线行走，欣赏奇特海蚀地貌，不进入危险区域。",
      tips: [
        "可远观牛奶排险峻地形",
        "风景绝美，适合拍照",
        "相对安全，适合中级户外爱好者",
      ],
    }),
    extra: JSON.stringify({
      equipmentNeeded: ["防滑登山鞋", "手套", "饮用水", "防晒用品"],
      warnings: ["不要尝试危险攀爬", "注意潮汐", "结伴而行"],
    }),
  },
];

export function seedNiunaipaiRoutes(
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
    if (location.slug === "niunaipai") {
      locationId = location.id;
      break;
    }
  }

  if (!shenzhenId || !locationId) {
    console.warn("⚠️  未找到深圳或牛奶排ID，跳过牛奶排路线数据插入");
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

  for (const route of niunaipaiRoutes) {
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
