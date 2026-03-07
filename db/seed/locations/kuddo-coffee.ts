/**
 * Kuddo Coffee 地点数据种子
 * 深圳精品咖啡店
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const kuddoCoffeeLocations = [
  {
    name: "Kuddo Coffee",
    slug: "kuddo-coffee",
    subtitle: "精品咖啡空间",
    description:
      "Kuddo Coffee 是一家源自深圳的精品咖啡品牌，以其简约的工业风设计和优质的咖啡出品受到年轻人的喜爱。位于壹方天地的门店空间宽敞明亮，提供舒适的休闲环境，是商务会谈、朋友聚会、安静办公的理想场所。店内提供手冲咖啡、意式咖啡、创意特调等多种选择，还有精致的甜点和简餐搭配。",
    address: "深圳市龙华区人民路4022号壹方天地B区",
    bestSeason: JSON.stringify(["全年"]),
    coverImage:
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80",
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.6545, lng: 114.0323 }),
    extra: JSON.stringify({
      facilities: ["WiFi", "插座", "洗手间", "无障碍设施"],
      tips: ["适合安静办公", "周末下午茶时段人较多", "有会员优惠", "支持外带"],
      warnings: ["高峰时段可能需要等位", "建议提前预约包场活动"],
    }),
  },
];

export function seedKuddoCoffeeLocations(
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
    console.warn("⚠️  未找到深圳城市ID，跳过 Kuddo Coffee 地点数据插入");
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

  for (const location of kuddoCoffeeLocations) {
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
