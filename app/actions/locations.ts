"use server";

import { getDB } from "@/db";
import { locations, routes, cities, teams, teamMembers, tags, entityToTags } from "@/db/schema";
import { eq, desc, asc, and, inArray, sql, count } from "drizzle-orm";
import { unstable_cache } from "next/cache";

// 获取地点列表（包含路线信息）
export async function getLocations() {
  const db = await getDB();
  const data = await db.query.locations.findMany({
    orderBy: [asc(locations.name)],
    with: {
      city: true,
      routes: {
        orderBy: [asc(routes.difficulty)],
      },
    },
  });

  // 获取标签
  const locationIds = data.map((loc) => loc.id);
  const locationTags = await getLocationsTags(locationIds);

  return data.map((location) => ({
    ...location,
    tags: locationTags[location.id] || [],
  }));
}

// 缓存版本的地点列表
export const getCachedLocations = unstable_cache(
  async () => getLocations(),
  ["locations"],
  {
    revalidate: 3600, // 1小时缓存
    tags: ["locations"],
  }
);

// 获取地点详情（通过 ID）
export async function getLocationById(id: string) {
  const db = await getDB();
  const location = await db.query.locations.findFirst({
    where: eq(locations.id, id),
    with: {
      city: true,
      routes: {
        orderBy: [asc(routes.difficulty)],
      },
      teams: {
        where: eq(teams.status, "recruiting"),
        with: {
          route: true,
          leader: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
          members: {
            where: eq(teamMembers.status, "approved"),
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: [desc(teams.createdAt)],
      },
    },
  });

  if (!location) {
    return null;
  }

  // 获取标签
  const locationTags = await getLocationsTags([id]);

  return {
    ...location,
    tags: locationTags[id] || [],
  };
}

// 获取地点详情（通过 slug）
export async function getLocationBySlug(slug: string) {
  const db = await getDB();
  const location = await db.query.locations.findFirst({
    where: eq(locations.slug, slug),
    with: {
      city: true,
      routes: {
        orderBy: [asc(routes.difficulty)],
      },
      teams: {
        where: eq(teams.status, "recruiting"),
        with: {
          route: true,
          leader: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
          members: {
            where: eq(teamMembers.status, "approved"),
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: [desc(teams.createdAt)],
      },
    },
  });

  if (!location) {
    return null;
  }

  // 获取标签
  const locationTags = await getLocationsTags([location.id]);

  return {
    ...location,
    tags: locationTags[location.id] || [],
  };
}

// 缓存版本的地点详情
export async function getCachedLocationBySlug(slug: string) {
  return unstable_cache(
    async () => getLocationBySlug(slug),
    [`location-${slug}`],
    {
      revalidate: 300, // 5分钟缓存
      tags: [`location-${slug}`, "locations"],
    }
  )();
}

// 获取地点的路线列表
export async function getLocationRoutes(locationId: string) {
  const db = await getDB();
  const routesList = await db.query.routes.findMany({
    where: eq(routes.locationId, locationId),
    orderBy: [asc(routes.difficulty)],
  });

  // 获取路线标签
  const routeIds = routesList.map((route) => route.id);
  const routeTags = await getRoutesTags(routeIds);

  return routesList.map((route) => ({
    ...route,
    tags: routeTags[route.id] || [],
  }));
}

// 获取多个地点的标签
async function getLocationsTags(locationIds: string[]): Promise<Record<string, any[]>> {
  if (locationIds.length === 0) {
    return {};
  }

  const db = await getDB();
  const tagResults = await db
    .select({
      entityId: entityToTags.entityId,
      tag: tags,
    })
    .from(entityToTags)
    .leftJoin(tags, eq(entityToTags.tagId, tags.id))
    .where(
      and(
        inArray(entityToTags.entityId, locationIds),
        eq(entityToTags.entityType, "location")
      )
    );

  const tagsMap: Record<string, any[]> = {};
  tagResults.forEach((result) => {
    if (!tagsMap[result.entityId]) {
      tagsMap[result.entityId] = [];
    }
    if (result.tag) {
      tagsMap[result.entityId].push(result.tag);
    }
  });

  return tagsMap;
}

// 获取多个路线的标签
async function getRoutesTags(routeIds: string[]): Promise<Record<string, any[]>> {
  if (routeIds.length === 0) {
    return {};
  }

  const db = await getDB();
  const tagResults = await db
    .select({
      entityId: entityToTags.entityId,
      tag: tags,
    })
    .from(entityToTags)
    .leftJoin(tags, eq(entityToTags.tagId, tags.id))
    .where(
      and(
        inArray(entityToTags.entityId, routeIds),
        eq(entityToTags.entityType, "route")
      )
    );

  const tagsMap: Record<string, any[]> = {};
  tagResults.forEach((result) => {
    if (!tagsMap[result.entityId]) {
      tagsMap[result.entityId] = [];
    }
    if (result.tag) {
      tagsMap[result.entityId].push(result.tag);
    }
  });

  return tagsMap;
}

// 获取热门标签（按关联次数排序）
export async function getPopularTags(limit: number = 15) {
  const db = await getDB();

  // 查询标签及其关联数量
  const result = await db
    .select({
      tagId: tags.id,
      tagName: tags.name,
      tagType: tags.type,
      count: count(entityToTags.entityId),
    })
    .from(tags)
    .leftJoin(entityToTags, eq(tags.id, entityToTags.tagId))
    .where(eq(entityToTags.entityType, "location"))
    .groupBy(tags.id)
    .orderBy(desc(count(entityToTags.entityId)))
    .limit(limit);

  return result.map(item => ({
    id: item.tagId,
    name: item.tagName,
    type: item.tagType,
    count: item.count,
  }));
}

// 获取所有标签（按类型分组）
export async function getAllTagsByType() {
  const db = await getDB();

  const allTags = await db
    .select({
      tagId: tags.id,
      tagName: tags.name,
      tagType: tags.type,
      count: count(entityToTags.entityId),
    })
    .from(tags)
    .leftJoin(entityToTags, eq(tags.id, entityToTags.tagId))
    .where(eq(entityToTags.entityType, "location"))
    .groupBy(tags.id)
    .orderBy(desc(count(entityToTags.entityId)));

  // 按类型分组
  const grouped = {
    location: [] as Array<{ id: string; name: string; count: number }>,
    activity: [] as Array<{ id: string; name: string; count: number }>,
  };

  allTags.forEach(item => {
    const tagData = {
      id: item.tagId,
      name: item.tagName,
      count: item.count,
    };

    if (item.tagType === "location") {
      grouped.location.push(tagData);
    } else if (item.tagType === "activity") {
      grouped.activity.push(tagData);
    }
  });

  return grouped;
}
