import { logger } from "../lib/logger";
import type { MiddlewareHandler } from "hono";

/**
 * 请求日志中间件
 *
 * 记录每个 HTTP 请求的详细信息，用于监控和调试：
 * - 方法、路径、状态码
 * - 响应时间
 * - 用户 ID（如果有 session）
 */
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = performance.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Math.round(performance.now() - start);
  const status = c.res.status;
  const userId = c.get("userId") || "anonymous";

  const logLine = `${method} ${path} ${status} - ${duration}ms [${userId}]`;

  if (status >= 500) {
    logger.error(`[HTTP] ${logLine}`);
  } else if (status >= 400) {
    logger.warn(`[HTTP] ${logLine}`);
  } else {
    logger.info(`[HTTP] ${logLine}`);
  }
};
