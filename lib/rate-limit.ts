/**
 * 简单的内存速率限制器
 * 用于限制 API 请求频率，防止暴力破解和滥用
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

// 存储速率限制数据
const rateLimitStore = new Map<string, RateLimitEntry>();

// 清理间隔（每10分钟清理一次过期的条目）
const CLEANUP_INTERVAL = 10 * 60 * 1000;

// 上次清理时间
let lastCleanup = Date.now();

/**
 * 清理过期的速率限制条目
 */
function cleanupExpiredEntries(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  const expiryTime = now - windowMs;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.lastAttempt < expiryTime) {
      rateLimitStore.delete(key);
    }
  }
  lastCleanup = now;
}

/**
 * 检查速率限制
 * @param identifier 标识符（如 IP 地址、邮箱等）
 * @param maxAttempts 最大尝试次数
 * @param windowMs 时间窗口（毫秒）
 * @returns 是否允许请求
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 60 * 1000 // 默认1小时
): { allowed: boolean; remaining: number; resetTime: number } {
  cleanupExpiredEntries(windowMs);

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry) {
    // 首次请求
    rateLimitStore.set(identifier, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: now + windowMs,
    };
  }

  // 检查是否在时间窗口内
  if (now - entry.firstAttempt > windowMs) {
    // 重置计数
    rateLimitStore.set(identifier, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: now + windowMs,
    };
  }

  // 检查是否超过限制
  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.firstAttempt + windowMs,
    };
  }

  // 更新计数
  entry.count++;
  entry.lastAttempt = now;

  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    resetTime: entry.firstAttempt + windowMs,
  };
}

/**
 * 重置速率限制
 * @param identifier 标识符
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * 获取速率限制状态
 */
export function getRateLimitStatus(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 60 * 1000
): { limited: boolean; count: number; remaining: number; resetTime: number } {
  const entry = rateLimitStore.get(identifier);
  const now = Date.now();

  if (!entry || now - entry.firstAttempt > windowMs) {
    return {
      limited: false,
      count: 0,
      remaining: maxAttempts,
      resetTime: now + windowMs,
    };
  }

  return {
    limited: entry.count >= maxAttempts,
    count: entry.count,
    remaining: Math.max(0, maxAttempts - entry.count),
    resetTime: entry.firstAttempt + windowMs,
  };
}

/**
 * 格式化剩余时间
 */
export function formatRemainingTime(resetTime: number): string {
  const remaining = resetTime - Date.now();
  if (remaining <= 0) return "0分钟";

  const minutes = Math.ceil(remaining / 60000);
  if (minutes < 60) return `${minutes}分钟`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}小时`;
  return `${hours}小时${remainingMinutes}分钟`;
}
