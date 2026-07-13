import { cors } from "hono/cors";
import type { Env } from "../lib/auth";

/**
 * 解析 CORS_ALLOWED_ORIGINS 环境变量（逗号分隔字符串）
 * 开发环境自动追加 localhost 地址以支持本地调试
 */
function parseAllowedOrigins(env: Env, _origin: string): string[] {
  const configured = (env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  // 开发环境自动追加 localhost 地址
  const localhostOrigins = [
    "http://localhost:3000",
    "http://localhost:4321",
    "http://localhost:5432",
    "http://localhost:8799",
  ];

  // 合并并去重
  return [...new Set([...configured, ...localhostOrigins])];
}

/** CORS 中间件，允许前端和移动端跨域请求 */
export const corsMiddleware = cors({
  origin: (origin, c) => {
    // 允许无 Origin 的请求（如移动端、非浏览器客户端）
    if (!origin) return "*";

    const allowed = parseAllowedOrigins(c.env, origin);
    if (allowed.includes(origin)) return origin;

    // 仅开发环境允许局域网 IP（移动端调试）— 通过 APP_URL 判断，避免匹配生产域名中的子串
    const isDev = (c.env.APP_URL ?? "").includes("localhost");
    if (isDev && /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return origin;
    if (isDev && /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return origin;

    // 解析失败或无匹配时记录警告
    console.warn("[CORS] Rejected origin:", origin, "Allowed:", allowed);
    return null;
  },
  credentials: true,
});
