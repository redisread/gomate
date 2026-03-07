/**
 * 香港麦理浩径地点数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const maclehoseLocations = [
  {
    name: "麦理浩径",
    slug: "maclehose-trail",
    subtitle: "香港最美徒步径",
    description:
      "麦理浩径是香港最长的远足径，全长100公里，共分10段。横跨香港新界东西，途经八个郊野公园，沿途风景壮丽，包括万宜水库、大浪湾、狮子山等著名景点，被誉为全球最佳徒步径之一。",
    address: "香港新界西贡北潭涌至屯门",
    bestSeason: JSON.stringify(["秋季", "冬季", "春季"]),
    coverImage:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.3964, lng: 114.1095 }),
    extra: JSON.stringify({
      facilities: ["营地", "卫生间", "补给点", "公交站"],
      tips: ["可分段完成，不必走全程", "第二段风景最美", "需办理港澳通行证"],
      warnings: ["部分路段无补给", "夏季炎热注意防暑", "台风季节注意安全"],
    }),
  },
];

export function seedMaclehoseLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let hongkongId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "810000") {
      hongkongId = city.id;
      break;
    }
  }

  if (!hongkongId) {
    console.warn("⚠️  未找到香港城市ID，跳过麦理浩径地点数据插入");
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

  for (const location of maclehoseLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      hongkongId,
      "香港",
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
      cityId: hongkongId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
