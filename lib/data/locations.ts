import { cache } from "react";
import { db, isMockMode } from "@/db";
import { locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { locations as mockLocations, getLocationById as getMockLocationById } from "./mock";

// 将 mock 数据转换为 D1/SQLite 格式
function transformMockToDbFormat(mockLocation: typeof mockLocations[0]) {
  return {
    id: mockLocation.id,
    name: mockLocation.name,
    slug: mockLocation.id,
    description: mockLocation.description,
    difficulty: mockLocation.difficulty,
    duration: mockLocation.duration,
    distance: mockLocation.distance,
    bestSeason: JSON.stringify(mockLocation.bestSeason),
    coverImage: mockLocation.coverImage,
    images: JSON.stringify(mockLocation.images),
    routeDescription: mockLocation.routeGuide.overview,
    tips: mockLocation.routeGuide.tips.join("\n"),
    equipmentNeeded: JSON.stringify(mockLocation.routeGuide.tips),
    coordinates: JSON.stringify(mockLocation.location.coordinates),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// 解析 SQLite JSON 字段
function parseLocation(location: any) {
  if (!location) return null;
  return {
    ...location,
    bestSeason: typeof location.bestSeason === 'string' ? JSON.parse(location.bestSeason) : location.bestSeason,
    images: typeof location.images === 'string' ? JSON.parse(location.images) : location.images,
    equipmentNeeded: location.equipmentNeeded ? (typeof location.equipmentNeeded === 'string' ? JSON.parse(location.equipmentNeeded) : location.equipmentNeeded) : [],
    coordinates: typeof location.coordinates === 'string' ? JSON.parse(location.coordinates) : location.coordinates,
  };
}

// 缓存地点列表获取
export const getCachedLocations = cache(async () => {
  // Mock 模式：返回 mock 数据
  if (isMockMode) {
    return mockLocations.map(transformMockToDbFormat).map(parseLocation);
  }

  // 数据库模式
  if (!db) {
    throw new Error("Database not initialized");
  }

  const results = await db.query.locations.findMany({
    orderBy: (locations, { desc }) => [desc(locations.createdAt)],
  });

  return results.map(parseLocation);
});

// 缓存单个地点获取
export const getCachedLocationBySlug = cache(async (slug: string) => {
  // Mock 模式：从 mock 数据查找
  if (isMockMode) {
    const mockLocation = getMockLocationById(slug);
    if (!mockLocation) return undefined;
    return parseLocation(transformMockToDbFormat(mockLocation));
  }

  // 数据库模式
  if (!db) {
    throw new Error("Database not initialized");
  }

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
  // Mock 模式
  if (isMockMode) {
    const mockLocation = getMockLocationById(id);
    if (!mockLocation) return undefined;
    return parseLocation(transformMockToDbFormat(mockLocation));
  }

  // 数据库模式
  if (!db) {
    throw new Error("Database not initialized");
  }

  const result = await db.query.locations.findFirst({
    where: eq(locations.id, id),
  });

  return parseLocation(result);
});
