import { cors } from "hono/cors";

/** CORS 中间件，允许前端和移动端跨域请求 */
export const corsMiddleware = cors({
  origin: (origin) => {
    // 允许本地开发、移动端（无 Origin）和生产域名
    if (!origin) return "*";
    const allowed = [
      "http://localhost:3000",
      "http://localhost:4321",
      "http://localhost:5432",
      "https://gomate.jiahongw.com",
      "https://gomate-api-production.wujiahong2013.workers.dev",
    ];
    if (allowed.includes(origin)) return origin;
    // 允许局域网 IP（移动端调试）
    if (/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return origin;
    if (/^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return origin;
    return null;
  },
  credentials: true,
});
