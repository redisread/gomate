import { Hono } from "hono";
import { eq, like, and, sql, inArray, isNotNull } from "drizzle-orm";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { safeJsonParse } from "../../lib/safe-json";

const locations = new Hono<{ Bindings: Env }>();

/**
 * GET /v1/locations
 * 公开读端点：地点列表，支持分页、cityId、keyword 过滤。
 */
locations.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);

    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query("pageSize") || "12", 10)));
    const search = c.req.query("keyword") || c.req.query("search") || "";
    const cityId = c.req.query("cityId") || "";
    const province = c.req.query("province") || "";
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (search) {
      conditions.push(like(schema.locations.name, `%${search}%`));
    }
    if (cityId) {
      conditions.push(eq(schema.locations.cityId, cityId));
    }
    if (province) {
      // 省过滤：先按 province 解析出城市 id 集合
      const provinceCities = await db
        .select({ id: schema.cities.id })
        .from(schema.cities)
        .where(eq(schema.cities.province, province));
      const cityIds = provinceCities.map((r) => r.id);
      if (cityIds.length === 0) {
        return c.json({ locations: [], total: 0, page, pageSize, totalPages: 0, hasMore: false });
      }
      conditions.push(inArray(schema.locations.cityId, cityIds));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)` })
      .from(schema.locations)
      .where(whereClause);
    const total = cnt;
    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    // Fetch
    const rows = await db.query.locations.findMany({
      where: whereClause,
      columns: {
        id: true,
        name: true,
        slug: true,
        coverImage: true,
        cityId: true,
        difficulty: true,
        durationMin: true,
        description: true,
        images: true,
        bestSeason: true,
        coordinates: true,
        gearEssential: true,
        gearOptional: true,
        extra: true,
      },
      orderBy: (locations, { desc }) => [desc(locations.createdAt)],
      limit: pageSize,
      offset,
    });

    const locations_ = rows.map((loc) => ({
      id: loc.id,
      name: loc.name,
      slug: loc.slug,
      coverImage: loc.coverImage,
      cityId: loc.cityId,
      difficulty: loc.difficulty,
      durationMin: loc.durationMin,
      description: loc.description,
      images: safeJsonParse(loc.images, []),
      bestSeason: safeJsonParse(loc.bestSeason, []),
      coordinates: safeJsonParse(loc.coordinates, { lat: 0, lng: 0 }),
      gearEssential: parseCsvField(loc.gearEssential),
      gearOptional: parseCsvField(loc.gearOptional),
    }));

    return c.json({ success: true, locations: locations_, pagination: { page, pageSize, total, totalPages, hasMore } });
  } catch (error) {
    console.error("[v1/locations] list error:", error);
    return c.json(APIErrors.internalError("获取地点列表失败"), 500);
  }
});

/**
 * GET /v1/locations/:id
 * 公开读端点：地点详情，含坐标/交通/标签。
 */
/**
 * GET /v1/locations/stats
 * 地图聚合数据：按省统计地点数 + 有坐标的地点点（供首页中国地图渲染）。
 */
locations.get("/stats", async (c) => {
  try {
    const db = createDb(c.env.DB);

    const provinceRows = await db
      .select({
        province: schema.cities.province,
        count: sql<number>`count(*)`,
      })
      .from(schema.locations)
      .leftJoin(schema.cities, eq(schema.locations.cityId, schema.cities.id))
      .where(isNotNull(schema.cities.province))
      .groupBy(schema.cities.province)
      .orderBy(sql`count(*) desc`);

    const pointRows = await db.query.locations.findMany({
      columns: { id: true, name: true, slug: true, cityId: true, coordinates: true },
      with: { city: { columns: { name: true, province: true } } },
    });

    const points = pointRows
      .map((loc) => {
        const coords = safeJsonParse<{ lat: number; lng: number } | null>(loc.coordinates, null);
        if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng) || (coords.lat === 0 && coords.lng === 0)) {
          return null;
        }
        return {
          id: loc.id,
          name: loc.name,
          slug: loc.slug,
          cityId: loc.cityId,
          cityName: loc.city?.name ?? "",
          province: loc.city?.province ?? null,
          lat: coords.lat,
          lng: coords.lng,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return c.json({ provinces: provinceRows, points });
  } catch (error) {
    console.error("[locations/stats] failed:", error);
    return c.json(APIErrors.internalError("Failed to load location stats"), 500);
  }
});


locations.get("/:id", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const idOrSlug: string = c.req.param("id") ?? "";

    // Try by id first, then by slug
    let location = await db.query.locations.findFirst({
      where: eq(schema.locations.id, idOrSlug),
    });
    if (!location) {
      location = await db.query.locations.findFirst({
        where: eq(schema.locations.slug, idOrSlug),
      });
    }
    if (!location) return c.json(APIErrors.notFound("地点不存在"), 404);

    // Fetch tags
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

    return c.json({
      success: true,
      location: {
        ...location,
        images: safeJsonParse(location.images, []),
        bestSeason: safeJsonParse(location.bestSeason, []),
        coordinates: safeJsonParse(location.coordinates, { lat: 0, lng: 0 }),
        gearEssential: parseCsvField(location.gearEssential),
        gearOptional: parseCsvField(location.gearOptional),
        tags,
      },
    });
  } catch (error) {
    console.error("[v1/locations/:id] error:", error);
    return c.json(APIErrors.internalError("获取地点详情失败"), 500);
  }
});

function parseCsvField(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
}


export { locations as locationsRoute };
