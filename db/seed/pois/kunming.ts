/**
 * 昆明西山 POI 数据种子
 */

import type Database from "better-sqlite3";
import { nanoid } from "nanoid";
import type { LocationData } from "../locations";
import type { RouteData } from "../routes";
import type { PoiData } from "./index";

const kunmingPoisData = [
  {
    name: "龙门石窟",
    description: "西山标志性景点，悬崖峭壁上的石刻艺术",
    coordinates: JSON.stringify({ lat: 24.9635, lng: 102.6308 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "石刻艺术",
      ticket: "包含在景区门票内",
      bestTime: "全天",
    }),
  },
  {
    name: "华亭寺",
    description: "西山最大的佛教寺院，始建于元代",
    coordinates: JSON.stringify({ lat: 24.9589, lng: 102.6295 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "古刹",
      type: "佛教寺院",
      history: "始建于元代",
    }),
  },
  {
    name: "太华寺",
    description: "西山著名古寺，环境清幽",
    coordinates: JSON.stringify({ lat: 24.9612, lng: 102.6301 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "古刹",
      type: "佛教寺院",
    }),
  },
  {
    name: "聂耳墓",
    description: "人民音乐家聂耳之墓，爱国主义教育基地",
    coordinates: JSON.stringify({ lat: 24.9567, lng: 102.6278 }),
    category: "checkpoint",
    extra: JSON.stringify({
      feature: "纪念地",
      type: "名人墓地",
    }),
  },
  {
    name: "凌虚阁",
    description: "西山观景台，可远眺滇池",
    coordinates: JSON.stringify({ lat: 24.9623, lng: 102.6305 }),
    category: "viewpoint",
    extra: JSON.stringify({
      feature: "观景平台",
      view: "滇池全景",
    }),
  },
  {
    name: "西山公园入口",
    description: "西山风景区正门，可乘索道或步行上山",
    coordinates: JSON.stringify({ lat: 24.9567, lng: 102.6289 }),
    category: "checkpoint",
    extra: JSON.stringify({
      hasParking: true,
      hasTicketOffice: true,
      transport: "地铁3号线",
    }),
  },
];

const entityToPoisData = [
  {
    poiName: "龙门石窟",
    entityType: "location",
    entitySlug: "kunming-xishan",
    roleType: "viewpoint",
  },
  {
    poiName: "华亭寺",
    entityType: "location",
    entitySlug: "kunming-xishan",
    roleType: "checkpoint",
  },
  {
    poiName: "太华寺",
    entityType: "location",
    entitySlug: "kunming-xishan",
    roleType: "checkpoint",
  },
  {
    poiName: "聂耳墓",
    entityType: "location",
    entitySlug: "kunming-xishan",
    roleType: "checkpoint",
  },
  {
    poiName: "凌虚阁",
    entityType: "location",
    entitySlug: "kunming-xishan",
    roleType: "viewpoint",
  },
  {
    poiName: "西山公园入口",
    entityType: "location",
    entitySlug: "kunming-xishan",
    roleType: "checkpoint",
  },
];

export function seedKunmingPois(
  db: Database,
  locations: LocationData[],
  routes: RouteData[]
): PoiData[] {
  const insertPoiStmt = db.prepare(`
    INSERT OR IGNORE INTO pois (id, name, description, coordinates, category, extra, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const poiMap = new Map<string, string>();

  for (const poi of kunmingPoisData) {
    const id = nanoid();
    insertPoiStmt.run(
      id,
      poi.name,
      poi.description,
      poi.coordinates,
      poi.category,
      poi.extra,
      now,
      now
    );
    poiMap.set(poi.name, id);
    console.log(`  ✓ POI: ${poi.name}`);
  }

  const locationMap = new Map<string, string>();
  for (const loc of locations) {
    locationMap.set(loc.slug, loc.id);
  }

  const insertEntityPoiStmt = db.prepare(`
    INSERT OR IGNORE INTO entity_to_pois (
      id, poi_id, entity_type, entity_id, role_type, "order", role_specific_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const assoc of entityToPoisData) {
    const poiId = poiMap.get(assoc.poiName);
    const entityId = locationMap.get(assoc.entitySlug);

    if (poiId && entityId) {
      insertEntityPoiStmt.run(
        nanoid(),
        poiId,
        assoc.entityType,
        entityId,
        assoc.roleType,
        null,
        null,
        now
      );
      console.log(`  ✓ 关联: ${assoc.poiName} -> ${assoc.entitySlug}`);
    }
  }

  return kunmingPoisData.map((poi) => ({
    id: poiMap.get(poi.name)!,
    name: poi.name,
  }));
}
