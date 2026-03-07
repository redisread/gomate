/**
 * 漓江地点数据种子
 * 桂林漓江风景区
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const lijiangRiverLocations = [
  {
    name: "漓江精华段",
    slug: "lijiang-river",
    subtitle: "百里画廊",
    description:
      "漓江是桂林山水的精华所在，从桂林至阳朔83公里水程，像一条青绸绿带盘绕在万点峰峦之间。漓江精华段指杨堤至兴坪段，是山水最为秀美的一段，有「百里画廊」之称。沿途可看到九马画山、黄布倒影、兴坪佳境等著名景点。20元人民币背面图案就取景于黄布倒影。",
    address: "广西壮族自治区桂林市漓江风景区",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1529921879218-f99546d19a9d?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1529921879218-f99546d19a9d?w=800&q=80",
      "https://images.unsplash.com/photo-1537531383496-f4749e5f52e6?w=800&q=80",
      "https://images.unsplash.com/photo-1547645892-79affa556a2f?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 24.7798, lng: 110.4779 }),
    extra: JSON.stringify({
      facilities: ["游船", "竹筏", "码头", "观景台"],
      tips: ["杨堤至兴坪为精华段", "可乘游船或竹筏", "带20元人民币打卡", "看九马画山要数马"],
      warnings: ["雨季水位上涨可能停航", "竹筏注意防晒", "注意保管财物"],
    }),
  },
  {
    name: "兴坪古镇",
    slug: "xingping-old-town",
    subtitle: "千年古镇",
    description:
      "兴坪古镇位于阳朔东北部，漓江在此绕了一个大弯。古镇始建于三国时期，距今已有1700多年历史，是漓江边上最美的古镇。镇内古桥、古渡、古亭、古戏台、古庙、古寨、古树和古村落建筑群保存完好。这里是20元人民币背面图案的取景地，也是拍摄漓江美景的最佳位置。",
    address: "广西壮族自治区桂林市阳朔县兴坪镇",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1547645892-79affa556a2f?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1547645892-79affa556a2f?w=800&q=80",
      "https://images.unsplash.com/photo-1529921879218-f99546d19a9d?w=800&q=80",
      "https://images.unsplash.com/photo-1537531383496-f4749e5f52e6?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 24.9189, lng: 110.5264 }),
    extra: JSON.stringify({
      facilities: ["古镇客栈", "餐厅", "码头", "观景台"],
      tips: ["老寨山看全景", "清晨摄影最佳", "尝尝漓江鱼", "古镇不大适合漫步"],
      warnings: ["旺季人多", "住宿需提前订", "老寨山攀登有难度"],
    }),
  },
];

export function seedLijiangRiverLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  // 漓江属于桂林，使用桂林的cityId
  let guilinId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "450300") {
      guilinId = city.id;
      break;
    }
  }

  if (!guilinId) {
    console.warn("⚠️  未找到桂林城市ID，跳过漓江地点数据插入");
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

  for (const location of lijiangRiverLocations) {
    const id = nanoid();
    insertStmt.run(
      id,
      location.name,
      location.slug,
      location.subtitle,
      location.description,
      location.address,
      guilinId,
      "桂林",
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
      cityId: guilinId,
    });
    console.log(`  ✓ ${location.name}`);
  }

  return insertedLocations;
}
