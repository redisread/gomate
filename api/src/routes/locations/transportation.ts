/**
 * P0-B T2 GET /locations/:id/transportation (task #169)
 *
 * spec: notes/gomate-p0b-location-decision-spec.md v1.1 §3 + §11
 *
 * 计算并返回 location「怎么到」决策数据（最近地铁 + 自驾城市中心 + mapUrl）。
 *
 * ## Response 契约（200）
 * ```
 * {
 *   success: true,
 *   locationId: string,
 *   transportation: {
 *     mapUrl: string,               // 始终可用（无 amap 依赖）
 *     subway: {
 *       station: string,
 *       lines: string[],
 *       distanceMeters: number,
 *       walkMinutes: number,
 *       approximate: boolean,       // true → 前端加"骑车/打车接驳"提示
 *     } | null,
 *     driving: {
 *       distanceKm: number,          // 1 位小数
 *       durationMinutes: number,
 *       referencePointLabel: { zh, en, ja },
 *     } | null,
 *     amapAllFailed: boolean,       // true → 前端切换为单一 mapUrl 链接视觉
 *   },
 *   meta: {
 *     cacheHit: boolean,
 *     staleDays: number | null,    // 缓存数据距计算时的天数，>7 时前端标注"信息更新于 X 天前"
 *   }
 * }
 * ```
 *
 * ## 缓存策略（spec §3.6）
 *
 *  - KV key: `p0b:transport:v1:{locationId}`（location 位置固定，不需 seed/ua）
 *  - TTL: 24h（spec §3.6 revalidate 86400）
 *  - Stale window: 7d（超过 7d 从 KV 拿到时给 `meta.staleDays`，前端展示"信息更新于 X 天前"）
 *  - **注意**：Cloudflare KV 的 TTL 到期后 key 自动消失，所以 stale 场景实际上需要用**长期 TTL + 记录 computedAt**
 *    ×  ✔  我们采用「TTL=30d + 记录 computedAt」而不是「TTL=24h 硬淘汰」，让 stale window 可用
 *    ×  ✔  spec §3.6 revalidate 24h 语义由 route 层判断：computedAt < 24h → 直接返；≥24h → 回源
 *    ×  ✔  computedAt ≥7d → 回源同时 fallback stale response（保证 amap 挂时详情页不空白）
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import * as schema from "../../db/schema";
import type { Env } from "../../lib/auth";
import { APIErrors } from "../../lib/api-errors";
import { logger } from "../../lib/logger";
import { safeJsonParse } from "./utils";
import { computeTransportation, buildAmapNavigationUrl } from "../../lib/amap-decision";
import type { TransportationResult } from "../../lib/amap-decision";
import { getCurrentCity } from "@gomate/lib";

const route = new Hono<{ Bindings: Env }>();

// ==================== 缓存策略常量 ====================

/** KV TTL：30 天（久于业务上限，保证 stale fallback 可用） */
const KV_TTL_SECONDS = 30 * 24 * 60 * 60;
/** 新鲜度窗口：24h（spec §3.6，命中直接返缓存） */
const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Stale 阈值：7 天，超过则给前端 meta.staleDays 提示 */
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
/** KV key 前缀，接 spec v2 时改 v2 */
const KV_KEY_PREFIX = "p0b:transport:v1:";

interface CachedEntry {
  version: 1;
  locationId: string;
  computedAt: number;
  data: TransportationResult;
}

// ==================== 端点 ====================

route.get("/:id/transportation", async (c) => {
  const locationId = c.req.param("id");
  const db = createDb(c.env.DB);
  const now = Date.now();

  try {
    // 1) 查 location（同时支持 id/slug）— 只取需要的列
    const rows = await db
      .select({
        id: schema.locations.id,
        slug: schema.locations.slug,
        coordinates: schema.locations.coordinates,
        cityId: schema.locations.cityId,
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
          cityId: schema.locations.cityId,
        })
        .from(schema.locations)
        .where(eq(schema.locations.slug, locationId))
        .limit(1);
      location = slugRows[0];
    }
    if (!location) return c.json(APIErrors.notFound("地点不存在"), 404);

    const coords = safeJsonParse(location.coordinates, { lat: 0, lng: 0 });
    if (
      !coords ||
      typeof coords.lat !== "number" ||
      typeof coords.lng !== "number" ||
      !Number.isFinite(coords.lat) ||
      !Number.isFinite(coords.lng) ||
      (coords.lat === 0 && coords.lng === 0)
    ) {
      // 无坐标数据 → 前端只能什么都不显示；返 mapUrl-only 让前端 "block 整体不渲染"
      return c.json({
        success: true,
        locationId: location.id,
        transportation: {
          mapUrl: "",
          subway: null,
          driving: null,
          amapAllFailed: true,
        },
        meta: { cacheHit: false, staleDays: null },
      });
    }

    // 2) 计算城市 key（用于 getCityCenter 里的中心点）
    //    优先 location.cityId → city name → 归一；未登录用户默认 shenzhen fallback
    const cityRow = location.cityId
      ? await db
          .select({ name: schema.cities.name })
          .from(schema.cities)
          .where(eq(schema.cities.id, location.cityId))
          .limit(1)
      : [];
    const cityNameFromLoc = cityRow[0]?.name ?? null;
    // getCurrentCity 会走 session/CF-IPCity/fallback 三级；这里 location 自身城市优先
    const { city } = getCurrentCity(c.req.raw, cityNameFromLoc);

    // 3) 尝试从 KV 读缓存
    const kv = c.env.GOMATE_KV;
    const cacheKey = `${KV_KEY_PREFIX}${location.id}`;
    let cached: CachedEntry | null = null;
    if (kv) {
      try {
        const raw = await kv.get(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as CachedEntry;
          if (parsed?.version === 1 && parsed.locationId === location.id) {
            cached = parsed;
          }
        }
      } catch (err) {
        logger.warn("[transportation] KV read failed:", err);
      }
    }

    // 4) 新鲜命中直接返
    if (cached && now - cached.computedAt < FRESH_WINDOW_MS) {
      const ageMs = now - cached.computedAt;
      return c.json({
        success: true,
        locationId: location.id,
        transportation: cached.data,
        meta: {
          cacheHit: true,
          staleDays: ageMs >= STALE_THRESHOLD_MS ? Math.floor(ageMs / (24 * 60 * 60 * 1000)) : null,
        },
      });
    }

    // 5) 回源 amap
    const amapKey = c.env.AMAP_SERVER_KEY;
    let data: TransportationResult;
    if (amapKey) {
      data = await computeTransportation({
        lat: coords.lat,
        lng: coords.lng,
        city,
        amapKey,
      });
    } else {
      // env 没配 key → 仅 mapUrl
      data = {
        mapUrl: buildAmapNavigationUrl(coords.lat, coords.lng),
        subway: null,
        driving: null,
        amapAllFailed: true,
      };
    }

    // 6) amap 全挂 && 有旧缓存 → 用旧缓存 stale response（保证详情页不空白）
    if (data.amapAllFailed && cached) {
      const ageMs = now - cached.computedAt;
      return c.json({
        success: true,
        locationId: location.id,
        transportation: cached.data,
        meta: {
          cacheHit: true,
          staleDays: Math.max(1, Math.floor(ageMs / (24 * 60 * 60 * 1000))),
        },
      });
    }

    // 7) 写 KV（fire-and-forget，失败不影响响应）
    if (kv) {
      const entry: CachedEntry = {
        version: 1,
        locationId: location.id,
        computedAt: now,
        data,
      };
      void kv
        .put(cacheKey, JSON.stringify(entry), { expirationTtl: KV_TTL_SECONDS })
        .catch((err) => logger.warn("[transportation] KV write failed:", err));
    }

    return c.json({
      success: true,
      locationId: location.id,
      transportation: data,
      meta: { cacheHit: false, staleDays: null },
    });
  } catch (err) {
    logger.error("[transportation] failed", err);
    return c.json(APIErrors.internalError("获取交通信息失败"), 500);
  }
});

export { route as locationsTransportationRoute };
