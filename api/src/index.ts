import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors";
import { authRoute } from "./routes/auth";
import { teamsRoute } from "./routes/teams";
import { locationsRoute } from "./routes/locations";
import { usersRoute } from "./routes/users";
import { uploadRoute } from "./routes/upload";
import { citiesRoute } from "./routes/cities";
import { tagsRoute } from "./routes/tags";
import { contactRoute } from "./routes/contact";
import { feedbackRoute } from "./routes/feedback";
import { favoritesRoute } from "./routes/favorites";
import { hikingRoutesRoute } from "./routes/hiking-routes";
import { adminRoute } from "./routes/admin";
import { amapRoute } from "./routes/amap";
import { poisRoute } from "./routes/pois";
import { updateExpiredTeams } from "./lib/team-status";
import { createDb } from "./db";
import { fetchWithTimeout } from "./lib/timeout";
import type { Env } from "./lib/auth";

const app = new Hono<{ Bindings: Env }>();

// 全局 CORS 中间件
app.use("*", corsMiddleware);

// 健康检查端点
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// 路由注册
app.route("/auth", authRoute);
app.route("/teams", teamsRoute);
app.route("/locations", locationsRoute);
app.route("/users", usersRoute);
app.route("/user", usersRoute); // 兼容前端 /user/* 路径
app.route("/upload", uploadRoute);
app.route("/cities", citiesRoute);
app.route("/tags", tagsRoute);
app.route("/contact", contactRoute);
app.route("/feedback", feedbackRoute);
app.route("/favorites", favoritesRoute);
app.route("/routes", hikingRoutesRoute);
app.route("/admin", adminRoute);
app.route("/amap", amapRoute);
app.route("/pois", poisRoute);

// R2 本地代理（挂在顶层，对齐原 Next.js /api/r2/* 路径）
app.get("/r2/*", async (c) => {
  if (!c.env.R2) return c.json({ error: "R2 not configured" }, 500);
  const key = c.req.path.replace(/^\/r2\//, "");
  if (!key) return c.json({ error: "Key is required" }, 400);
  const object = await c.env.R2.get(key);
  if (!object) return c.json({ error: "File not found" }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(object.body, { headers });
});

/** 图片代理：供前端 Canvas 绘图使用，绕过跨域限制 */
app.get("/proxy-image", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json({ error: "url is required" }, 400);

  // 验证 URL 格式
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return c.json({ error: "Invalid URL" }, 400);
  }

  // 验证域名白名单
  const ALLOWED_IMAGE_DOMAINS = [
    "gomate.cos.jiahongw.com",
    "avatars.githubusercontent.com",
    "lh3.googleusercontent.com",
    "cdn.discordapp.com",
  ];
  if (!ALLOWED_IMAGE_DOMAINS.includes(urlObj.hostname)) {
    return c.json({ error: "Domain not allowed" }, 403);
  }

  // 速率限制检查
  const clientIP = c.req.header("CF-Connecting-IP") || "unknown";
  const RATE_LIMIT_MAX = 100; // 每小时最大请求数
  const RATE_LIMIT_KEY = `rate:proxy:${clientIP}`;
  const kv = c.env.GOMATE_KV;

  if (kv) {
    const current = await kv.get(RATE_LIMIT_KEY);
    const count = current ? parseInt(current as string, 10) : 0;
    if (count >= RATE_LIMIT_MAX) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
    // 使用 KV TTL（1小时）
    await kv.put(RATE_LIMIT_KEY, String(count + 1), { expirationTtl: 3600 });
  }

  try {
    const resp = await fetchWithTimeout(url, {}, 10000);
    if (!resp.ok) return c.json({ error: "fetch failed" }, 502);

    const headers = new Headers();
    const contentType = resp.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    headers.set("Access-Control-Allow-Origin", "*");
    // 优化缓存：图片缓存在边缘 24 小时
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");

    return new Response(resp.body, { headers });
  } catch {
    return c.json({ error: "proxy failed" }, 502);
  }
});

// 404 兜底
app.notFound((c) => c.json({ error: "Not found" }, 404));

// 全局错误处理
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default {
  fetch: app.fetch,

  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext) {
    const db = createDb(env.DB);
    const updatedIds = await updateExpiredTeams(db);
    console.log(`[Cron] 已更新 ${updatedIds.length} 个过期队伍:`, updatedIds);
  },
};
