import { Hono } from "hono";
import type { Env } from "../lib/auth";

export const amapRoute = new Hono<{ Bindings: Env }>();

const AMAP_KEY = "8125796b7ee94b6571ad5f6c03089ed3";

/** 输入提示（地图搜索候选） */
amapRoute.get("/inputtips", async (c) => {
  const keywords = c.req.query("keywords") ?? "";
  const city = c.req.query("city") ?? "全国";
  if (!keywords.trim()) return c.json({ status: "0", tips: [] });

  const url = `https://restapi.amap.com/v3/assistant/inputtips?key=${AMAP_KEY}&keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city)}&datatype=all`;
  const resp = await fetch(url);
  const data = await resp.json();
  return c.json(data);
});

/** 正地理编码（地址 → 坐标） */
amapRoute.get("/geocode", async (c) => {
  const address = c.req.query("address") ?? "";
  if (!address.trim()) return c.json({ status: "0", geocodes: [] });

  const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}`;
  const resp = await fetch(url);
  const data = await resp.json();
  return c.json(data);
});

/** 逆地理编码（坐标 → 地址） */
amapRoute.get("/regeo", async (c) => {
  const location = c.req.query("location") ?? "";
  if (!location) return c.json({ status: "0" });

  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${encodeURIComponent(location)}&radius=100&extensions=base`;
  const resp = await fetch(url);
  const data = await resp.json();
  return c.json(data);
});
