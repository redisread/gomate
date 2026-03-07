/**
 * 壹方天地地点数据种子
 * 深圳龙华区大型商业综合体
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const yifangTiandiLocations = [
  {
    name: "壹方天地",
    slug: "yifang-tiandi",
    subtitle: "龙华最大商业综合体",
    description:
      "壹方天地是深圳龙华区最大的商业综合体，总建筑面积超过60万平方米，分为A、B、C、D四大主题商业区。这里汇集了国际时尚、潮流数码、餐饮美食、休闲娱乐等多种业态，是龙华区最热闹的社交聚集地。商场内设有IMAX影城、大型超市、儿童游乐中心等配套设施，是年轻人聚会、家庭休闲的理想场所。",
    address: "深圳市龙华区人民路4022号",
    bestSeason: JSON.stringify(["全年"]),
    coverImage:
      "https://images.unsplash.com/photo-1567449303078-57ad995bd17a?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1567449303078-57ad995bd17a?w=800&q=80",
      "https://images.unsplash.com/photo-1519567241046-7f570eee3ce9?w=800&q=80",
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
      "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.6543, lng: 114.0321 }),
    extra: JSON.stringify({
      facilities: ["停车场", "地铁站", "电影院", "超市", "餐厅", "咖啡厅"],
      tips: ["地铁4号线龙华站直达", "周末人流量较大", "适合组队聚餐", "有多家网红餐厅"],
      warnings: ["节假日停车较困难", "建议提前预订餐厅"],
    }),
  },
];

export function seedYifangTiandiLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let shenzhenId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "440300") {
      shenzhenId = city.id;
      break;
    }
  }

  if (!shenzhenId) {
    console.warn("⚠️  未找到深圳城市ID，跳过壹方天地地点数据插入");
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

  for (const location of yifangTiandiLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      shenzhenId,
      "深圳",
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
      cityId: shenzhenId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
