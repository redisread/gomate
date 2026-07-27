/**
 * Task #203: amap 代码全删后 transportation 端点精简版。
 * 仅返回静态 mapUrl（坐标 → uri.amap.com/marker），subway/driving 恒为 null。
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";
import { safeJsonParse } from "./utils";

const route = new Hono<{ Bindings: Env }>();

function buildNavigationUrl(lat: number, lng: number): string {
  const dst = `destination,${lng},${lat}`;
  return `https://uri.amap.com/marker?position=${encodeURIComponent(dst)}&callnative=1`;
}

route.get("/:id/transportation", async (c) => {
  const locationId = c.req.param("id");
  const db = createDb(c.env.DB);

  try {
    const rows = await db
      .select({
        id: schema.locations.id,
        slug: schema.locations.slug,
        coordinates: schema.locations.coordinates,
      })
      .from(schema.locations)
      .where(eq(schema.locations.id, locationId))
      .limit(1);

    let location = rows[0];
    if (!location) {
      const slugRows = await db
        .select({
          id: schema.locations.id,
          slug: schema.locations.slug,
          coordinates: schema.locations.coordinates,
        })
        .from(schema.locations)
        .where(eq(schema.locations.slug, locationId))
        .limit(1);
      location = slugRows[0];
    }
    if (!location) return c.json(APIErrors.notFound("地点不存在"), 404);

    const coords = safeJsonParse(location.coordinates, { lat: 0, lng: 0 });
    const hasValidCoords =
      coords &&
      typeof coords.lat === "number" &&
      typeof coords.lng === "number" &&
      Number.isFinite(coords.lat) &&
      Number.isFinite(coords.lng) &&
      !(coords.lat === 0 && coords.lng === 0);

    return c.json({
      success: true,
      locationId: location.id,
      transportation: {
        mapUrl: hasValidCoords ? buildNavigationUrl(coords.lat, coords.lng) : "",
        subway: null,
        driving: null,
        amapAllFailed: true,
      },
      meta: { cacheHit: false, staleDays: null },
    });
  } catch (err) {
    logger.error("[transportation] failed", err);
    return c.json(APIErrors.internalError("获取交通信息失败"), 500);
  }
});

export { route as locationsTransportationRoute };
