/**
 * 从曾经的 routes/favorites.ts 重导出到 lib 层。
 * 原因：services/share-image/generate-share-image.ts 之前跨层 import
 *   routes/locations/utils (a routes 层文件) → service 不应该知道 routes 层。
 */
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed as T;
  } catch {
    return fallback;
  }
}
