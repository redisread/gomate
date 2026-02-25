import { cache } from "react";
import { getDB } from "@/db";
import { locations } from "@/db/schema";
import { eq } from "drizzle-orm";

// 解析 SQLite JSON 字段
function parseLocation(location: any) {
  if (!location) return null;
  return {
    ...location,
    bestSeason: typeof location.bestSeason === 'string' ? JSON.parse(location.bestSeason) : location.bestSeason,
    images: typeof location.images === 'string' ? JSON.parse(location.images) : location.images,
    equipmentNeeded: location.equipmentNeeded ? (typeof location.equipmentNeeded === 'string' ? JSON.parse(location.equipmentNeeded) : location.equipmentNeeded) : [],
    coordinates: typeof location.coordinates === 'string' ? JSON.parse(location.coordinates) : location.coordinates,
    tags: typeof location.tags === 'string' ? JSON.parse(location.tags) : location.tags,
    waypoints: typeof location.waypoints === 'string' ? JSON.parse(location.waypoints) : location.waypoints,
    warnings: typeof location.warnings === 'string' ? JSON.parse(location.warnings) : location.warnings,
    facilities: typeof location.facilities === 'string' ? JSON.parse(location.facilities) : location.facilities,
    routeGuide: typeof location.routeGuide === 'string' ? JSON.parse(location.routeGuide) : location.routeGuide,
  };
}

// 缓存地点列表获取
export const getCachedLocations = cache(async () => {
  const db = await getDB();

  const results = await db.query.locations.findMany({
    orderBy: (locations, { desc }) => [desc(locations.createdAt)],
  });

  return results.map(parseLocation);
});

// 缓存单个地点获取（通过 slug）
export const getCachedLocationBySlug = cache(async (slug: string) => {
  const db = await getDB();

  const result = await db.query.locations.findFirst({
    where: eq(locations.slug, slug),
    with: {
      teams: {
        with: {
          leader: true,
        },
      },
    },
  });

  return parseLocation(result);
});

// 根据 ID 获取地点（用于 teams.ts）
export const getCachedLocationById = cache(async (id: string) => {
  const db = await getDB();

  const result = await db.query.locations.findFirst({
    where: eq(locations.id, id),
  });

  return parseLocation(result);
});
