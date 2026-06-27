/**
 * API 响应缓存工具
 *
 * 使用 Cloudflare Cache API 减少数据库查询负载
 */

const CACHE_TTL = 300; // 5 minutes
const STALE_WHILE_REVALIDATE = 600; // 10 minutes

export const PUBLIC_CACHE_CONTROL = `public, max-age=60, s-maxage=${CACHE_TTL}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`;

/**
 * 给公共 GET 响应设置浏览器/CDN 缓存头。
 *
 * 数据仍由 getCachedOrFetch 写入 Workers Cache；这个 helper 让真实 HTTP 响应
 * 也能被边缘和浏览器缓存，避免首屏数据每次都回源。
 */
export function setPublicCacheHeaders(c: { header: (name: string, value: string) => void }): void {
  c.header("Cache-Control", PUBLIC_CACHE_CONTROL);
}

/**
 * 从缓存获取数据，如果缓存不存在则执行 fetcher 函数并缓存结果
 *
 * @param key 缓存键（通常是请求的 URL + 查询参数）
 * @param fetcher 获取数据的函数
 * @returns 缓存的数据或新获取的数据
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Cloudflare Cache API 仅在 Workers 运行时可用；
  // 测试环境或非 Workers 环境无 caches.default，降级为直接执行 fetcher
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  if (!cache) {
    return fetcher();
  }

  // 尝试从缓存获取
  const cacheKey = new Request(`https://cache.internal/${key}`);
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    const data = await cachedResponse.json();
    return data as T;
  }

  // 缓存未命中，执行 fetcher 获取数据
  const data = await fetcher();

  // 创建新的响应并缓存
  const newResponse = new Response(JSON.stringify(data), {
    headers: {
      'Cache-Control': PUBLIC_CACHE_CONTROL,
      'Content-Type': 'application/json',
    },
  });

  // 异步缓存，不阻塞响应
  cache.put(cacheKey, newResponse.clone()).catch((err) => {
    console.warn('[Cache] Failed to cache response:', err);
  });

  return data;
}

/**
 * 清除指定键的缓存
 *
 * @param key 缓存键
 */
export async function invalidateCache(key: string): Promise<void> {
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  if (!cache) return;
  const cacheKey = new Request(`https://cache.internal/${key}`);
  await cache.delete(cacheKey);
}

/**
 * 根据资源名和查询参数构建规范化的列表缓存键。
 *
 * 将查询参数按 key 排序后拼接为 `资源:list:key1=val1&key2=val2`，
 * 确保不同查询参数组合产生不同缓存键，避免数据串池。
 *
 * @param resource 资源名（如 teams / locations / stories）
 * @param query 查询参数对象（Hono 的 c.req.query 只能逐个取，这里接收 Record）
 * @returns 规范化的缓存键，如 `teams:list:page=1&pagesize=12`
 */
export function buildListCacheKey(
  resource: string,
  query: Record<string, string | undefined>
): string {
  const entries = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k.toLowerCase()}=${v}`)
    .sort();
  return `${resource}:list:${entries.join("&")}`;
}

/**
 * 清除所有缓存
 */
export async function clearAllCache(): Promise<void> {
  // Cloudflare Cache API 不支持清除所有缓存
  // 需要使用特定的缓存键模式来管理
  console.warn('[Cache] clearAllCache is not fully supported by Cloudflare Cache API');
}
