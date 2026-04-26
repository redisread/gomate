import { Hono } from "hono";
import { eq, and, inArray, asc } from "drizzle-orm";
import { createDb } from "../db";
import * as schema from "../db/schema";
import { createAuth, type Env } from "../lib/auth";

const hikingRoutes = new Hono<{ Bindings: Env }>();

/** 验证管理员权限 */
async function checkAdmin(c: { env: Env; req: { raw: Request } }) {
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

/** 获取路线的标签 */
async function getRoutesTags(
  db: ReturnType<typeof createDb>,
  routeIds: string[]
): Promise<Record<string, typeof schema.tags.$inferSelect[]>> {
  if (routeIds.length === 0) return {};
  const tagResults = await db
    .select({ entityId: schema.entityToTags.entityId, tag: schema.tags })
    .from(schema.entityToTags)
    .leftJoin(schema.tags, eq(schema.entityToTags.tagId, schema.tags.id))
    .where(
      and(
        inArray(schema.entityToTags.entityId, routeIds),
        eq(schema.entityToTags.entityType, "route")
      )
    );

  const tagsMap: Record<string, typeof schema.tags.$inferSelect[]> = {};
  tagResults.forEach((result) => {
    if (!tagsMap[result.entityId]) tagsMap[result.entityId] = [];
    if (result.tag) tagsMap[result.entityId].push(result.tag);
  });
  return tagsMap;
}

/**
 * GET /hiking-routes
 * 获取路线列表，支持 ?locationId, ?cityId, ?difficulty, ?limit, ?offset 筛选
 */
hikingRoutes.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const locationId = c.req.query("locationId");
    const cityId = c.req.query("cityId");
    const difficulty = c.req.query("difficulty");
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!, 10) : undefined;
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset")!, 10) : 0;

    const conditions = [];
    if (locationId) conditions.push(eq(schema.routes.locationId, locationId));
    if (cityId) conditions.push(eq(schema.routes.cityId, cityId));
    if (difficulty) conditions.push(eq(schema.routes.difficulty, difficulty));

    const query = db
      .select({
        route: schema.routes,
        location: schema.locations,
        city: schema.cities,
      })
      .from(schema.routes)
      .leftJoin(schema.locations, eq(schema.routes.locationId, schema.locations.id))
      .leftJoin(schema.cities, eq(schema.routes.cityId, schema.cities.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .offset(offset);

    const results = limit ? await query.limit(limit) : await query;

    const routeIds = results.map((r) => r.route.id);
    const tagsMap = await getRoutesTags(db, routeIds);

    const formattedRoutes = results.map(({ route, location, city }) => {
      const extra = route.extra ? JSON.parse(route.extra) : {};
      return {
        id: route.id,
        locationId: route.locationId,
        cityId: route.cityId,
        name: route.name,
        description: route.description,
        difficulty: route.difficulty,
        durationMin: route.durationMin,
        durationMax: route.durationMax,
        distance: route.distance,
        elevation: route.elevation,
        routeGuide: route.routeGuide ? JSON.parse(route.routeGuide) : null,
        equipmentNeeded: extra.equipmentNeeded || [],
        warnings: extra.warnings || [],
        tags: tagsMap[route.id] || [],
        location,
        city,
        createdAt: route.createdAt,
        updatedAt: route.updatedAt,
      };
    });

    return c.json({ success: true, routes: formattedRoutes });
  } catch (error) {
    console.error("Get routes error:", error);
    return c.json({ error: "获取路线列表失败" }, 500);
  }
});

/**
 * POST /hiking-routes
 * 创建新路线（需要管理员权限）
 */
hikingRoutes.post("/", async (c) => {
  try {
    await checkAdmin(c);
    const db = createDb(c.env.DB);
    const body = await c.req.json<{
      locationId?: string; cityId?: string; name?: string; description?: string;
      difficulty?: string; durationMin?: number; durationMax?: number;
      distance?: number; elevation?: number;
      routeGuide?: { overview: string; tips: string[] };
      equipmentNeeded?: string[]; warnings?: string[]; tagIds?: string[];
    }>();

    if (!body.locationId || !body.cityId || !body.name || !body.difficulty ||
        body.durationMin === undefined || body.durationMax === undefined || body.distance === undefined) {
      return c.json({ error: "缺少必填字段" }, 400);
    }

    const routeId = `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const extra: Record<string, unknown> = {};
    if (body.equipmentNeeded) extra.equipmentNeeded = body.equipmentNeeded;
    if (body.warnings) extra.warnings = body.warnings;

    await db.insert(schema.routes).values({
      id: routeId,
      locationId: body.locationId,
      cityId: body.cityId,
      name: body.name,
      description: body.description,
      difficulty: body.difficulty,
      durationMin: body.durationMin,
      durationMax: body.durationMax,
      distance: body.distance,
      elevation: body.elevation,
      routeGuide: body.routeGuide ? JSON.stringify(body.routeGuide) : null,
      extra: Object.keys(extra).length > 0 ? JSON.stringify(extra) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 关联标签
    if (body.tagIds && body.tagIds.length > 0) {
      const records = body.tagIds.map((tagId) => ({
        id: `ett_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        entityId: routeId,
        entityType: "route" as const,
        tagId,
        createdAt: new Date(),
      }));
      await db.insert(schema.entityToTags).values(records);
    }

    return c.json({ success: true, routeId });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json({ error: "未登录" }, 401);
    if (message === "无权限访问") return c.json({ error: "无权限访问" }, 403);
    console.error("Create route error:", error);
    return c.json({ error: "创建路线失败" }, 500);
  }
});

/**
 * GET /hiking-routes/:id
 * 获取路线详情
 */
hikingRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const result = await db
      .select({
        route: schema.routes,
        location: schema.locations,
        city: schema.cities,
      })
      .from(schema.routes)
      .leftJoin(schema.locations, eq(schema.routes.locationId, schema.locations.id))
      .leftJoin(schema.cities, eq(schema.routes.cityId, schema.cities.id))
      .where(eq(schema.routes.id, id))
      .limit(1);

    if (!result.length) return c.json({ error: "路线不存在" }, 404);

    const { route, location, city } = result[0];

    // 获取标签
    const tagsMap = await getRoutesTags(db, [id]);

    // 获取 POI
    const routePois = await db
      .select({ poi: schema.pois, role: schema.entityToPois })
      .from(schema.entityToPois)
      .innerJoin(schema.pois, eq(schema.entityToPois.poiId, schema.pois.id))
      .where(and(eq(schema.entityToPois.entityType, "route"), eq(schema.entityToPois.entityId, id)))
      .orderBy(asc(schema.entityToPois.order));

    const formattedPois = routePois.map(({ poi, role }) => ({
      id: poi.id,
      name: poi.name,
      description: poi.description,
      coordinates: poi.coordinates ? JSON.parse(poi.coordinates) : null,
      images: poi.images ? JSON.parse(poi.images) : [],
      extra: poi.extra ? JSON.parse(poi.extra) : null,
      order: role.order,
      roleType: role.roleType,
      roleSpecificData: role.roleSpecificData ? JSON.parse(role.roleSpecificData) : null,
    }));

    const extra = route.extra ? JSON.parse(route.extra) : {};

    return c.json({
      success: true,
      route: {
        id: route.id,
        locationId: route.locationId,
        cityId: route.cityId,
        name: route.name,
        description: route.description,
        difficulty: route.difficulty,
        durationMin: route.durationMin,
        durationMax: route.durationMax,
        distance: route.distance,
        elevation: route.elevation,
        routeGuide: route.routeGuide
          ? { ...JSON.parse(route.routeGuide), warnings: extra.warnings || [] }
          : { overview: "", tips: [], warnings: extra.warnings || [] },
        equipmentNeeded: extra.equipmentNeeded || [],
        tags: tagsMap[id] || [],
        location,
        city,
        pois: formattedPois,
        createdAt: route.createdAt,
        updatedAt: route.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get route error:", error);
    return c.json({ error: "获取路线详情失败" }, 500);
  }
});

/**
 * PUT /hiking-routes/:id
 * 更新路线（需要管理员权限）
 */
hikingRoutes.put("/:id", async (c) => {
  try {
    await checkAdmin(c);
    const id = c.req.param("id");
    const db = createDb(c.env.DB);
    const body = await c.req.json<{
      name?: string; description?: string; difficulty?: string;
      durationMin?: number; durationMax?: number; distance?: number; elevation?: number;
      routeGuide?: { overview: string; tips: string[] };
      equipmentNeeded?: string[]; warnings?: string[]; tagIds?: string[];
    }>();

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
    if (body.durationMin !== undefined) updateData.durationMin = body.durationMin;
    if (body.durationMax !== undefined) updateData.durationMax = body.durationMax;
    if (body.distance !== undefined) updateData.distance = body.distance;
    if (body.elevation !== undefined) updateData.elevation = body.elevation;
    if (body.routeGuide !== undefined) updateData.routeGuide = JSON.stringify(body.routeGuide);

    if (body.equipmentNeeded !== undefined || body.warnings !== undefined) {
      const extra: Record<string, unknown> = {};
      if (body.equipmentNeeded !== undefined) extra.equipmentNeeded = body.equipmentNeeded;
      if (body.warnings !== undefined) extra.warnings = body.warnings;
      updateData.extra = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;
    }

    await db.update(schema.routes).set(updateData as Partial<typeof schema.routes.$inferInsert>).where(eq(schema.routes.id, id));

    // 更新标签
    if (body.tagIds !== undefined) {
      await db.delete(schema.entityToTags).where(
        and(eq(schema.entityToTags.entityId, id), eq(schema.entityToTags.entityType, "route"))
      );
      if (body.tagIds.length > 0) {
        const records = body.tagIds.map((tagId) => ({
          id: `ett_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          entityId: id,
          entityType: "route" as const,
          tagId,
          createdAt: new Date(),
        }));
        await db.insert(schema.entityToTags).values(records);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json({ error: "未登录" }, 401);
    if (message === "无权限访问") return c.json({ error: "无权限访问" }, 403);
    console.error("Update route error:", error);
    return c.json({ error: "更新路线失败" }, 500);
  }
});

/**
 * DELETE /hiking-routes/:id
 * 删除路线（需要管理员权限）
 */
hikingRoutes.delete("/:id", async (c) => {
  try {
    await checkAdmin(c);
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const existing = await db.select({ id: schema.routes.id }).from(schema.routes).where(eq(schema.routes.id, id)).limit(1);
    if (!existing.length) return c.json({ error: "路线不存在" }, 404);

    await db.delete(schema.routes).where(eq(schema.routes.id, id));

    return c.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "未登录") return c.json({ error: "未登录" }, 401);
    if (message === "无权限访问") return c.json({ error: "无权限访问" }, 403);
    console.error("Delete route error:", error);
    return c.json({ error: "删除路线失败" }, 500);
  }
});

export { hikingRoutes as hikingRoutesRoute };
