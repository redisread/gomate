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
  return new Response(object.body, { headers });
});

// 404 兜底
app.notFound((c) => c.json({ error: "Not found" }, 404));

// 全局错误处理
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;

/**
 * Cloudflare Workers 定时任务入口
 * 每天执行一次，更新过期队伍状态：
 * - recruiting + 过期 → cancelled
 * - formed + 过期 → completed
 */
export const scheduled = async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
  const db = createDb(env.DB);
  const updatedIds = await updateExpiredTeams(db);
  console.log(`[Cron] 已更新 ${updatedIds.length} 个过期队伍:`, updatedIds);
};
