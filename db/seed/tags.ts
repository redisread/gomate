/**
 * 标签数据种子
 * 包含地点、路线和活动标签
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";

export interface TagData {
  id: string;
  name: string;
  type: string;
}

// 标签基础数据
const tagsData = [
  // 地点标签
  { name: "溯溪", type: "location" },
  { name: "瀑布", type: "location" },
  { name: "海岸线", type: "location" },
  { name: "山峰", type: "location" },
  { name: "森林", type: "location" },
  { name: "古村", type: "location" },

  // 路线标签
  { name: "入门级", type: "route" },
  { name: "进阶级", type: "route" },
  { name: "挑战级", type: "route" },
  { name: "专家级", type: "route" },
  { name: "亲子友好", type: "route" },
  { name: "适合拍照", type: "route" },

  // 活动标签
  { name: "日出", type: "activity" },
  { name: "日落", type: "activity" },
  { name: "露营", type: "activity" },
  { name: "野餐", type: "activity" },
  { name: "观鸟", type: "activity" },
  { name: "摄影", type: "activity" },
  { name: "团建", type: "activity" },
  { name: "亲子", type: "activity" },
];

// 标签关联数据
const entityTagAssociations = [
  // 梧桐山地点标签
  { entityType: "location", entitySlug: "wutong-mountain", tagName: "山峰" },
  { entityType: "location", entitySlug: "wutong-mountain", tagName: "日出" },
  { entityType: "location", entitySlug: "wutong-mountain", tagName: "适合拍照" },

  // 七娘山地点标签
  { entityType: "location", entitySlug: "qiniang-mountain", tagName: "山峰" },
  { entityType: "location", entitySlug: "qiniang-mountain", tagName: "海岸线" },
  { entityType: "location", entitySlug: "qiniang-mountain", tagName: "适合拍照" },

  // 东西涌地点标签
  { entityType: "location", entitySlug: "dongxichong", tagName: "海岸线" },
  { entityType: "location", entitySlug: "dongxichong", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "dongxichong", tagName: "挑战级" },

  // 马峦山地点标签
  { entityType: "location", entitySlug: "maluan-mountain", tagName: "溯溪" },
  { entityType: "location", entitySlug: "maluan-mountain", tagName: "瀑布" },
  { entityType: "location", entitySlug: "maluan-mountain", tagName: "亲子友好" },

  // 阳台山地点标签
  { entityType: "location", entitySlug: "yangtai-mountain", tagName: "森林" },
  { entityType: "location", entitySlug: "yangtai-mountain", tagName: "亲子友好" },
  { entityType: "location", entitySlug: "yangtai-mountain", tagName: "入门级" },

  // 泰山涧线路标签
  { entityType: "route", entitySlug: "taishanjian-route", tagName: "进阶级" },
  { entityType: "route", entitySlug: "taishanjian-route", tagName: "瀑布" },
  { entityType: "route", entitySlug: "taishanjian-route", tagName: "适合拍照" },

  // 好汉坡线路标签
  { entityType: "route", entitySlug: "haohanpo-route", tagName: "挑战级" },
  { entityType: "route", entitySlug: "haohanpo-route", tagName: "日出" },

  // 百年古道标签
  { entityType: "route", entitySlug: "bainian-gudao", tagName: "入门级" },
  { entityType: "route", entitySlug: "bainian-gudao", tagName: "古村" },
  { entityType: "route", entitySlug: "bainian-gudao", tagName: "森林" },

  // ==================== 新增地点标签 ====================

  // 麦理浩径地点标签
  { entityType: "location", entitySlug: "maclehose-trail", tagName: "海岸线" },
  { entityType: "location", entitySlug: "maclehose-trail", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "maclehose-trail", tagName: "露营" },

  // 武功山地点标签
  { entityType: "location", entitySlug: "wugong-mountain", tagName: "山峰" },
  { entityType: "location", entitySlug: "wugong-mountain", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "wugong-mountain", tagName: "日出" },
  { entityType: "location", entitySlug: "wugong-mountain", tagName: "露营" },
  { entityType: "location", entitySlug: "wugong-mountain", tagName: "摄影" },

  // 衡山地点标签
  { entityType: "location", entitySlug: "heng-mountain", tagName: "山峰" },
  { entityType: "location", entitySlug: "heng-mountain", tagName: "古村" },
  { entityType: "location", entitySlug: "heng-mountain", tagName: "日出" },
  { entityType: "location", entitySlug: "heng-mountain", tagName: "观鸟" },

  // 昆明西山地点标签
  { entityType: "location", entitySlug: "kunming-xishan", tagName: "山峰" },
  { entityType: "location", entitySlug: "kunming-xishan", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "kunming-xishan", tagName: "日出" },
  { entityType: "location", entitySlug: "kunming-xishan", tagName: "日落" },

  // ==================== 新增路线标签 ====================

  // 麦理浩径第一段
  { entityType: "route", entitySlug: "麦理浩径第一段", tagName: "入门级" },
  { entityType: "route", entitySlug: "麦理浩径第一段", tagName: "适合拍照" },
  { entityType: "route", entitySlug: "麦理浩径第一段", tagName: "海岸线" },

  // 麦理浩径第二段
  { entityType: "route", entitySlug: "麦理浩径第二段", tagName: "进阶级" },
  { entityType: "route", entitySlug: "麦理浩径第二段", tagName: "适合拍照" },
  { entityType: "route", entitySlug: "麦理浩径第二段", tagName: "海岸线" },
  { entityType: "route", entitySlug: "麦理浩径第二段", tagName: "露营" },

  // 麦理浩径一二段连穿
  { entityType: "route", entitySlug: "麦理浩径一二段连穿", tagName: "挑战级" },
  { entityType: "route", entitySlug: "麦理浩径一二段连穿", tagName: "日出" },
  { entityType: "route", entitySlug: "麦理浩径一二段连穿", tagName: "海岸线" },

  // 武功山经典登山线
  { entityType: "route", entitySlug: "武功山经典登山线", tagName: "进阶级" },
  { entityType: "route", entitySlug: "武功山经典登山线", tagName: "适合拍照" },
  { entityType: "route", entitySlug: "武功山经典登山线", tagName: "日出" },

  // 武功山全程穿越
  { entityType: "route", entitySlug: "武功山全程穿越", tagName: "挑战级" },
  { entityType: "route", entitySlug: "武功山全程穿越", tagName: "日出" },
  { entityType: "route", entitySlug: "武功山全程穿越", tagName: "露营" },
  { entityType: "route", entitySlug: "武功山全程穿越", tagName: "摄影" },

  // 武功山休闲索道路线
  { entityType: "route", entitySlug: "武功山休闲索道路线", tagName: "入门级" },
  { entityType: "route", entitySlug: "武功山休闲索道路线", tagName: "亲子友好" },
  { entityType: "route", entitySlug: "武功山休闲索道路线", tagName: "适合拍照" },

  // 衡山经典登山线
  { entityType: "route", entitySlug: "衡山经典登山线", tagName: "进阶级" },
  { entityType: "route", entitySlug: "衡山经典登山线", tagName: "日出" },
  { entityType: "route", entitySlug: "衡山经典登山线", tagName: "古村" },

  // 衡山古道朝圣线
  { entityType: "route", entitySlug: "衡山古道朝圣线", tagName: "进阶级" },
  { entityType: "route", entitySlug: "衡山古道朝圣线", tagName: "古村" },
  { entityType: "route", entitySlug: "衡山古道朝圣线", tagName: "日出" },

  // 衡山休闲索道路线
  { entityType: "route", entitySlug: "衡山休闲索道路线", tagName: "入门级" },
  { entityType: "route", entitySlug: "衡山休闲索道路线", tagName: "亲子友好" },

  // 西山龙门线
  { entityType: "route", entitySlug: "西山龙门线", tagName: "进阶级" },
  { entityType: "route", entitySlug: "西山龙门线", tagName: "适合拍照" },
  { entityType: "route", entitySlug: "西山龙门线", tagName: "日出" },

  // 西山全景穿越线
  { entityType: "route", entitySlug: "西山全景穿越线", tagName: "挑战级" },
  { entityType: "route", entitySlug: "西山全景穿越线", tagName: "日出" },
  { entityType: "route", entitySlug: "西山全景穿越线", tagName: "摄影" },

  // 西山索道上山徒步线
  { entityType: "route", entitySlug: "西山索道上山徒步线", tagName: "入门级" },
  { entityType: "route", entitySlug: "西山索道上山徒步线", tagName: "亲子友好" },
  { entityType: "route", entitySlug: "西山索道上山徒步线", tagName: "适合拍照" },

  // ==================== 新增城市地点标签 ====================

  // 昆明城市标签
  { entityType: "location", entitySlug: "kunming-city", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "kunming-city", tagName: "古村" },
  { entityType: "location", entitySlug: "kunming-city", tagName: "亲子" },

  // 长沙城市标签
  { entityType: "location", entitySlug: "changsha-city", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "changsha-city", tagName: "山峰" },
  { entityType: "location", entitySlug: "changsha-city", tagName: "亲子" },

  // 香港城市标签
  { entityType: "location", entitySlug: "hongkong-city", tagName: "海岸线" },
  { entityType: "location", entitySlug: "hongkong-city", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "hongkong-city", tagName: "亲子" },

  // 深圳城市标签
  { entityType: "location", entitySlug: "shenzhen-city", tagName: "海岸线" },
  { entityType: "location", entitySlug: "shenzhen-city", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "shenzhen-city", tagName: "亲子" },

  // 成都城市标签
  { entityType: "location", entitySlug: "chengdu-city", tagName: "古村" },
  { entityType: "location", entitySlug: "chengdu-city", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "chengdu-city", tagName: "亲子" },

  // 壹方天地标签
  { entityType: "location", entitySlug: "yifang-tiandi", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "yifang-tiandi", tagName: "亲子" },
  { entityType: "location", entitySlug: "yifang-tiandi", tagName: "团建" },

  // Kuddo Coffee 标签
  { entityType: "location", entitySlug: "kuddo-coffee", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "kuddo-coffee", tagName: "亲子" },
  { entityType: "location", entitySlug: "kuddo-coffee", tagName: "团建" },

  // ==================== 云南三城标签 ====================

  // 大理标签
  { entityType: "location", entitySlug: "dali-old-town", tagName: "古村" },
  { entityType: "location", entitySlug: "dali-old-town", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "dali-old-town", tagName: "亲子" },
  { entityType: "location", entitySlug: "erhai-lake", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "erhai-lake", tagName: "日出" },
  { entityType: "location", entitySlug: "erhai-lake", tagName: "日落" },
  { entityType: "location", entitySlug: "cangshan-mountain", tagName: "山峰" },
  { entityType: "location", entitySlug: "cangshan-mountain", tagName: "适合拍照" },

  // 丽江标签
  { entityType: "location", entitySlug: "lijiang-old-town", tagName: "古村" },
  { entityType: "location", entitySlug: "lijiang-old-town", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "lijiang-old-town", tagName: "亲子" },
  { entityType: "location", entitySlug: "yulong-snow-mountain", tagName: "山峰" },
  { entityType: "location", entitySlug: "yulong-snow-mountain", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "yulong-snow-mountain", tagName: "摄影" },
  { entityType: "location", entitySlug: "lugu-lake", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "lugu-lake", tagName: "日出" },
  { entityType: "location", entitySlug: "lugu-lake", tagName: "露营" },

  // 西双版纳标签
  { entityType: "location", entitySlug: "jinghong-city", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "jinghong-city", tagName: "亲子" },
  { entityType: "location", entitySlug: "xtbg", tagName: "森林" },
  { entityType: "location", entitySlug: "xtbg", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "xtbg", tagName: "亲子" },
  { entityType: "location", entitySlug: "wild-elephant-valley", tagName: "森林" },
  { entityType: "location", entitySlug: "wild-elephant-valley", tagName: "亲子" },
  { entityType: "location", entitySlug: "wild-elephant-valley", tagName: "观鸟" },

  // ==================== 广西三城标签 ====================

  // 桂林标签
  { entityType: "location", entitySlug: "guilin-city", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "guilin-city", tagName: "亲子" },
  { entityType: "location", entitySlug: "guilin-city", tagName: "古村" },
  { entityType: "location", entitySlug: "yangshuo-west-street", tagName: "古村" },
  { entityType: "location", entitySlug: "yangshuo-west-street", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "yangshuo-west-street", tagName: "亲子" },
  { entityType: "location", entitySlug: "longji-terraces", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "longji-terraces", tagName: "日出" },
  { entityType: "location", entitySlug: "longji-terraces", tagName: "摄影" },

  // 漓江标签
  { entityType: "location", entitySlug: "lijiang-river", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "lijiang-river", tagName: "摄影" },
  { entityType: "location", entitySlug: "lijiang-river", tagName: "日出" },
  { entityType: "location", entitySlug: "xingping-old-town", tagName: "古村" },
  { entityType: "location", entitySlug: "xingping-old-town", tagName: "适合拍照" },

  // 柳州标签
  { entityType: "location", entitySlug: "liuzhou-city", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "liuzhou-city", tagName: "亲子" },
  { entityType: "location", entitySlug: "chengyang-bazhai", tagName: "古村" },
  { entityType: "location", entitySlug: "chengyang-bazhai", tagName: "适合拍照" },
  { entityType: "location", entitySlug: "chengyang-bazhai", tagName: "亲子" },
];

/**
 * 插入标签数据
 */
export function seedTags(
  db: Database,
  locations: { slug: string; id: string }[],
  routes: { name: string; id: string }[]
): TagData[] {
  console.log("🏷️  开始插入标签数据...");

  // 插入标签
  const insertTagStmt = db.prepare(`
    INSERT OR IGNORE INTO tags (id, name, type, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const now = Date.now();
  const tagMap = new Map<string, string>(); // name -> id

  for (const tag of tagsData) {
    const id = nanoid();
    insertTagStmt.run(id, tag.name, tag.type, now);
    tagMap.set(tag.name, id);
    console.log(`  ✓ 标签: ${tag.name} (${tag.type})`);
  }

  // 创建实体查找映射
  const locationMap = new Map<string, string>();
  for (const loc of locations) {
    locationMap.set(loc.slug, loc.id);
  }

  const routeMap = new Map<string, string>();
  for (const route of routes) {
    // 使用路线名称作为映射键
    routeMap.set(route.name, route.id);
  }

  // 插入标签关联
  const insertAssocStmt = db.prepare(`
    INSERT OR IGNORE INTO entity_to_tags (id, entity_id, entity_type, tag_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const assoc of entityTagAssociations) {
    const tagId = tagMap.get(assoc.tagName);
    let entityId: string | undefined;

    if (assoc.entityType === "location") {
      entityId = locationMap.get(assoc.entitySlug);
    } else if (assoc.entityType === "route") {
      // 路线使用名称查找
      entityId = routeMap.get(assoc.entitySlug);
    }

    if (tagId && entityId) {
      insertAssocStmt.run(nanoid(), entityId, assoc.entityType, tagId, now);
      console.log(`  ✓ 关联: ${assoc.entitySlug} -> ${assoc.tagName}`);
    }
  }

  console.log(`✅ 标签数据插入完成，共 ${tagsData.length} 个标签\n`);
  return tagsData.map((tag) => ({
    id: tagMap.get(tag.name)!,
    name: tag.name,
    type: tag.type,
  }));
}
