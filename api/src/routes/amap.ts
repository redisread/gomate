import { APIErrors } from "../lib/api-errors";
import { logger } from "../lib/logger";
import { Hono } from "hono";
import type { Env } from "../lib/auth";
import { fetchWithTimeout } from "../lib/timeout";

export const amapRoute = new Hono<{ Bindings: Env }>();

/** 输入提示（地图搜索候选） */
amapRoute.get("/inputtips", async (c) => {
  const AMAP_KEY = c.env.AMAP_SERVER_KEY;
  if (!AMAP_KEY) return c.json(APIErrors.internalError("AMAP_SERVER_KEY not configured"), 500);

  const keywords = c.req.query("keywords") ?? "";
  const city = c.req.query("city") ?? "全国";
  if (!keywords.trim()) return c.json({ status: "0", tips: [] });

  const url = `https://restapi.amap.com/v3/assistant/inputtips?key=${AMAP_KEY}&keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city)}&datatype=all`;
  try {
    const resp = await fetchWithTimeout(url, {}, 8000);
    const data = await resp.json();
    return c.json(data);
  } catch (error) {
    logger.error("[Amap] inputtips timeout:", error);
    return c.json(APIErrors.internalError("Request timeout", { status: "0", tips: [] }), 504);
  }
});

/** 正地理编码（地址 → 坐标） */
amapRoute.get("/geocode", async (c) => {
  const AMAP_KEY = c.env.AMAP_SERVER_KEY;
  if (!AMAP_KEY) return c.json(APIErrors.internalError("AMAP_SERVER_KEY not configured"), 500);

  const address = c.req.query("address") ?? "";
  if (!address.trim()) return c.json({ status: "0", geocodes: [] });

  const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}`;
  try {
    const resp = await fetchWithTimeout(url, {}, 8000);
    const data = await resp.json();
    return c.json(data);
  } catch (error) {
    logger.error("[Amap] geocode timeout:", error);
    return c.json(APIErrors.internalError("Request timeout", { status: "0", geocodes: [] }), 504);
  }
});

/** 逆地理编码（坐标 → 地址） */
amapRoute.get("/regeo", async (c) => {
  const AMAP_KEY = c.env.AMAP_SERVER_KEY;
  if (!AMAP_KEY) return c.json(APIErrors.internalError("AMAP_SERVER_KEY not configured"), 500);

  const location = c.req.query("location") ?? "";
  if (!location) return c.json({ status: "0" });

  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${encodeURIComponent(location)}&radius=100&extensions=base`;
  try {
    const resp = await fetchWithTimeout(url, {}, 8000);
    const data = await resp.json();
    return c.json(data);
  } catch (error) {
    logger.error("[Amap] regeo timeout:", error);
    return c.json(APIErrors.internalError("Request timeout", { status: "0" }), 504);
  }
});
