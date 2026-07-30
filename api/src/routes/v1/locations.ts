import { Hono } from "hono";
import { eq, like, and, sql } from "drizzle-orm";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { safeJsonParse } from "../locations/utils";
import { apiRateLimitMiddleware } from "../../lib/rate-limit";

const locations = new Hono<{ Bindings: Env }>();

/**
 * GET /v1/locations
 * 公开读端点：地点列表，支持分页、cityId、keyword 过滤。
 */
locations.get("/", apiRateLimitMiddleware("read", 600), async (c) => {
  try {
    const db = createDb(c.env.DB);

    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query("pageSize") || "12", 10)));
    const search = c.req.query("keyword") || c.req.query("search") || "";
    const cityId = c.req.query("cityId") || "";
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (search) {
      conditions.push(like(schema.locations.name, `%${search}%`));
    }
    if (cityId) {
      conditions.push(eq(schema.locations.cityId, cityId));
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
locations.get("/:id", apiRateLimitMiddleware("read", 600), async (c) => {
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
