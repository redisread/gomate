/**
 * 江西武功山地点数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const wugongshanLocations = [
  {
    name: "武功山",
    slug: "wugong-mountain",
    subtitle: "云中草原，户外天堂",
    description:
      "武功山位于江西省萍乡市，主峰白鹤峰（金顶）海拔1918.3米。以十万亩高山草甸、云海日出、星空露营闻名，被誉为'中国最美的高山草甸'，是户外爱好者和摄影爱好者的天堂。",
    address: "江西省萍乡市芦溪县武功山风景区",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 27.4567, lng: 114.1789 }),
    extra: JSON.stringify({
      facilities: ["索道", "客栈", "营地", "卫生间", "餐厅"],
      tips: ["金顶是最佳观日出点", "可体验帐篷露营", "云海多在雨后出现"],
      warnings: ["山顶风大温差大", "旺季需提前订房", "注意防晒"],
    }),
  },
];

export function seedWugongshanLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  // 武功山位于江西省萍乡市
  let pingxiangId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "360300") {
      pingxiangId = city.id;
      break;
    }
  }

  if (!pingxiangId) {
    console.warn("⚠️  未找到萍乡城市ID，跳过武功山地点数据插入");
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

  for (const location of wugongshanLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      pingxiangId,
      "萍乡",
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
      cityId: pingxiangId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
