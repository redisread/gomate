/**
 * 深圳地点数据种子
 * 包含深圳热门徒步地点
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData, getCityIdMap } from "../cities";
import type { LocationData } from "./index";

// 深圳地点数据
const shenzhenLocations = [
  {
    name: "梧桐山",
    slug: "wutong-mountain",
    subtitle: "深圳第一高峰",
    description:
      "梧桐山风景名胜区位于深圳东部，包括东湖公园、仙湖植物园、沙头角林场等，是国内少有的邻近市区、以滨海、山地和自然植被为景观主体的国家级风景名胜区。主峰大梧桐海拔943.7米，为深圳第一高峰。",
    address: "深圳市罗湖区莲塘街道梧桐山风景区",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.5964, lng: 114.2185 }),
    extra: JSON.stringify({
      facilities: ["停车场", "卫生间", "小卖部", "观景台"],
      tips: ["建议早上6点前开始登山", "带好充足的水和食物", "山顶风大，注意保暖"],
      warnings: ["部分路段陡峭，注意安全", "雷雨天气禁止登山"],
    }),
  },
  {
    name: "七娘山",
    slug: "qiniang-mountain",
    subtitle: "深圳第二高峰",
    description:
      "七娘山位于大鹏半岛南岛，主峰海拔869米，是深圳第二高峰。山上七座山峰错落有致，山势险峻，山中森林茂盛，保存着未经人为破坏的常绿阔叶林。这里是户外爱好者的天堂，可以俯瞰大鹏半岛的壮丽海景。",
    address: "深圳市大鹏新区南澳街道七娘山",
    bestSeason: JSON.stringify(["秋季", "冬季"]),
    coverImage:
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&q=80",
      "https://images.unsplash.com/photo-1434394354979-a235cd36269d?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.5289, lng: 114.5456 }),
    extra: JSON.stringify({
      facilities: ["停车场", "登山入口标识"],
      tips: ["需提前了解天气情况", "建议穿防滑登山鞋", "注意防晒"],
      warnings: ["山路原始，部分路段需要攀爬", "请勿独自前往"],
    }),
  },
  {
    name: "东西涌",
    slug: "dongxichong",
    subtitle: "中国最美八大海岸线之一",
    description:
      "东西涌海岸线位于大鹏半岛，是中国最美丽的八大海岸线之一，也是深圳最经典的海岸徒步线路。东涌到西涌的穿越路线全长约6公里，沿途可以欣赏到壮观的海蚀地貌、奇特的海岸礁石和清澈的海水。",
    address: "深圳市大鹏新区南澳街道东涌/西涌",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.4765, lng: 114.5689 }),
    extra: JSON.stringify({
      facilities: ["停车场", "农家乐", "卫生间"],
      tips: ["穿防滑鞋，带手套", "注意潮汐时间", "带足饮用水"],
      warnings: ["部分路段需要在礁石上攀爬", "注意海浪安全"],
    }),
  },
  {
    name: "阳台山",
    slug: "yangtai-mountain",
    subtitle: "城市绿肺",
    description:
      "阳台山（原名羊台山）位于深圳市西北部，是深圳八景之一。主峰海拔587.3米，是深圳西部的最高峰。这里风景秀丽，森林覆盖率高，是市民休闲健身的好去处，也是深圳市重要的生态屏障。",
    address: "深圳市宝安区石岩街道阳台山森林公园",
    bestSeason: JSON.stringify(["全年"]),
    coverImage:
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80",
      "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.6789, lng: 113.9654 }),
    extra: JSON.stringify({
      facilities: ["停车场", "卫生间", "自动售货机", "观景台"],
      tips: ["有多条登山路线可选", "适合家庭出游"],
      warnings: ["周末人流较多，建议错峰出行"],
    }),
  },
  {
    name: "马峦山",
    slug: "maluan-mountain",
    subtitle: "深圳最大瀑布群",
    description:
      "马峦山位于深圳市东部山区，有深圳最大的瀑布群。这里谷深林茂，溪流潺潺，空气清新，是远离城市喧嚣的好去处。马峦山徒步路线平缓，适合各年龄段的户外爱好者，尤其是夏季避暑纳凉的好地方。",
    address: "深圳市坪山区马峦街道马峦山郊野公园",
    bestSeason: JSON.stringify(["夏季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&q=80",
      "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 22.6456, lng: 114.3456 }),
    extra: JSON.stringify({
      facilities: ["停车场", "农家乐", "卫生间"],
      tips: ["雨季瀑布更壮观", "可以品尝农家菜"],
      warnings: ["雨后路滑，注意安全", "保护水源，不要污染"],
    }),
  },
];

/**
 * 插入深圳地点数据
 */
export function seedShenzhenLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  // 获取深圳城市ID
  const cityIdMap = new Map<string, string>();
  for (const city of cities) {
    if (city.adcode === "440300") {
      cityIdMap.set("shenzhen", city.id);
      break;
    }
  }

  const shenzhenId = cityIdMap.get("shenzhen");
  if (!shenzhenId) {
    console.warn("⚠️  未找到深圳城市ID，跳过深圳地点数据插入");
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

  for (const location of shenzhenLocations) {
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
