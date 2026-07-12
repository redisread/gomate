import { Hono } from "hono";
import { eq, like, and, sql, inArray, asc } from "drizzle-orm";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { getCachedOrFetch, buildListCacheKey, setPublicCacheHeaders } from "../../lib/cache";
import { safeJsonParse } from "./utils";

const queries = new Hono<{ Bindings: Env }>();

/**
 * GET /locations
 * 获取地点列表，支持分页、搜索、城市筛选、标签筛选
 * ?tags=true 返回热门标签
 * ?allTags=true 返回按类型分组的所有标签
 * ?view=card 返回轻量卡片视图（首页用），跳过 routes/tags/images 等重字段
 */
queries.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);

    // 返回热门标签
    if (c.req.query("tags") === "true") {
      const popularTags = await db
        .select({ id: schema.tags.id, name: schema.tags.name, type: schema.tags.type })
        .from(schema.tags)
        .limit(15);
      setPublicCacheHeaders(c);
      return c.json({ success: true, tags: popularTags });
    }

    // 返回所有标签（按类型分组）
    if (c.req.query("allTags") === "true") {
      const allTags = await db
        .select({ id: schema.tags.id, name: schema.tags.name, type: schema.tags.type })
        .from(schema.tags)
        .orderBy(schema.tags.type, schema.tags.name);
      const grouped: Record<string, typeof allTags> = {};
      for (const tag of allTags) {
        if (!grouped[tag.type]) grouped[tag.type] = [];
        grouped[tag.type].push(tag);
      }
      setPublicCacheHeaders(c);
      return c.json({ success: true, tags: grouped });
    }

    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query("pageSize") || "12", 10)));
    const search = c.req.query("search") || "";
    const cityId = c.req.query("cityId") || "";
    const tagIdsParam = c.req.query("tagIds");
    const tagIds = tagIdsParam ? tagIdsParam.split(",").filter(Boolean) : [];
    const type = c.req.query("type") || "";
    const view = c.req.query("view") || ""; // "card" for lightweight view

    // 公共列表数据，使用缓存（键含全部查询参数，避免不同过滤串池）
    const cacheKey = buildListCacheKey("locations", {
      page: String(page), pageSize: String(pageSize), search, cityId,
      tagIds: tagIdsParam, type, view,
    });
    const body = await getCachedOrFetch(cacheKey, async () => {

    // 构建过滤条件
    const conditions = [];
    if (search) conditions.push(like(schema.locations.name, `%${search}%`));
    if (cityId) conditions.push(eq(schema.locations.cityId, cityId));
    if (type) conditions.push(eq(schema.locations.type, type));

    // 如果有标签筛选，先查出符合标签的 locationIds
    let tagLocationIds: string[] | null = null;
    if (tagIds.length > 0) {
      const tagMatches = await db
        .select({ entityId: schema.entityToTags.entityId })
        .from(schema.entityToTags)
        .where(and(
          eq(schema.entityToTags.entityType, "location"),
          inArray(schema.entityToTags.tagId, tagIds)
        ));
      tagLocationIds = [...new Set(tagMatches.map((t) => t.entityId))];
      if (tagLocationIds.length === 0) {
        return { success: true, locations: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
      }
      conditions.push(inArray(schema.locations.id, tagLocationIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 查询总数
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.locations)
      .where(whereClause);

    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    // ==================== view=card 轻量模式 ====================
    if (view === "card") {
      // 只查询卡片需要的字段，不 join city/routes
      const locationList = await db
        .select({
          id: schema.locations.id,
          name: schema.locations.name,
          slug: schema.locations.slug,
          type: schema.locations.type,
          subtitle: schema.locations.subtitle,
          description: schema.locations.description,
          address: schema.locations.address,
          cityName: schema.locations.cityName,
          coverImage: schema.locations.coverImage,
          createdAt: schema.locations.createdAt,
        })
        .from(schema.locations)
        .where(whereClause)
        .limit(pageSize)
        .offset(offset);

      const locationIds = locationList.map((l) => l.id);

      // 只取每个地点的第一条路线（难度和耗时用）
      const firstRoutes = locationIds.length > 0
        ? await db
            .select({
              locationId: schema.routes.locationId,
              difficulty: schema.routes.difficulty,
              durationMin: schema.routes.durationMin,
              durationMax: schema.routes.durationMax,
              distance: schema.routes.distance,
              elevation: schema.routes.elevation,
            })
            .from(schema.routes)
            .where(inArray(schema.routes.locationId, locationIds))
        : [];

      const routeByLocation: Record<string, typeof firstRoutes[0]> = {};
      for (const r of firstRoutes) {
        if (!routeByLocation[r.locationId]) routeByLocation[r.locationId] = r;
      }

      // 只取每个地点第一个标签
      const firstTags = locationIds.length > 0
        ? await db
            .select({
              entityId: schema.entityToTags.entityId,
              tagName: schema.tags.name,
              tagType: schema.tags.type,
            })
            .from(schema.entityToTags)
            .innerJoin(schema.tags, eq(schema.tags.id, schema.entityToTags.tagId))
            .where(and(
              eq(schema.entityToTags.entityType, "location"),
              inArray(schema.entityToTags.entityId, locationIds)
            ))
        : [];

      const firstTagByLocation: Record<string, { name: string; type: string }> = {};
      for (const t of firstTags) {
        if (!firstTagByLocation[t.entityId]) firstTagByLocation[t.entityId] = { name: t.tagName, type: t.tagType };
      }

      const formattedLocations = locationList.map((loc) => {
        const route = routeByLocation[loc.id];
        const tag = firstTagByLocation[loc.id];
        return {
          id: loc.id,
          name: loc.name,
          slug: loc.slug,
          type: loc.type,
          subtitle: loc.subtitle,
          description: loc.description,
          address: loc.address,
          cityName: loc.cityName,
          coverImage: loc.coverImage,
          difficulty: route?.difficulty ?? null,
          tags: tag ? [{ name: tag.name, type: tag.type }] : [],
          routes: route ? [{
            difficulty: route.difficulty,
            durationMin: route.durationMin,
            durationMax: route.durationMax,
            distance: route.distance,
            elevation: route.elevation,
          }] : [],
          createdAt: loc.createdAt,
        };
      });

      return { success: true, locations: formattedLocations, pagination: { page, pageSize, total, totalPages } };
    }

    // ==================== 完整模式（默认） ====================
    // 查询地点列表
    const locationList = await db.query.locations.findMany({
      where: whereClause,
      with: { city: true, routes: true },
      limit: pageSize,
      offset,
    });

    // 查询各地点的标签
    const locationIds = locationList.map((l) => l.id);
    const tagRelations = locationIds.length > 0
      ? await db
          .select({ entityId: schema.entityToTags.entityId, tagId: schema.entityToTags.tagId, tagName: schema.tags.name, tagType: schema.tags.type })
          .from(schema.entityToTags)
          .innerJoin(schema.tags, eq(schema.tags.id, schema.entityToTags.tagId))
          .where(and(
            eq(schema.entityToTags.entityType, "location"),
            inArray(schema.entityToTags.entityId, locationIds)
          ))
      : [];

    const tagsByLocation: Record<string, { id: string; name: string; type: string }[]> = {};
    for (const rel of tagRelations) {
      if (!tagsByLocation[rel.entityId]) tagsByLocation[rel.entityId] = [];
      tagsByLocation[rel.entityId].push({ id: rel.tagId, name: rel.tagName, type: rel.tagType });
    }

    const formattedLocations = locationList.map((location) => {
      const firstRoute = location.routes?.[0];
      return {
        id: location.id, name: location.name, slug: location.slug,
        type: location.type,
        subtitle: location.subtitle, description: location.description,
        address: location.address, cityId: location.cityId,
        cityName: location.city?.name || location.cityName,
        coverImage: location.coverImage,
        images: safeJsonParse(location.images, [] as string[]),
        bestSeason: safeJsonParse(location.bestSeason, [] as string[]),
        coordinates: safeJsonParse(location.coordinates, { lat: 0, lng: 0 }),
        extra: safeJsonParse(location.extra, undefined),
        routes: location.routes?.map((route: typeof schema.routes.$inferSelect) => ({
          id: route.id, locationId: route.locationId, cityId: route.cityId,
          name: route.name, description: route.description, difficulty: route.difficulty,
          durationMin: route.durationMin, durationMax: route.durationMax,
          distance: route.distance, elevation: route.elevation,
          routeGuide: safeJsonParse(route.routeGuide, undefined),
          extra: safeJsonParse(route.extra, undefined),
          createdAt: route.createdAt, updatedAt: route.updatedAt,
        })) || [],
        tags: tagsByLocation[location.id] || [],
        difficulty: firstRoute?.difficulty,
        createdAt: location.createdAt, updatedAt: location.updatedAt,
      };
    });

    return { success: true, locations: formattedLocations, pagination: { page, pageSize, total, totalPages } };
    });
    setPublicCacheHeaders(c);
    return c.json(body);
  } catch (error) {
    console.error("Get locations error:", error);
    return c.json(APIErrors.internalError("获取地点列表失败"), 500);
  }
});

/**
 * GET /locations/:id
 * 获取单个地点详情
 */
queries.get("/:id", async (c) => {
  try {
    const idOrSlug = c.req.param("id");
    const db = createDb(c.env.DB);

    // 先尝试按 id 查询
    let location = await db.query.locations.findFirst({
      where: eq(schema.locations.id, idOrSlug),
      with: {
        routes: true,
      },
    });

    // 如果未找到，尝试按 slug 查询
    if (!location) {
      location = await db.query.locations.findFirst({
        where: eq(schema.locations.slug, idOrSlug),
        with: {
          routes: true,
        },
      });
    }

    if (!location) return c.json(APIErrors.notFound("地点不存在"), 404);

    // 查询地点关联的标签
    const tagRelations = await db
      .select({ tagId: schema.entityToTags.tagId, tagName: schema.tags.name, tagType: schema.tags.type })
      .from(schema.entityToTags)
      .innerJoin(schema.tags, eq(schema.tags.id, schema.entityToTags.tagId))
      .where(
        and(
          eq(schema.entityToTags.entityType, "location"),
          eq(schema.entityToTags.entityId, location.id)
        )
      );

    const tags = tagRelations.map((r) => ({ id: r.tagId, name: r.tagName, type: r.tagType }));

    // 格式化路线数据
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedRoutes = (location.routes || []).map((route: any) => ({
      ...route,
      coordinates: route.coordinates ? safeJsonParse(route.coordinates, { lat: 0, lng: 0 }) : undefined,
      waypoints: route.waypoints ? safeJsonParse(route.waypoints, []) : undefined,
      equipmentNeeded: route.equipmentNeeded ? safeJsonParse(route.equipmentNeeded, []) : undefined,
      warnings: route.warnings ? safeJsonParse(route.warnings, []) : undefined,
      tags: route.tags ? safeJsonParse(route.tags, []) : undefined,
    }));

    return c.json({
      success: true,
      location: {
        ...location,
        images: safeJsonParse(location.images, [] as string[]),
        bestSeason: safeJsonParse(location.bestSeason, [] as string[]),
        coordinates: safeJsonParse(location.coordinates, { lat: 0, lng: 0 }),
        extra: safeJsonParse(location.extra, undefined),
        tags,
        routes: formattedRoutes,
      },
    });
  } catch (error) {
    console.error("Get location error:", error);
    return c.json(APIErrors.internalError("获取地点详情失败"), 500);
  }
});

/**
 * GET /locations/:id/pois
 * 获取地点关联的打卡点（POI）列表
 */
queries.get("/:id/pois", async (c) => {
  try {
    const idOrSlug = c.req.param("id");
    const db = createDb(c.env.DB);

    // 验证地点存在
    let location = await db.query.locations.findFirst({
      where: eq(schema.locations.id, idOrSlug),
      columns: { id: true },
    });

    if (!location) {
      location = await db.query.locations.findFirst({
        where: eq(schema.locations.slug, idOrSlug),
        columns: { id: true },
      });
    }

    if (!location) return c.json(APIErrors.notFound("地点不存在"), 404);

    // 查询地点关联的 POI（entityType = "location"）
    const locationPois = await db
      .select({ poi: schema.pois, role: schema.entityToPois })
      .from(schema.entityToPois)
      .innerJoin(schema.pois, eq(schema.entityToPois.poiId, schema.pois.id))
      .where(
        and(
          eq(schema.entityToPois.entityType, "location"),
          eq(schema.entityToPois.entityId, location.id)
        )
      )
      .orderBy(asc(schema.entityToPois.order));

    const pois = locationPois.map(({ poi, role }) => ({
      id: poi.id,
      name: poi.name,
      description: poi.description,
      coordinates: poi.coordinates ? JSON.parse(poi.coordinates) : null,
      images: poi.images ? JSON.parse(poi.images) : [],
      extra: poi.extra ? JSON.parse(poi.extra) : null,
      order: role.order,
      roleType: role.roleType,
      roleSpecificData: role.roleSpecificData
        ? JSON.parse(role.roleSpecificData)
        : null,
    }));

    return c.json({ success: true, pois });
  } catch (error) {
    console.error("Get location pois error:", error);
    return c.json(APIErrors.internalError("获取打卡点失败"), 500);
  }
});

/**
 * GET /locations/:id/tags
 * 获取地点当前关联的标签列表
 */
queries.get("/:id/tags", async (c) => {
  try {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const rows = await db
      .select({ tag: schema.tags })
      .from(schema.entityToTags)
      .innerJoin(schema.tags, eq(schema.entityToTags.tagId, schema.tags.id))
      .where(
        and(
          eq(schema.entityToTags.entityId, id),
          eq(schema.entityToTags.entityType, "location")
        )
      );

    return c.json({ success: true, tags: rows.map((r) => r.tag) });
  } catch (error) {
    console.error("Get location tags error:", error);
    return c.json(APIErrors.internalError("获取标签失败"), 500);
  }
});

export default queries;
