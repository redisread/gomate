/**
 * 桂林地点数据种子
 * 广西桂林市
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { CityData } from "../cities";
import type { LocationData } from "./index";

const guilinLocations = [
  {
    name: "桂林市区",
    slug: "guilin-city",
    subtitle: "山水甲天下",
    description:
      "桂林是世界著名的风景游览城市和历史文化名城，享有「桂林山水甲天下」的美誉。市区内两江四湖环城水系将漓江、桃花江、杉湖、榕湖、桂湖、木龙湖连通，形成独特的城市景观。象鼻山、伏波山、叠彩山等名山点缀城中，是一座名副其实的山水之城。",
    address: "广西壮族自治区桂林市",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1537531383496-f4749e5f52e6?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1537531383496-f4749e5f52e6?w=800&q=80",
      "https://images.unsplash.com/photo-1529921879218-f99546d19a9d?w=800&q=80",
      "https://images.unsplash.com/photo-1547645892-79affa556a2f?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 25.2740, lng: 110.2993 }),
    extra: JSON.stringify({
      facilities: ["高铁站", "机场", "酒店", "餐厅", "游船码头"],
      tips: ["两江四湖夜游必体验", "象鼻山是城徽", "正阳步行街逛吃", "东西巷复古街区"],
      warnings: ["雨季漓江可能涨水", "旺季人多"],
    }),
  },
  {
    name: "阳朔西街",
    slug: "yangshuo-west-street",
    subtitle: "洋人街",
    description:
      "阳朔西街是阳朔县城最古老繁华的街道，已有1400多年历史。街道两旁是桂北明清风格的建筑，现在汇集了各种酒吧、咖啡馆、餐厅和特色店铺。这里是外国游客聚集的地方，被称为「洋人街」。夜晚的西街灯火通明，热闹非凡，是体验阳朔夜生活的好去处。",
    address: "广西壮族自治区桂林市阳朔县西街",
    bestSeason: JSON.stringify(["春季", "夏季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1547645892-79affa556a2f?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1547645892-79affa556a2f?w=800&q=80",
      "https://images.unsplash.com/photo-1529921879218-f99546d19a9d?w=800&q=80",
      "https://images.unsplash.com/photo-1537531383496-f4749e5f52e6?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 24.7784, lng: 110.4966 }),
    extra: JSON.stringify({
      facilities: ["民宿", "酒吧", "餐厅", "咖啡馆", "商店"],
      tips: ["啤酒鱼是必尝美食", "夜晚比白天热闹", "可以租自行车游乡村"],
      warnings: ["商业化程度高", "注意保管财物"],
    }),
  },
  {
    name: "龙脊梯田",
    slug: "longji-terraces",
    subtitle: "梯田世界之冠",
    description:
      "龙脊梯田位于桂林龙胜各族自治县，是中国最壮美的梯田之一，有「梯田世界之冠」的美誉。梯田始建于元朝，距今已有650多年历史。金坑大寨、平安寨、古壮寨是三大核心观景区，层层叠叠的梯田从山脚盘绕到山顶，气势磅礴。春如银带、夏如绿浪、秋如金塔、冬如白雪，四季景色各异。",
    address: "广西壮族自治区桂林市龙胜各族自治县龙脊镇",
    bestSeason: JSON.stringify(["春季", "秋季"]),
    coverImage:
      "https://images.unsplash.com/photo-1598887142487-3c8e6876c477?w=800&q=80",
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1598887142487-3c8e6876c477?w=800&q=80",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    ]),
    coordinates: JSON.stringify({ lat: 25.7261, lng: 110.0740 }),
    extra: JSON.stringify({
      facilities: ["停车场", "民宿", "观景台", "缆车"],
      tips: ["灌水期(5-6月)和收割期(9-10月)最美", "建议住一晚看日出", "金坑大寨视野最好"],
      warnings: ["山路弯多", "步行需体力", "温差较大"],
    }),
  },
];

export function seedGuilinLocations(
  db: Database,
  cities: CityData[]
): LocationData[] {
  let guilinId: string | undefined;
  for (const city of cities) {
    if (city.adcode === "450300") {
      guilinId = city.id;
      break;
    }
  }

  if (!guilinId) {
    console.warn("⚠️  未找到桂林城市ID，跳过桂林地点数据插入");
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

  for (const location of guilinLocations) {
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
