/**
 * 湖南衡山地点数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const hengshanLocations = [
  {
    name: "衡山",
    slug: "heng-mountain",
    subtitle: "五岳之南岳",
    description:
      "衡山是中国五岳之一，位于湖南省衡阳市，主峰祝融峰海拔1300.2米。自古以'五岳独秀'、'文明奥区'著称，是著名的道教和佛教圣地，也是观日出、云海、雾凇的绝佳之地。",
    address: "湖南省衡阳市南岳区衡山风景区",
    bestSeason: JSON.stringify(["春季", "秋季", "冬季"]),
    coverImage:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 27.2567, lng: 112.6789 }),
    extra: JSON.stringify({
      facilities: ["索道", "观光车", "客栈", "餐厅", "卫生间"],
      tips: ["祝融峰是最佳观日出点", "冬季可观雾凇", "可游览南岳大庙"],
      warnings: ["冬季路面结冰注意防滑", "旺季人流较大"],
    }),
  },
];

export function seedHengshanLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let changshaId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "430100") {
      changshaId = city.id;
      break;
    }
  }

  if (!changshaId) {
    console.warn("⚠️  未找到长沙城市ID，跳过衡山地点数据插入");
    return [];
  }

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO locations (
      id, name, slug, subtitle, description, address, city_id, city_name,
      best_season, cover_image, images, coordinates, extra, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const insertedLocations: LocationData[] = [];

  for (const location of hengshanLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      changshaId,
      "长沙",
      location.bestSeason,
      location.coverImage,
      location.images,
      location.coordinates,
      location.extra,
      now,
      now
    );

    insertedLocations.push({
      id,
      name: location.name,
      slug: location.slug,
      cityId: changshaId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
