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
