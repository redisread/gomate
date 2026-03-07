/**
 * 昆明地点数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const kunmingLocations = [
  {
    name: "昆明西山",
    slug: "kunming-xishan",
    subtitle: "滇中第一佳境",
    description:
      "昆明西山位于滇池西岸，海拔2507米，是昆明著名的风景名胜区。从西山远眺滇池，景色壮丽，素有'滇中第一佳境'之称。龙门石窟、华亭寺、太华寺等古迹点缀山间，是昆明市民周末徒步健身的热门去处。",
    address: "云南省昆明市西山区西山风景区",
    bestSeason: JSON.stringify(["春季", "秋季", "冬季"]),
    coverImage:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 24.9567, lng: 102.6289 }),
    extra: JSON.stringify({
      facilities: ["索道", "停车场", "卫生间", "餐厅", "观景台"],
      tips: ["龙门石窟是必游景点", "可观滇池日出日落", "建议乘坐环保车上山"],
      warnings: ["节假日人流较大", "山顶风大注意保暖"],
    }),
  },
];

export function seedKunmingLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let kunmingId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "530100") {
      kunmingId = city.id;
      break;
    }
  }

  if (!kunmingId) {
    console.warn("⚠️  未找到昆明城市ID，跳过昆明地点数据插入");
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

  for (const location of kunmingLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      kunmingId,
      "昆明",
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
      cityId: kunmingId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
