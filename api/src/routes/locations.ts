import { Hono } from "hono";
import { eq, like, and, sql, inArray, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createAuth } from "../lib/auth";
import { createDb } from "../db";
import * as schema from "../db/schema";
import type { Env } from "../lib/auth";

const locations = new Hono<{ Bindings: Env }>();

/** 安全解析 JSON 字段 */
function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    if (Array.isArray(fallback)) {
      return value.split(/[,、]/).map((s: string) => s.trim()).filter(Boolean) as unknown as T;
    }
    return fallback;
  }
}

/** 验证管理员权限 */
async function requireAdmin(c: { env: Env; req: { raw: Request } }) {
  const authInstance = createAuth(c.env);
  const session = await authInstance.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new Error("未登录");
  const db = createDb(c.env.DB);
  const user = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .then((rows) => rows[0]);
  if (!user || user.role !== "admin") throw new Error("无权限访问");
  return session;
}

/**
 * GET /locations
 * 获取地点列表，支持分页、搜索、城市筛选、标签筛选
 * ?tags=true 返回热门标签
 * ?allTags=true 返回按类型分组的所有标签
 */
locations.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);

    // 返回热门标签
    if (c.req.query("tags") === "true") {
      const popularTags = await db
        .select({ id: schema.tags.id, name: schema.tags.name, type: schema.tags.type })
        .from(schema.tags)
        .limit(15);
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
      return c.json({ success: true, tags: grouped });
    }

    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(200, parseInt(c.req.query("pageSize") || "12", 10));
    const search = c.req.query("search") || "";
    const cityId = c.req.query("cityId") || "";
    const tagIdsParam = c.req.query("tagIds");
    const tagIds = tagIdsParam ? tagIdsParam.split(",").filter(Boolean) : [];
    const type = c.req.query("type") || "";

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
        return c.json({ success: true, locations: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
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

    return c.json({ success: true, locations: formattedLocations, pagination: { page, pageSize, total, totalPages } });
  } catch (error) {
    console.error("Get locations error:", error);
    return c.json({ error: "获取地点列表失败" }, 500);
  }
});

/**
 * POST /locations
 * 创建新地点（需要管理员权限）
 */
locations.post("/", async (c) => {
  try {
    await requireAdmin(c);
    const db = createDb(c.env.DB);
    const body = await c.req.json();
    const id = nanoid();
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    await db.insert(schema.locations).values({
      id, name: body.name, slug, type: body.type || null, subtitle: body.subtitle || null,
      description: body.description, address: body.address || null,
      cityId: body.cityId, cityName: body.cityName || null,
      bestSeason: JSON.stringify(body.bestSeason || []),
      coverImage: body.coverImage,
      images: JSON.stringify(body.images || []),
      coordinates: JSON.stringify(body.coordinates || { lat: 0, lng: 0 }),
      extra: body.extra ? JSON.stringify(body.extra) : null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    return c.json({ success: true, location: { id, slug } });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json({ error: "未登录" }, 401);
    if (message === "无权限访问") return c.json({ error: "无权限访问" }, 403);
    console.error("Create location error:", error);
    return c.json({ error: "创建地点失败" }, 500);
  }
});

/**
 * PUT /locations
 * 更新地点（需要管理员权限）
 */
locations.put("/", async (c) => {
  try {
    await requireAdmin(c);
    const db = createDb(c.env.DB);
    const body = await c.req.json();
    const { id, ...updateData } = body;

    if (!id) return c.json({ error: "缺少地点 ID" }, 400);

    const dataToUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.slug !== undefined) dataToUpdate.slug = updateData.slug;
    if (updateData.type !== undefined) dataToUpdate.type = updateData.type || null;
    if (updateData.subtitle !== undefined) dataToUpdate.subtitle = updateData.subtitle || null;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.address !== undefined) dataToUpdate.address = updateData.address || null;
    if (updateData.cityId !== undefined) dataToUpdate.cityId = updateData.cityId;
    if (updateData.cityName !== undefined) dataToUpdate.cityName = updateData.cityName || null;
    if (updateData.bestSeason !== undefined) dataToUpdate.bestSeason = JSON.stringify(updateData.bestSeason);
    if (updateData.coverImage !== undefined) dataToUpdate.coverImage = updateData.coverImage;
    if (updateData.images !== undefined) dataToUpdate.images = JSON.stringify(updateData.images);
    if (updateData.coordinates !== undefined) dataToUpdate.coordinates = JSON.stringify(updateData.coordinates);
    if (updateData.extra !== undefined) dataToUpdate.extra = updateData.extra ? JSON.stringify(updateData.extra) : null;

    await db.update(schema.locations).set(dataToUpdate).where(eq(schema.locations.id, id));

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json({ error: "未登录" }, 401);
    if (message === "无权限访问") return c.json({ error: "无权限访问" }, 403);
    console.error("Update location error:", error);
    return c.json({ error: "更新地点失败" }, 500);
  }
});

/**
 * GET /locations/:id
 * 获取单个地点详情
 */
locations.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const location = await db.query.locations.findFirst({
      where: eq(schema.locations.id, id),
      with: {
        routes: true,
      },
    });

    if (!location) return c.json({ error: "地点不存在" }, 404);

    // 查询地点关联的标签
    const tagRelations = await db
      .select({ tagId: schema.entityToTags.tagId, tagName: schema.tags.name, tagType: schema.tags.type })
      .from(schema.entityToTags)
      .innerJoin(schema.tags, eq(schema.tags.id, schema.entityToTags.tagId))
      .where(
        and(
          eq(schema.entityToTags.entityType, "location"),
          eq(schema.entityToTags.entityId, id)
        )
      );

    const tags = tagRelations.map((r) => ({ id: r.tagId, name: r.tagName, type: r.tagType }));

    // 格式化路线数据
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
    return c.json({ error: "获取地点详情失败" }, 500);
  }
});

/**
 * GET /locations/:id/pois
 * 获取地点关联的打卡点（POI）列表
 */
locations.get("/:id/pois", async (c) => {
  try {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    // 验证地点存在
    const location = await db.query.locations.findFirst({
      where: eq(schema.locations.id, id),
      columns: { id: true },
    });
    if (!location) return c.json({ error: "地点不存在" }, 404);

    // 查询地点关联的 POI（entityType = "location"）
    const locationPois = await db
      .select({ poi: schema.pois, role: schema.entityToPois })
      .from(schema.entityToPois)
      .innerJoin(schema.pois, eq(schema.entityToPois.poiId, schema.pois.id))
      .where(
        and(
          eq(schema.entityToPois.entityType, "location"),
          eq(schema.entityToPois.entityId, id)
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
    return c.json({ error: "获取打卡点失败" }, 500);
  }
});

/**
 * DELETE /locations/:id
 * 删除地点（需要管理员权限）
 */
locations.delete("/:id", async (c) => {
  try {
    await requireAdmin(c);
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const existing = await db.query.locations.findFirst({ where: eq(schema.locations.id, id) });
    if (!existing) return c.json({ error: "地点不存在" }, 404);

    await db.delete(schema.locations).where(eq(schema.locations.id, id));

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json({ error: "未登录" }, 401);
    if (message === "无权限访问") return c.json({ error: "无权限访问" }, 403);
    console.error("Delete location error:", error);
    return c.json({ error: "删除地点失败" }, 500);
  }
});

/**
 * GET /locations/:id/tags
 * 获取地点当前关联的标签列表
 */
locations.get("/:id/tags", async (c) => {
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
    return c.json({ error: "获取标签失败" }, 500);
  }
});

/**
 * PUT /locations/:id/tags
 * 全量替换地点关联的标签（需要管理员权限）
 * body: { tagIds: string[] }
 */
locations.put("/:id/tags", async (c) => {
  try {
    await requireAdmin(c);
    const id = c.req.param("id");
    const { tagIds } = await c.req.json<{ tagIds: string[] }>();
    const db = createDb(c.env.DB);

    // 删除旧关联
    await db
      .delete(schema.entityToTags)
      .where(
        and(
          eq(schema.entityToTags.entityId, id),
          eq(schema.entityToTags.entityType, "location")
        )
      );

    // 批量插入新关联
    if (tagIds && tagIds.length > 0) {
      await db.insert(schema.entityToTags).values(
        tagIds.map((tagId) => ({
          id: nanoid(),
          entityId: id,
          entityType: "location" as const,
          tagId,
        }))
      );
    }

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json({ error: "未登录" }, 401);
    if (message === "无权限访问") return c.json({ error: "无权限访问" }, 403);
    console.error("Update location tags error:", error);
    return c.json({ error: "更新标签失败" }, 500);
  }
});

/**
 * PUT /locations/:id/pois
 * 全量替换地点关联的打卡点（需要管理员权限）
 * body: { pois: Array<{ poiId: string; roleType: string; order: number }> }
 */
locations.put("/:id/pois", async (c) => {
  try {
    await requireAdmin(c);
    const id = c.req.param("id");
    const { pois: poiLinks } = await c.req.json<{
      pois: Array<{ poiId: string; roleType: string; order: number }>;
    }>();
    const db = createDb(c.env.DB);

    // 删除旧关联
    await db
      .delete(schema.entityToPois)
      .where(
        and(
          eq(schema.entityToPois.entityId, id),
          eq(schema.entityToPois.entityType, "location")
        )
      );

    // 批量插入新关联
    if (poiLinks && poiLinks.length > 0) {
      await db.insert(schema.entityToPois).values(
        poiLinks.map((link) => ({
          id: nanoid(),
          entityId: id,
          entityType: "location" as const,
          poiId: link.poiId,
          roleType: link.roleType as schema.PoiRoleType,
          order: link.order,
        }))
      );
    }

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json({ error: "未登录" }, 401);
    if (message === "无权限访问") return c.json({ error: "无权限访问" }, 403);
    console.error("Update location pois error:", error);
    return c.json({ error: "更新打卡点失败" }, 500);
  }
});

export { locations as locationsRoute };
