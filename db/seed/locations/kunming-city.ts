/**
 * 昆明城市地点数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const kunmingCityLocations = [
  {
    name: "昆明",
    slug: "kunming-city",
    subtitle: "春城",
    description:
      "昆明是云南省省会，享有「春城」之美誉。这里气候温和，夏无酷暑，冬无严寒，四季如春。昆明历史悠久，文化底蕴深厚，是国务院公布的首批国家历史文化名城之一。作为西南重要的高原城市，昆明周边拥有滇池、西山等著名景点，是户外爱好者探索云南的绝佳起点。无论是漫步翠湖公园，还是品尝地道的过桥米线，昆明都能带给你独特的体验。",
    address: "云南省昆明市",
    bestSeason: JSON.stringify(["春季", "夏季", "秋季", "冬季"]),
    coverImage:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 25.0389, lng: 102.7183 }),
    extra: JSON.stringify({
      facilities: ["地铁", "公交", "出租车", "共享单车", "机场", "火车站"],
      tips: ["四季如春，全年适合游玩", "注意防晒", "尝试当地美食过桥米线", "滇池观海鸥最佳时间为冬季"],
      warnings: ["高原紫外线强，注意防护", "早晚温差大，备好外套"],
    }),
  },
];

export function seedKunmingCityLocations(
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
    console.warn("⚠️  未找到昆明城市ID，跳过昆明城市地点数据插入");
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

  for (const location of kunmingCityLocations) {
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
