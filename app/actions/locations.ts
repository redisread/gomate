"use server";

import { getDB } from "@/db";
import { locations, routes, cities, teams, teamMembers, tags, entityToTags } from "@/db/schema";
import { eq, desc, asc, and, inArray, sql, count, like, or } from "drizzle-orm";
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

// 分页查询参数类型
export interface GetLocationsPaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  cityId?: string;
  tagIds?: string[];
}

// 分页查询返回类型
export interface GetLocationsPaginationResult {
  locations: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 获取地点列表（分页 + 筛选）
export async function getLocationsWithPagination(
  params: GetLocationsPaginationParams = {}
): Promise<GetLocationsPaginationResult> {
  const db = await getDB();

  const {
    page = 1,
    pageSize = 12,
    search = "",
    cityId = "",
    tagIds = [],
  } = params;

  // 限制每页最大数量
  const limit = Math.min(pageSize, 50);
  const offset = (page - 1) * limit;

  // 构建筛选条件
  const conditions: any[] = [];

  // 搜索条件（名称或描述）
  if (search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    conditions.push(
      or(
        like(locations.name, searchPattern),
        like(locations.description, searchPattern)
      )
    );
  }

  // 城市筛选
  if (cityId) {
    conditions.push(eq(locations.cityId, cityId));
  }

  // 标签筛选 - 获取符合标签的地点ID
  let locationIdsWithTags: string[] = [];
  if (tagIds.length > 0) {
    const tagResults = await db
      .select({ locationId: entityToTags.entityId })
      .from(entityToTags)
      .where(
        and(
          eq(entityToTags.entityType, "location"),
          inArray(entityToTags.tagId, tagIds)
        )
      )
      .groupBy(entityToTags.entityId);

    locationIdsWithTags = tagResults.map((r) => r.locationId);

    if (locationIdsWithTags.length === 0) {
      // 没有符合条件的地点，直接返回空结果
      return {
        locations: [],
        total: 0,
        page,
        pageSize: limit,
        totalPages: 0,
      };
    }

    conditions.push(inArray(locations.id, locationIdsWithTags));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 查询总数
  const countResult = await db
    .select({ count: count() })
    .from(locations)
    .where(whereClause || sql`1=1`);

  const total = countResult[0]?.count || 0;

  // 查询分页数据
  const data = await db.query.locations.findMany({
    where: whereClause,
    orderBy: [desc(locations.updatedAt)],
    limit,
    offset,
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

  const locationsWithTags = data.map((location) => ({
    ...location,
    tags: locationTags[location.id] || [],
  }));

  return {
    locations: locationsWithTags,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}
