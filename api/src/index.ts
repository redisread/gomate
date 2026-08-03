import { logger } from "./lib/logger";
import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors";
import { authRoute } from "./routes/auth";
import { teamsRoute } from "./routes/teams/index";
import { locationsRoute } from "./routes/locations";
import { usersRoute } from "./routes/users";
import { uploadRoute } from "./routes/upload";
import { sharesRoute } from "./routes/shares";
import { citiesRoute } from "./routes/cities";
import { tagsRoute } from "./routes/tags";
import { contactRoute } from "./routes/contact";
import { feedbackRoute } from "./routes/feedback";
import { favoritesRoute } from "./routes/favorites";
import { adminRoute } from "./routes/admin";
import messagesRoute from "./routes/messages";
import activityPostsRoute from "./routes/activity-posts";
import storiesRoute from "./routes/stories";
import { shareImageRoute } from "./routes/share-image";
import { localCircleHomeRoute } from "./routes/local-circle/home";
import { v1Route } from "./routes/v1/index";
import { updateExpiredTeams } from "./lib/team-status";
import { createDb } from "./db";
import { fetchWithTimeout } from "./lib/timeout";
import { APIErrors } from "./lib/api-errors";
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
app.route("/upload", uploadRoute);
app.route("/shares", sharesRoute);
app.route("/cities", citiesRoute);
app.route("/tags", tagsRoute);
app.route("/contact", contactRoute);
app.route("/feedback", feedbackRoute);
app.route("/favorites", favoritesRoute);
app.route("/admin", adminRoute);
app.route("/messages", messagesRoute);
app.route("/", activityPostsRoute);
app.route("/stories", storiesRoute);
app.route("/share-image", shareImageRoute);
app.route("/local-circle/home", localCircleHomeRoute);
app.route("/v1", v1Route);

// R2 本地代理（挂在顶层，对齐原 Next.js /api/r2/* 路径）
app.get("/r2/*", async (c) => {
  if (!c.env.R2) return c.json(APIErrors.internalError("R2 not configured"), 500);
  const key = c.req.path.replace(/^\/r2\//, "");
  if (!key) return c.json(APIErrors.badRequest("Key is required"), 400);
  const object = await c.env.R2.get(key);
  if (!object) return c.json(APIErrors.notFound("File not found"), 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(object.body, { headers });
});

// 图片代理：允许的域名白名单（支持通配符）
const ALLOWED_IMAGE_PATTERNS = [
  "gomate.cos.jiahongw.com",
  "*.githubusercontent.com",  // 覆盖所有子域名
  "*.googleusercontent.com",
  "cdn.discordapp.com",
];

/**
 * 验证域名是否在白名单中（支持通配符）
 * @param hostname - 要验证的域名
 * @returns boolean
 */
function isDomainAllowed(hostname: string): boolean {
  return ALLOWED_IMAGE_PATTERNS.some(pattern => {
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1); // ".githubusercontent.com"
      const idx = hostname.lastIndexOf(suffix);
      return idx > 0 && hostname[idx - 1] === ".";
    }
    return hostname === pattern;
  });
}

/** 图片代理：供前端 Canvas 绘图使用，绕过跨域限制 */
app.get("/proxy-image", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json(APIErrors.badRequest("url is required"), 400);

  // 验证 URL 格式
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return c.json(APIErrors.badRequest("Invalid URL"), 400);
  }

  // 验证域名白名单
  if (!isDomainAllowed(urlObj.hostname)) {
    return c.json(APIErrors.forbidden("Domain not allowed"), 403);
  }

  try {
    const resp = await fetchWithTimeout(url, {}, 10000);
    if (!resp.ok) return c.json(APIErrors.badGateway("fetch failed"), 502);

    const headers = new Headers();
    const contentType = resp.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    headers.set("Access-Control-Allow-Origin", "*");
    // 优化缓存：图片缓存在边缘 24 小时
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");

    return new Response(resp.body, { headers });
  } catch {
    return c.json(APIErrors.badGateway("proxy failed"), 502);
  }
});

// 404 兜底
app.notFound((c) => c.json(APIErrors.notFound("Not found"), 404));

// 全局错误处理
app.onError((err, c) => {
  logger.error("Unhandled error:", err);
  return c.json(APIErrors.internalError("Internal server error"), 500);
});

export default {
  fetch: app.fetch,

  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext) {
    try {
      const db = createDb(env.DB);
      const updatedIds = await updateExpiredTeams(db);
      logger.info(`[Cron] 已更新 ${updatedIds.length} 个过期队伍:`, updatedIds);
    } catch (error) {
      logger.error("[Cron] 更新过期队伍失败:", error);
      // 可考虑上报到监控系统
      // 注意：Cron 任务失败不会重试，错误仅用于日志记录
    }
  },
};
// Deployment trigger: 2026年 6月 2日 星期二 01时21分45秒 CST
