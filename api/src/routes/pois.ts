import { Hono } from "hono";
import { like, or } from "drizzle-orm";
import { createDb } from "../db";
import * as schema from "../db/schema";
import type { Env } from "../lib/auth";

export const poisRoute = new Hono<{ Bindings: Env }>();

/**
 * GET /pois
 * 获取打卡点列表（支持关键词搜索），供编辑页选择关联
 */
poisRoute.get("/", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const search = c.req.query("search")?.trim() ?? "";
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50"), 200);

    const rows = search
      ? await db
          .select()
          .from(schema.pois)
          .where(
            or(
              like(schema.pois.name, `%${search}%`),
              like(schema.pois.category, `%${search}%`)
            )
          )
          .limit(limit)
      : await db.select().from(schema.pois).limit(limit);

    const pois = rows.map((poi) => ({
      id: poi.id,
      name: poi.name,
      description: poi.description,
      category: poi.category,
      coordinates: (() => {
        try { return JSON.parse(poi.coordinates); } catch { return { lat: 0, lng: 0 }; }
      })(),
    }));

    return c.json({ success: true, pois });
  } catch (error) {
    console.error("Get pois error:", error);
    return c.json({ error: "获取打卡点列表失败" }, 500);
  }
});
